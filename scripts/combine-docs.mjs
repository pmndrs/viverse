#!/usr/bin/env node
import { promises as fs } from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const docsDir = path.join(repoRoot, 'docs')
const outputFile = path.join(repoRoot, 'llms.txt')

/**
 * Recursively list files under a directory
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function listFilesRecursively(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    dirents.map(async (dirent) => {
      const fullPath = path.join(dir, dirent.name)
      if (dirent.isDirectory()) {
        return listFilesRecursively(fullPath)
      }
      return fullPath
    }),
  )
  return files.flat()
}

/**
 * Parse simple YAML-like frontmatter block delimited by --- on top of file
 * Supports: string values, numbers, booleans; no nested objects/arrays required for nav
 * @param {string} content
 */
function parseFrontmatter(content) {
  if (!content.startsWith('---')) return { data: {}, body: content }
  const end = content.indexOf('\n---', 3)
  if (end === -1) return { data: {}, body: content }
  const header = content.slice(3, end).trim()
  const body = content.slice(end + 4).replace(/^\s*\n/, '')
  /** @type {Record<string, any>} */
  const data = {}
  for (const line of header.split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let raw = line.slice(idx + 1).trim()
    // strip quotes if any
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      raw = raw.slice(1, -1)
    }
    // number
    if (/^-?\d+(?:\.\d+)?$/.test(raw)) {
      data[key] = Number(raw)
      continue
    }
    // boolean
    if (raw === 'true' || raw === 'false') {
      data[key] = raw === 'true'
      continue
    }
    data[key] = raw
  }
  return { data, body }
}

/**
 * Create a stable in-document anchor id for a docs file path
 * @param {string} relPath path relative to docsDir
 */
function anchorIdFromRelPath(relPath) {
  const posix = relPath.split(path.sep).join('/')
  const noExt = posix.replace(/\.(md|mdx)$/i, '')
  return (
    'doc-' +
    noExt
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
  )
}

/**
 * Extract raw value for a JSX-like prop: propName={...}
 * Returns inner text between the braces without surrounding whitespace
 * @param {string} attrs
 * @param {string[]} propNames
 */
function extractJsxProp(attrs, propNames) {
  for (const name of propNames) {
    const re = new RegExp(name + '=\\{([\\s\\S]*?)\\}', 'i')
    const m = attrs.match(re)
    if (m) return m[1].trim()
  }
  return ''
}

/**
 * Extract a balanced {...} segment starting at the given '{' index.
 * Handles nested braces and strings/backticks.
 * Returns the substring including the outer braces.
 * @param {string} input
 * @param {number} openIndex index of '{'
 */
function extractBalancedBraces(input, openIndex) {
  let i = openIndex
  let depth = 0
  let inBacktick = false
  let inSingle = false
  let inDouble = false
  let prev = ''
  while (i < input.length) {
    const ch = input[i]
    if (ch === '`' && !inSingle && !inDouble) {
      inBacktick = !inBacktick
    } else if (!inBacktick) {
      if (ch === "'" && prev !== '\\' && !inDouble) inSingle = !inSingle
      if (ch === '"' && prev !== '\\' && !inSingle) inDouble = !inDouble
      if (!inSingle && !inDouble) {
        if (ch === '{') depth++
        if (ch === '}') {
          depth--
          if (depth === 0) return input.slice(openIndex, i + 1)
        }
      }
    }
    prev = ch
    i++
  }
  return ''
}

/**
 * Find a prop value for either patterns: name={...} or name: {...}
 * Returns the balanced content including braces, or '' if not found.
 * @param {string} attrs
 * @param {string} key
 */
function extractPropBalanced(attrs, key) {
  const lower = attrs
  // equals pattern
  let m = new RegExp(key + '\\s*=\\s*\\{', 'i').exec(lower)
  if (m) {
    const braceIndex = m.index + m[0].length - 1
    const content = extractBalancedBraces(attrs, braceIndex)
    if (content) return content.trim()
  }
  // colon pattern (for nested object entries, e.g., dependencies: {...})
  m = new RegExp(key + '\\s*:\\s*\\{', 'i').exec(lower)
  if (m) {
    const braceIndex = m.index + m[0].length - 1
    const content = extractBalancedBraces(attrs, braceIndex)
    if (content) return content.trim()
  }
  return ''
}

/**
 * If content starts with '{{', unwrap one level to '{...}'
 * @param {string} content
 */
function unwrapDoubleBraces(content) {
  const trimmed = content.trim()
  if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
    return trimmed.slice(1, -1)
  }
  return content
}

/**
 * Remove surrounding quotes/backticks from a string if present.
 * @param {string} s
 */
