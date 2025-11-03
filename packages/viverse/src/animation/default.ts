export async function loadDefaultCharacterAnimationUrl(
  type: 'idle' | 'jumpUp' | 'jumpDown' | 'jumpForward' | 'jumpLoop' | 'run' | 'walk',
) {
  switch (type) {
    case 'idle':
      return (await import('../assets/idle.js')).url
    case 'jumpDown':
      return (await import('../assets/jump-down.js')).url
    case 'jumpForward':
      return (await import('../assets/jump-forward.js')).url
    case 'jumpLoop':
      return (await import('../assets/jump-loop.js')).url
    case 'jumpUp':
      return (await import('../assets/jump-up.js')).url
    case 'run':
      return (await import('../assets/run.js')).url
    case 'walk':
      return (await import('../assets/walk.js')).url
  }
}
