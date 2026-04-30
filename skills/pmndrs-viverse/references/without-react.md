
<!-- From: without-react/introduction.mdx -->
<a id="doc-without-react-introduction"></a>
# Without React

`@pmndrs/viverse` offers everything from `@react-three/viverse` (excluding the hooks) in case you don't want to use react.

The following tutorial shows how to build a simple game and display a player tag from the [Simple Game](https://pmndrs.github.io/viverse/tutorials/simple-game) and [Access Avatar and Profile](https://pmndrs.github.io/viverse/tutorials/access-avatar-and-profile) tutorials using only Three.js.

## Setting up the project

First, create a new project and install the required dependencies:

```bash
npm init -y
npm install three @pmndrs/viverse @pmndrs/uikit@1.0.41 @viverse/sdk
npm install -D vite
```

Create an `index.html` file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VIVERSE Vanilla Game</title>
    <script async type="module" src="./index.ts"></script>
</head>
<body style="touch-action: none; margin: 0; position: relative; width: 100dvw; height: 100dvh; overflow: hidden;">
    <canvas id="root" style="position: absolute; inset: 0;"></canvas>
</body>
</html>
```

## Step 1: Basic Three.js Setup

Start with the standard Three.js boilerplate in `index.ts`:

```typescript
import {
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  Clock,
} from 'three'

// Create camera, scene, and renderer
const camera = new PerspectiveCamera(90)
camera.position.z = 1
camera.position.y = 1

const scene = new Scene()

const canvas = document.getElementById('root') as HTMLCanvasElement
const renderer = new WebGLRenderer({ 
  antialias: true, 
  canvas, 
  powerPreference: 'high-performance', 
  alpha: true 
})

const clock = new Clock()
clock.start()

// Basic render loop
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta()
  renderer.render(scene, camera)
})

// Handle window resizing
function updateSize() {
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
}

updateSize()
window.addEventListener('resize', updateSize)
```

## Step 2: Adding the Sky

Add a realistic sky background using the Three.js Sky class:

```typescript
import { MathUtils, Vector3 } from 'three'
import { Sky } from 'three/examples/jsm/Addons.js'

// Add after scene creation
const sky = new Sky()
sky.scale.setScalar(450000)
const phi = MathUtils.degToRad(40)
const theta = MathUtils.degToRad(30)
const sunPosition = new Vector3().setFromSphericalCoords(1, phi, theta)

sky.material.uniforms.sunPosition.value = sunPosition
scene.add(sky)
```

## Step 3: Loading the Map

Load a 3D environment using GLTFLoader:

```typescript
import { GLTFLoader } from 'three/examples/jsm/Addons.js'

// Add after sky setup
const gltfLoader = new GLTFLoader()
const ground = await gltfLoader.loadAsync('./map.glb')
ground.scene.traverse((object) => {
  object.castShadow = true
  object.receiveShadow = true
})
scene.add(ground.scene)
```

Make sure to place your `map.glb` file in the `public` folder.

## Step 4: Adding Lighting

Create proper lighting with shadows:

```typescript
import { AmbientLight, DirectionalLight } from 'three'

// Add after sky setup
const dirLight = new DirectionalLight('white', 1.0)
dirLight.shadow.bias = -0.001
dirLight.shadow.mapSize.set(1024, 1024)
dirLight.shadow.camera.left = -100
dirLight.shadow.camera.right = 100
dirLight.shadow.camera.top = 100
dirLight.shadow.camera.bottom = -50
dirLight.castShadow = true
dirLight.position.set(10, 10, 10)
scene.add(dirLight)
scene.add(new AmbientLight('white', 0.3))

// Enable shadows in renderer
renderer.shadowMap.enabled = true
```

## Step 5: Adding Physics and the Character

Integrate physics and a controllable character:

```typescript
import { BvhPhysicsWorld, SimpleCharacter } from '@pmndrs/viverse'

// Add after loading the map
const world = new BvhPhysicsWorld()
world.addBody(ground.scene, false)
const character = new SimpleCharacter(camera, world, canvas, { 
  model: { url: undefined } // We'll add avatar URL later
})
scene.add(character)

