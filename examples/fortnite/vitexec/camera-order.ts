import { CharacterCameraBehavior } from '/@fs/Users/bela/Documents/react-three-viverse/packages/viverse/src/camera.ts'
import { BvhCharacterPhysics } from '/@fs/Users/bela/Documents/react-three-viverse/packages/viverse/src/physics/index.ts'

type UpdateEvent = { type: 'camera' | 'physics'; time: number }

const events: Array<UpdateEvent> = []
const originalCameraUpdate = CharacterCameraBehavior.prototype.update
const originalPhysicsUpdate = BvhCharacterPhysics.prototype.update

CharacterCameraBehavior.prototype.update = function (...args) {
  events.push({ type: 'camera', time: performance.now() })
  return originalCameraUpdate.apply(this, args)
}

BvhCharacterPhysics.prototype.update = function (...args) {
  events.push({ type: 'physics', time: performance.now() })
  return originalPhysicsUpdate.apply(this, args)
}

await new Promise((resolve) => setTimeout(resolve, 8_000))

const canvas = document.querySelector('canvas')
if (canvas == null) throw new Error('Canvas not found')

events.length = 0
canvas.focus()
Object.defineProperty(document, 'pointerLockElement', { configurable: true, value: canvas })
canvas.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code: 'KeyW' }))
await new Promise((resolve) => setTimeout(resolve, 2_000))
canvas.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, code: 'KeyW' }))

let physicsBeforeCamera = 0
let cameraBeforePhysics = 0
for (let index = 0; index < events.length - 1; index += 2) {
  const order = `${events[index].type},${events[index + 1].type}`
  if (order === 'physics,camera') physicsBeforeCamera++
  if (order === 'camera,physics') cameraBeforePhysics++
}

console.log('camera-order', JSON.stringify({ physicsBeforeCamera, cameraBeforePhysics }))

if (physicsBeforeCamera < 30) throw new Error('Physics did not update before the camera')
if (cameraBeforePhysics !== 0) throw new Error('Camera still updated before physics')
