#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const assetsDir = path.join(__dirname, '../assets')
const outputDir = path.join(__dirname, '../src/assets')

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Get only .vrma and .vrm files
const assetFiles = fs
  .readdirSync(assetsDir)
  .filter((file) => file.endsWith('.vrma') || file.endsWith('.vrm') || file.endsWith('.jpg') || file.endsWith('.jpeg'))

// Convert each asset file
assetFiles.forEach((filename) => {
  const filePath = path.join(assetsDir, filename)
  const fileBuffer = fs.readFileSync(filePath)
  const base64 = fileBuffer.toString('base64')

  // Determine MIME type based on file extension
  const ext = path.extname(filename).toLowerCase()
  let mimeType = 'application/octet-stream' // default
  if (ext === '.jpg' || ext === '.jpeg') {
    mimeType = 'image/jpeg'
  }

  const dataUrl = `data:${mimeType};base64,${base64}`

  const nameWithoutExt = path.parse(filename).name
  const outputFilename = `${nameWithoutExt}.ts`
  const outputPath = path.join(outputDir, outputFilename)

  const tsContent = `export const url = "${dataUrl}";\n`
  fs.writeFileSync(outputPath, tsContent)
})