// Update character in render loop
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta()
  character.update(delta)
  renderer.render(scene, camera)
  
  // Respawn player when they fall down
  if (character.position.y < -10) {
    character.position.set(0, 0, 0)
  }
})
```

## Step 6: VIVERSE Client Integration

Connect to VIVERSE services to access user profiles and avatars:

> [!NOTE]
> The following assumes your are building your app with vite. If you are using a different build tool, you need to manually insure that the VIVERSE app ID is provided only in production builds.


```typescript
import { Client } from '@viverse/sdk'
import AvatarClient from '@viverse/sdk/avatar-client'

// Add before character setup
const client = import.meta.env.VITE_VIVERSE_APP_ID == null
  ? undefined
  : new Client({ 
      clientId: import.meta.env.VITE_VIVERSE_APP_ID, 
      domain: 'https://account.htcvive.com/' 
    })

const auth = await client?.checkAuth()
const avatarClient = auth == null 
  ? undefined 
  : new AvatarClient({ 
      token: auth?.access_token, 
      baseURL: 'https://sdk-api.viverse.com/' 
    })

const profile = (await avatarClient?.getProfile()) ?? {
  name: 'Anonymous',
  activeAvatar: { headIconUrl: 'https://picsum.photos/200', vrmUrl: undefined },
}

// Update character creation to use profile avatar
const character = new SimpleCharacter(camera, world, canvas, { 
  model: { url: profile.activeAvatar?.vrmUrl, type: "vrm" } 
})
```

Create a `.env.production` file for your VIVERSE app ID:

```
VITE_VIVERSE_APP_ID=your_viverse_app_id_here
```

## Step 7: Player Tag UI

Finally, add a floating player tag above the character:

```typescript
import { Group } from 'three'
import { Container, withOpacity, Image, Text, reversePainterSortStable } from '@pmndrs/uikit'

// Configure renderer for UI rendering
renderer.setTransparentSort(reversePainterSortStable)
renderer.localClippingEnabled = true

// Create player tag
const playerTag = new Group()
character.add(playerTag)
playerTag.position.y = 2.15

const container = new Container({
  depthTest: false,
  renderOrder: 1,
  '*': {
    depthTest: false,
    renderOrder: 1,
  },
  borderRadius: 10,
  paddingX: 2,
  height: 20,
  backgroundColor: withOpacity('white', 0.5),
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
})
playerTag.add(container)

const playerImage = new Image({ 
  width: 16, 
  height: 16, 
  borderRadius: 8, 
  src: profile.activeAvatar?.headIconUrl 
})
container.add(playerImage)

const playerText = new Text({ 
  fontWeight: 'bold', 
  fontSize: 12, 
  marginRight: 3, 
  text: profile.name 
})
container.add(playerText)

// Update render loop to include UI updates
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta()
  character.update(delta)
  renderer.render(scene, camera)
  
  // Update the UI
  container.update(delta)
  // Rotate the player tag to face the camera
  playerTag.quaternion.copy(camera.quaternion)
  
  // Respawn player when they fall down
  if (character.position.y < -10) {
    character.position.set(0, 0, 0)
  }
})
```

## Running the Project

Add a dev script to your `package.json`:

```json
{
  "scripts": {
    "dev": "vite --host"
  }
}
```

Run your project:

```bash
npm run dev
```

Your vanilla Three.js game with VIVERSE integration is now complete! You should see a 3D environment with a controllable character that displays a floating player tag with the user's avatar and name.

<!-- From: without-react/actions.mdx -->
<a id="doc-without-react-actions"></a>
# Actions and Action Bindings

This guide covers the vanilla API for actions. For conceptual background on actions, action types, and built-in actions, see the [React Actions tutorial](/tutorials/actions).

## Lifecycle with AbortController

Unlike React hooks that auto-cleanup on unmount, vanilla bindings use `AbortController`:

```typescript
const abortController = new AbortController()

const keyboard = new KeyboardLocomotionActionBindings(canvas, abortController.signal)