function stripEnclosingQuotes(s) {
  const t = s.trim()
  if (
    (t.startsWith('`') && t.endsWith('`')) ||
    (t.startsWith("'") && t.endsWith("'")) ||
    (t.startsWith('"') && t.endsWith('"'))
  ) {
    return t.slice(1, -1)
  }
  return s
}

/**
 * Parse a minimal files map like { '/App.tsx': `...`,
 *   '/index.ts': '...', ... } into entries.
 * Handles backtick and quoted string values; ignores nested objects.
 * @param {string} rawContent including outer { ... }
 * @returns {{path:string, code:string}[]}
 */
function parseFilesMap(rawContent) {
  let content = unwrapDoubleBraces(rawContent)
  // strip single outer braces
  content = content.trim()
  if (content.startsWith('{') && content.endsWith('}')) {
    content = content.slice(1, -1)
  }
  const entries = []
  let i = 0
  while (i < content.length) {
    // skip whitespace and commas
    while (i < content.length && /[\s,]/.test(content[i])) i++
    if (i >= content.length) break
    const quote = content[i]
    if (quote !== '"' && quote !== "'") {
      // unsupported key format; bail remaining as one JSON block
      return entries
    }
    // read key
    let j = i + 1
    let key = ''
    while (j < content.length) {
      const ch = content[j]
      if (ch === quote && content[j - 1] !== '\\') break
      key += ch
      j++
    }
    if (content[j] !== quote) break
    j++
    // skip spaces
    while (j < content.length && /\s/.test(content[j])) j++
    if (content[j] !== ':') break
    j++
    while (j < content.length && /\s/.test(content[j])) j++
    // read value (string/backtick)
    let val = ''
    if (content[j] === '`') {
      let k = j + 1
      while (k < content.length) {
        const ch = content[k]
        if (ch === '`' && content[k - 1] !== '\\') break
        val += ch
        k++
      }
      // move past closing backtick
      j = k + 1
    } else if (content[j] === '"' || content[j] === "'") {
      const q = content[j]
      let k = j + 1
      while (k < content.length) {
        const ch = content[k]
        if (ch === q && content[k - 1] !== '\\') break
        val += ch
        k++
      }
      j = k + 1
      // unescape common sequences
      val = val.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
    } else {
      // not a string; skip until next comma or end
      while (j < content.length && content[j] !== ',') j++
      i = j + 1
      continue
    }
    entries.push({ path: key, code: val })
    // advance to next pair
    while (j < content.length && content[j] !== ',') j++
    i = j + 1
  }
  return entries
}

/**
 * Robustly replace <Sandpack>/<Sandbox> with inline deps/files/code.
 * Uses a simple state machine to find the end of the tag, ignoring '>' inside backticks.
 * For block tags, inner content is ignored (we rely on props like files/code).
 * @param {string} md
 */
function replaceSandLike(md) {
  if (!md) return md
  const names = ['Sandpack', 'Sandbox']
  let i = 0
  let out = ''
  while (i < md.length) {
    let foundStart = -1
    let foundName = ''
    for (const n of names) {
      const idx = md.indexOf('<' + n, i)
      if (idx !== -1 && (foundStart === -1 || idx < foundStart)) {
        foundStart = idx
        foundName = n
      }
    }
    if (foundStart === -1) {
      out += md.slice(i)
      break
    }
    // append content before tag
    out += md.slice(i, foundStart)

    // scan forward to find closing token (/> or </Name>) not inside backticks or quotes
    let j = foundStart + 1
    let inBacktick = false
    let inSingle = false
    let inDouble = false
    let prev = ''
    let endIdx = -1
    let isBlock = false
    const closeTag = '</' + foundName + '>'
    while (j < md.length) {
      const ch = md[j]
      if (ch === '`' && !inSingle && !inDouble) {
        inBacktick = !inBacktick
      } else if (!inBacktick) {
        if (ch === "'" && prev !== '\\' && !inDouble) inSingle = !inSingle
        if (ch === '"' && prev !== '\\' && !inSingle) inDouble = !inDouble
        if (!inSingle && !inDouble) {
          if (md.startsWith('/>', j)) {
            endIdx = j + 2
            isBlock = false
            break
          }
          if (md.startsWith(closeTag, j)) {
            endIdx = j + closeTag.length
            isBlock = true
            break
          }
        }
      }
      prev = ch
      j++
    }
    if (endIdx === -1) {
      // failed to find end, bail out by appending rest and stop
      out += md.slice(foundStart)
      break
    }
    const tagText = md.slice(foundStart, endIdx)
    // Try to extract props area between the name and either '/>' or '>' of the opening tag
    // We approximate by taking everything between first space after name and endIdx
    const nameEnd = foundStart + 1 + foundName.length
    const attrs = md.slice(nameEnd, endIdx)
    const depsRaw =
      extractPropBalanced(attrs, 'dependencies') ||
      extractPropBalanced(attrs, 'packages') ||
      extractPropBalanced(attrs, 'deps')
    const filesRaw = extractPropBalanced(attrs, 'files')
    const codeRaw = extractPropBalanced(attrs, 'code')
    const parts = []
    parts.push('<!-- Sandpack/Sandbox replaced: inline code and dependencies -->')
    if (depsRaw) {
      parts.push('Dependencies:')
      parts.push('')
      parts.push('```js')
      parts.push(stripEnclosingQuotes(depsRaw))
      parts.push('```')
      parts.push('')
    }
    if (filesRaw) {
      const filesEntries = parseFilesMap(filesRaw)
      if (filesEntries.length) {
        parts.push('Files:')
        parts.push('')
        for (const { path: fpath, code } of filesEntries) {
          parts.push(`File: ${fpath}`)
          const ext = fpath.split('.').pop() || ''
          const lang =
            ext === 'tsx'
              ? 'tsx'
              : ext === 'ts'
                ? 'ts'
                : ext === 'js'
                  ? 'js'
                  : ext === 'json'
                    ? 'json'
                    : ext === 'css'
                      ? 'css'
                      : ''
          parts.push('')
          parts.push('```' + lang)
          parts.push(code.replace(/^\n+/, ''))
          parts.push('```')
          parts.push('')
        }
      } else {
        // fallback: show raw
        parts.push('Files (raw):')
        parts.push('')
        parts.push('```js')
        parts.push(filesRaw)
        parts.push('```')
        parts.push('')
      }
    }
    if (codeRaw) {
      parts.push('Code:')
      parts.push('')
      parts.push('```')
      parts.push(stripEnclosingQuotes(codeRaw))
      parts.push('```')
      parts.push('')
    }
    out += parts.join('\n')
    i = endIdx
  }
  return out
}

