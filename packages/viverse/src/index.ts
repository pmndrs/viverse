export * from './utils.js'
export * from './action/index.js'
export * from './utils.js'
export * from './camera.js'
export * from './physics/index.js'
export * from './animation/index.js'
export * from './material.js'
export * from './simple-character/index.js'
export * from './model/index.js'

// Inject global CSS for `.mobile` visibility based on device capabilities
;(function injectMobileClassStyle() {
  if (typeof document === 'undefined') {
    return
  }
  const STYLE_ID = 'viverse-mobile-class-style'
  if (document.getElementById(STYLE_ID)) {
    return
  }
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `.mobile-only{display:none;}@media (hover: none) and (pointer: coarse){.mobile-only{display:unset;}}`
  document.head.appendChild(style)
})()