// Clean up when done
abortController.abort()
```

All built-in bindings take `(domElement, abortSignal)` and clean up automatically when aborted.

## Built-in Bindings

| React Hook | Vanilla Class |
|------------|---------------|
| `useKeyboardLocomotionActionBindings` | `KeyboardLocomotionActionBindings` |
| `usePointerLockRotateZoomActionBindings` | `PointerLockRotateZoomActionBindings` |
| `usePointerCaptureRotateZoomActionBindings` | `PointerCaptureRotateZoomActionBindings` |
| `useKeyboardActionBinding` | `KeyboardActionBinding` |
| `usePointerButtonActionBinding` | `PointerButtonActionBinding` |
| `useScreenJoystickLocomotionActionBindings` | `ScreenJoystickLocomotionActionBindings` |
| `useScreenButton` | `ScreenButtonJumpActionBindings` |

### Keyboard

```typescript
import { KeyboardLocomotionActionBindings } from '@pmndrs/viverse'

const keyboard = new KeyboardLocomotionActionBindings(canvas, abortController.signal)

// Optional: require pointer lock for movement
keyboard.moveForwardBinding.requiresPointerLock = true

// Optional: customize keys (defaults: WASD, Shift, Space)
keyboard.moveForwardBinding.keys = ['KeyW', 'ArrowUp']
```

### Mouse (Pointer Lock)

```typescript
import { PointerLockRotateZoomActionBindings } from '@pmndrs/viverse'

const mouse = new PointerLockRotateZoomActionBindings(canvas, abortController.signal)
mouse.lockOnClick = true
```

### Touch (Pointer Capture)

```typescript
import { PointerCaptureRotateZoomActionBindings } from '@pmndrs/viverse'

const touch = new PointerCaptureRotateZoomActionBindings(canvas, abortController.signal)
```

### Mobile UI

```typescript
import { 
  ScreenJoystickLocomotionActionBindings,
  ScreenButtonJumpActionBindings,
} from '@pmndrs/viverse'

const joystick = new ScreenJoystickLocomotionActionBindings(canvas, abortController.signal)
const jumpBtn = new ScreenButtonJumpActionBindings(canvas, abortController.signal)
```

Controls are auto-hidden on desktop via the `.mobile-only` CSS class.

### Custom Key → Action Mapping

```typescript
import { KeyboardActionBinding, RotateYawAction } from '@pmndrs/viverse'

const mapped = RotateYawAction.mapFrom((e: KeyboardEvent) => {
  if (e.code === 'KeyQ') return -0.02
  if (e.code === 'KeyE') return 0.02
  return 0
})

const binding = new KeyboardActionBinding(mapped, canvas, abortController.signal)
binding.keys = ['KeyQ', 'KeyE']
```

## Creating Custom Actions

```typescript
import { StateAction, EventAction } from '@pmndrs/viverse'

// StateAction(mergeFn, neutralValue)
const CrouchAction = new StateAction<boolean>((a, b) => a || b, false)

// EventAction(combineFn?, neutralValue?)
const FireAction = new EventAction<void>()
```

## Writing to StateAction

Create a writer, then call `.write()` on state changes. Multiple writers merge automatically.

```typescript
const crouchWriter = CrouchAction.createWriter(abortController.signal)

canvas.addEventListener('keydown', (e) => {
  if (e.code === 'KeyC') crouchWriter.write(true)
}, { signal: abortController.signal })

canvas.addEventListener('keyup', (e) => {
  if (e.code === 'KeyC') crouchWriter.write(false)
}, { signal: abortController.signal })

// Read merged state
const isCrouching = CrouchAction.get()
```

## Emitting EventAction

Call `.emit()` when the event occurs. For continuous polling (e.g., gamepad), track previous state to emit only on press:

```typescript
let wasPressed = false

function pollGamepad() {
  const pressed = navigator.getGamepads()[0]?.buttons[0].pressed ?? false
  if (pressed && !wasPressed) FireAction.emit()
  wasPressed = pressed
  requestAnimationFrame(pollGamepad)
}

// Subscribe to events
FireAction.subscribe(() => console.log('Fire!'), { signal: abortController.signal })
```