/**
 * Rewrite internal links that point to other .md/.mdx files to in-document anchors
 * @param {string} md markdown content
 * @param {string} fromFile absolute path of current file
 */
function rewriteInternalLinks(md, fromFile) {
  if (!md) return md
  return md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (full, text, url) => {
    const trimmed = url.trim()
    if (/^(https?:|mailto:|tel:|#)/i.test(trimmed)) return full
    // Extract path and drop any fragment for simplicity
    const hashIdx = trimmed.indexOf('#')
    const filePart = hashIdx === -1 ? trimmed : trimmed.slice(0, hashIdx)
    if (!/\.(md|mdx)$/i.test(filePart)) return full
    const abs = path.resolve(path.dirname(fromFile), filePart)
    let rel = path.relative(docsDir, abs)
    // If link goes outside docsDir, leave it as-is
    if (rel.startsWith('..')) return full
    const anchor = anchorIdFromRelPath(rel)
    return `[${text}](#${anchor})`
  })
}

function compareByNavThenTitle(a, b) {
  const aNav = a.frontmatter.nav ?? Number.POSITIVE_INFINITY
  const bNav = b.frontmatter.nav ?? Number.POSITIVE_INFINITY
  if (aNav !== bNav) return aNav - bNav
  const aTitle = (a.frontmatter.title || a.basename).toString().toLowerCase()
  const bTitle = (b.frontmatter.title || b.basename).toString().toLowerCase()
  return aTitle.localeCompare(bTitle)
}

async function main() {
  // discover mdx files
  const all = await listFilesRecursively(docsDir)
  const mdxFiles = all.filter((p) => p.endsWith('.mdx') || p.endsWith('.md'))

  const entries = []
  for (const file of mdxFiles) {
    const content = await fs.readFile(file, 'utf8')
    const { data, body } = parseFrontmatter(content)
    const basename = path.basename(file)
    // Transform body: replace Sandpack/Sandbox blocks and rewrite internal links
    const sandboxReplaced = replaceSandLike(body)
    const rewritten = rewriteInternalLinks(sandboxReplaced, file)
    entries.push({ file, basename, frontmatter: data, body: rewritten })
  }

  entries.sort(compareByNavThenTitle)

  const parts = []
  parts.push('')
  for (const entry of entries) {
    const title = entry.frontmatter.title || entry.basename
    const rel = path.relative(docsDir, entry.file)
    const anchorId = anchorIdFromRelPath(rel)
    parts.push(`<!-- From: ${rel} -->`)
    parts.push(`<a id="${anchorId}"></a>`)
    parts.push(`# ${title}`)
    parts.push('')
    parts.push(entry.body.trim())
    parts.push('')
  }

  const combined = parts.join('\n') + '\n'
  await fs.writeFile(outputFile, combined, 'utf8')
  console.log(`Wrote combined docs to ${path.relative(repoRoot, outputFile)} (${entries.length} files)`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
