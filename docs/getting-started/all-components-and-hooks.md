---
title: All Components and Hooks
description: Complete reference for all available components and hooks in @react-three/viverse.
nav: 1
---

## Components

### `<Viverse>`

The main provider component that sets up VIVERSE authentication and physics context. Must wrap your entire application or the parts that use VIVERSE features.

**Props:**

- `children?: ReactNode` - Child components
- `loginRequired?: boolean` - Forces user to login before playing (default: `false`)
- `clientId?: string` - VIVERSE app client ID. Typically you pass this from your app’s environment (e.g. a `VITE_VIVERSE_APP_ID` env var you manage) into this prop.
- `domain?: string` - Authentication domain (default: `'account.htcvive.com'`)
- `authorizationParams?: object` - Additional authorization parameters
- `cookieDomain?: string` - Cookie domain for authentication
- `httpTimeoutInMS?: number` - HTTP request timeout in milliseconds

> [!WARNING]
> Don't set the `clientId` during local development!

**Example:**

```tsx
<Viverse loginRequired={true} clientId="your-app-id">
  <YourGame />
</Viverse>
```

### `<SimpleCharacter>`

Creates a simple character controller with physics based on three-mesh-bvh, walking, running, jumping animations, and camera controls. Automatically uses the active VIVERSE avatar if authenticated.

**Props:** See [SimpleCharacter Options](#simplecharacter-options) section below for complete details.

**Example:**

```tsx
<SimpleCharacter walk={{ speed: 3 }} run={{ speed: 6 }} jump={{ speed: 10 }}>
  {/* Optional child components */}
</SimpleCharacter>
```

### `<BvhPhysicsWorld>`

Provides physics context for collision detection. Usually wrapped automatically by `<Viverse>`, but can be used standalone.

**Props:**

- `children?: ReactNode` - Child components

### `<BvhPhysicsBody>`

Adds visible children as static (non-moving) or kinematic (moving) objects as obstacles to the physics world.

> [!WARNING]
> Content inside the object can not structurally change.

**Props:**

- `children?: ReactNode` - Static mesh objects for collision
- `kinematic?: boolean` - whether the objects world transformation can change - default: false

**Example:**

```tsx
<BvhPhysicsBody>
  <mesh>
    <boxGeometry />
    <meshStandardMaterial />
  </mesh>
</BvhPhysicsBody>
```

### `<BvhPhysicsSensor>`

Adds visible children as sensors that detect player intersection and trigger callbacks (does not add obstacles).

> [!WARNING]
> Content inside the object can not structurally change; Hiding the sensors content requires to wrap it in `<group visible={false}>...</group>`.

**Props:**

- `children?: ReactNode` - Static mesh objects for collision
- `isStatic?: boolean` - whether the objects world transformation is static - default: true
- `onIntersectedChanged?: (intersected: boolean) => void` - callback that get's called when the player starts or stops intersecting with the sensor

**Example:**

```tsx
<BvhPhysicsSensor onIntersectedChanged={(intersected) => console.log('currently intersected', intersected)}>
  <mesh visible={false}>
    <boxGeometry />
  </mesh>
</BvhPhysicsSensor>
```

### `<PrototypeBox>`

A quick prototyping component that renders a textured box with the prototype material.

**Props:**

- `color?: ColorRepresentation` - Box color tint
- All standard Three.js Group props (position, rotation, scale, etc.)

**Example:**

```tsx
<PrototypeBox position={[0, 1, 0]} scale={[2, 1, 3]} color="red" />
```

### `<CharacterModelProvider>`

Provides the active character model context so that animation and bone utilities can target the same model instance. Wrap any content that uses `<CharacterAnimationAction>`, `<AdditiveCharacterAnimationAction>`, `<CharacterAnimationLayer>`, or `<CharacterModelBone>`.

**Props:**

- `model: CharacterModel` - Model returned by `useCharacterModelLoader`
- `children?: ReactNode` - Child components

**Example:**

```tsx
const model = useCharacterModelLoader({ url: 'avatar.vrm', castShadow: true })

return (
  <CharacterModelProvider model={model}>
    <RunTimeline>
      <CharacterAnimationAction url="idle.glb" />
    </RunTimeline>
    <primitive object={model.scene} />
  </CharacterModelProvider>
)
```

### `<CharacterAnimationLayer>`

Defines a logical animation layer (e.g., "lower-body", "upper-body"). All nested animation actions inherit this layer unless they provide their own `layer` prop. Layers allow to manage animations when managing e.g. additive animations or animations with masks.

**Props:**

- `name: string` - Layer name
- `children?: ReactNode` - Nested timeline/animation content

**Example:**

```tsx
<RunTimeline>
  <CharacterAnimationLayer name="lower-body">
    <CharacterAnimationAction url="walk.glb" mask={lowerBodyMask} />
  </CharacterAnimationLayer>
  <CharacterAnimationLayer name="upper-body">
    <AdditiveCharacterAnimationAction
      referenceClip={{ url: 'aim-forward.glb' }}
      url="pistol-idle.glb"
      mask={upperBodyMask}
    />
  </CharacterAnimationLayer>
  <primitive object={model.scene} />
  {/* ...lights, environment... */}
  {/* masks can be created with @pmndrs/viverse animation masks */}
</RunTimeline>
```

### `<CharacterAnimationAction>`

Loads and plays a clip on the active character model, integrating with `@react-three/timeline` for lifecycle and transitions. Supports masking, cross-fading, syncing, and layering. The `ref` exposes the underlying Three.js `AnimationAction`.

**Props:**

- Clip options (from `@pmndrs/viverse`):
  - `url: string | DefaultUrl` - Source of the animation
  - `type?: 'mixamo' | 'gltf' | 'vrma' | 'fbx' | 'bvh'`
  - `removeXZMovement?: boolean`
  - `trimTime?: { start?: number; end?: number }`
  - `boneMap?: Record<string, VRMHumanBoneName>`
  - `scaleTime?: number`
  - `mask?: CharacterAnimationMask` - Limit animation to specific bones/regions
- Playback and blending:
  - `fadeDuration?: number` - Cross-fade/fade time (default: `0.1`)
  - `crossFade?: boolean` - Whether to cross-fade from current layer action (default: `true`)
  - `sync?: boolean` - Sync time with current action on same layer (if any)
  - `paused?: boolean`
  - `loop?: AnimationActionLoopStyles` - Defaults to `LoopRepeat`
  - `layer?: string` - Overrides the current `<CharacterAnimationLayer>`
- Timeline control (from `@react-three/timeline`):
  - `init?(): void | (() => void)` - Called when the action starts; return a cleanup
  - `update?(state, delta): void` - Per-frame update
  - `until?(): Promise<unknown>` - Resolve to stop; defaults to when the clip finishes
  - `dependencies?: unknown[]` - Re-run when any dependency changes
- Advanced:
  - `additiveReferenceClip?: AnimationClip` - Use an additive version of the clip relative to this reference clip (prefer `<AdditiveCharacterAnimationAction>` for convenience)

**Example:**

```tsx
<CharacterAnimationAction url="idle.glb" />
```

### `<AdditiveCharacterAnimationAction>`

Convenience wrapper around `<CharacterAnimationAction>` that plays an additive version of the clip, using a provided reference pose/clip (e.g., aim offsets layered over locomotion).

**Props:**

- All `<CharacterAnimationAction>` props, except it uses:
  - `referenceClip: CharacterAnimationOptions` - Clip used as the additive reference pose

**Example:**

```tsx
<AdditiveCharacterAnimationAction
  referenceClip={{ url: 'aim-forward.glb' }}
  url="pistol-reload.glb"
  mask={upperBodyMask}
/>
```

### `<CharacterModelBone>`

Component for placing content inside the character model at specific bones.

**Props:**

- `bone: VRMHumanBoneName` - The bone name to access

```tsx
<SimpleCharacter>
  <CharacterModelBone bone="rightHand">
    <SwordModel />
  </CharacterModelBone>
</SimpleCharacter>
```

## Hooks

| Hook                                             | Description                                                   | Returns                                                          |
| ------------------------------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `useViverseClient()`                             | Returns the VIVERSE client instance for making API calls      | `Client`                                                         |
| `useViverseAuth()`                               | Returns the current authentication state                      | Auth object with access tokens, or `undefined`                   |
| `useViverseAvatarClient()`                       | Returns the avatar client for avatar-related operations       | `AvatarClient \| undefined`                                      |
| `useViverseLogin()`                              | Returns a function to initiate the VIVERSE login flow         | Login function                                                   |
| `useViverseLogout()`                             | Returns a function to initiate the VIVERSE logout flow        | Logout function                                                  |
| `useViverseProfile()`                            | Fetches the user's profile (name, avatar info) using Suspense | Profile object with `name`, `activeAvatar`, etc., or `undefined` |
| `useViverseActiveAvatar()`                       | Fetches the user's currently selected avatar using Suspense   | Avatar object with `vrmUrl`, `headIconUrl`, etc., or `undefined` |
| `useViverseAvatarList()`                         | Fetches the user's personal avatar collection using Suspense  | Array of avatar objects, or `undefined`                          |
| `useViversePublicAvatarList()`                   | Fetches publicly available avatars using Suspense             | Array of public avatar objects, or `undefined`                   |
| `useViversePublicAvatarByID(id)`                 | Fetches a specific public avatar by ID using Suspense         | Avatar object, or `undefined`                                    |
| `useIsMobile()`                                  | Returns `true` on touch-centric/mobile devices (media query)  | `boolean`                                                        |
| `useCharacterModel()`                            | Gets the current character model from context                 | `CharacterModel`                                                 |
| `useCharacterModelLoader(options?)`              | Loads a character model with Suspense                         | `CharacterModel`                                                 |
| `useCharacterAnimationLoader(model, options)`    | Loads an animation clip for a model with Suspense             | `AnimationClip`                                                  |
| `useBvhPhysicsWorld()`                           | Accesses the BVH physics world context                        | `BvhPhysicsWorld`                                                |
| `useBvhCharacterPhysics(modelRef, options?)`     | Character controller physics tied to a model ref              | `BvhCharacterPhysics`                                            |
| `useCharacterCameraBehavior(modelRef, options?)` | Camera behavior that follows/rotates around model             | `RefObject<CharacterCameraBehavior>`                             |
| `useSimpleCharacterActionBindings(...)?`         | Deprecated: sets up default action bindings                   | `void`                                                           |
| `useScreenButton(image)`                          | Create and mount a styled on-screen button element            | `HTMLElement`                                                    |

> [!NOTE]
> `useViverseClient()` returns `undefined` if not within a `<Viverse>` provider or if no `clientId` is provided. Also all avatar-related hooks return `undefined` when the user is not authenticated.

### useIsMobile

Lightweight media-query based mobile detection. It subscribes to `@media (hover: none) and (pointer: coarse)`.

```tsx
import { useIsMobile } from '@react-three/viverse'

function MobileOnlyUI() {
  const isMobile = useIsMobile()
  return isMobile ? <div>Shown on mobile</div> : null
}
```

### Action Binding Hooks

Actions allow to decouple specific user inputs from game/business logic.
One action can be connected to multiple inputs via Action bindings (keyboard, mouse/touch, on-screen controls). For background on actions vs. action bindings and how to create custom ones, see the Actions tutorial: [Create and use actions](../tutorials/actions.mdx). We provide several easy to use hooks to setup default action bindings for general use cases such as pressing a button or specific use case such as locomotion using a keyboard.

#### `useKeyboardActionBinding(action, options)`

- **Description:** Binds a `KeyboardEvent` or boolean state action to one or more keys.
- **Options:** `{ keys: string[]; requiresPointerLock?: boolean }`
- **Returns:** `void`

```tsx
useKeyboardActionBinding(jumpAction, { keys: ['Space'] })
```

#### `usePointerButtonActionBinding(action, options)`

- **Description:** Binds a pointer button (mouse/touch) event or state action.
- **Options:** `{ domElement?: HTMLElement | RefObject<HTMLElement>; buttons?: number[]; requiresPointerLock?: boolean }`
- **Returns:** `void`

```tsx
usePointerButtonActionBinding(fireAction, { buttons: [0] }) // left mouse / primary touch
```

#### `usePointerCaptureRotateZoomActionBindings(options)`

- **Description:** Enables rotate/zoom camera controls using Pointer Capture on the canvas.
- **Options:** `{ rotationSpeed?: number; zoomSpeed?: number }`
- **Returns:** `void`

```tsx
usePointerCaptureRotateZoomActionBindings({ rotationSpeed: 1000, zoomSpeed: 1000 })
```

#### `usePointerLockRotateZoomActionBindings(options)`

- **Description:** Enables rotate/zoom camera controls using Pointer Lock on the canvas.
- **Options:** `{ rotationSpeed?: number; zoomSpeed?: number; lockOnClick?: boolean }`
- **Returns:** `void`

```tsx
usePointerLockRotateZoomActionBindings({ lockOnClick: true })
```

#### `useKeyboardLocomotionActionBindings(options)`

- **Description:** WASD movement, Shift to run, Space to jump.
- **Options:** `{ moveForwardKeys?, moveBackwardKeys?, moveLeftKeys?, moveRightKeys?, runKeys?, jumpKeys?, requiresPointerLock? }` (arrays of key strings)
- **Returns:** `void`

```tsx
useKeyboardLocomotionActionBindings({ requiresPointerLock: false })
```

#### `useScreenJoystickLocomotionActionBindings(options)`

- **Description:** On-screen joystick for movement and run on mobile devices.
- **Options:** `{ runDistancePx?: number; deadZonePx?: number }`
- **Returns:** `void`

```tsx
useScreenJoystickLocomotionActionBindings({ deadZonePx: 8, runDistancePx: 40 })
```

## SimpleCharacter Options

The `SimpleCharacter` component can be configured with a variety of props but also supports all the default group props, such as position, rotation, and scale.

### `useViverseAvatar` flag

Allows to configure whether the users vrm avatar should be displayed as the character model.

- **Default:** `true`

### `movement` Options

- **walk:** `object | boolean` - Enable walking (default: `true`)
  - **speed:** Movement speed in units per second (default: `3`)
  - Set to `false` to disable walking

- **run:** `object | boolean` - Enable running (default: `true`)
  - **speed:** Running speed in units per second (default: `6`)
  - Set to `false` to disable running

- **jump:** `object | boolean` - Enable jumping (default: `true`)
  - **delay:** Time before jump starts in seconds (default: `0.2`)
  - **bufferTime:** Jump input buffer time in seconds (default: `0.1`)
  - **speed:** Jump velocity in units per second (default: `8`)
  - Set to `false` to disable jumping

### `actionBindings` Options

An array of action binding classes to instantiate for handling controls

- **Default:** `[ScreenJoystickLocomotionActionBindings, ScreenButtonJumpActionBindings, PointerCaptureRotateZoomActionBindings, KeyboardLocomotionActionBindings]`
- Configure action bindings with custom action binding classes

**Available Action Binding Classes provided by @pmndrs/viverse:**

- `KeyboardLocomotionActionBindings` - WASD movement, Space for jump, Shift for run
- `PointerCaptureRotateZoomActionBindings` - Mouse look with pointer capture (requires manual `setPointerCapture`)
- `PointerLockRotateZoomActionBindings` - Mouse look with pointer lock (requires manual `requestPointerLock`)
- `ScreenJoystickLocomotionActionBindings` - On-screen joystick for movement and run (mobile). Options: `{ screenJoystickDeadZonePx?, screenJoystickRunDistancePx? }`
- `ScreenButtonJumpActionBindings` - On-screen jump button (mobile-only). Visible only on mobile.

### `actionBindingOptions` Options

Fine-tune the default action binding classes created by `SimpleCharacter`. These options are applied to any active bindings that support them (including your custom `actionBindings` if they expose the same properties).

- **screenJoystickDeadZonePx:** `number` - Inner dead zone radius in pixels for the on-screen joystick (default: `24`)
- **screenJoystickRunDistancePx:** `number` - Distance from center (px) after which the joystick toggles run (default: `46`)
- **pointerCaptureRotationSpeed:** `number` - Rotation speed multiplier for Pointer Capture look (default: `0.4`)
- **pointerCaptureZoomSpeed:** `number` - Zoom speed multiplier for Pointer Capture (default: `0.0001`)
- **pointerLockRotationSpeed:** `number` - Rotation speed multiplier for Pointer Lock look (default: `0.4`)
- **pointerLockZoomSpeed:** `number` - Zoom speed multiplier for Pointer Lock (default: `0.0001`)
- **keyboardRequiresPointerLock:** `boolean` - If `true`, keyboard input only works while the canvas has pointer lock (default: `false`)
- **keyboardMoveForwardKeys:** `string[]` - KeyboardEvent.code values for moving forward (default: `['KeyW']`)
- **keyboardMoveBackwardKeys:** `string[]` - Keys for moving backward (default: `['KeyS']`)
- **keyboardMoveLeftKeys:** `string[]` - Keys for moving left (default: `['KeyA']`)
- **keyboardMoveRightKeys:** `string[]` - Keys for moving right (default: `['KeyD']`)
- **keyboardRunKeys:** `string[]` - Keys for run modifier (default: `['ShiftRight','ShiftLeft']`)
- **keyboardJumpKeys:** `string[]` - Keys for jump (default: `['Space']`)

> [!NOTE]
> Key arrays use `KeyboardEvent.code` strings (e.g., `'KeyW'`, `'ArrowUp'`), not `key` values.

**Example:**

```tsx
<SimpleCharacter
  actionBindingOptions={{
    keyboardRequiresPointerLock: true,
    keyboardMoveForwardKeys: ['KeyW', 'ArrowUp'],
    keyboardRunKeys: ['ShiftLeft'],
    pointerLockRotationSpeed: 0.5,
    pointerLockZoomSpeed: 0.0002,
    screenJoystickDeadZonePx: 16,
    screenJoystickRunDistancePx: 40,
  }}
/>
```

### `model` Options

- **url:** `string` - URL to VRM or GLTF model file
- **type:** `"gltf" | "vrm"` - the type of file to be loaded (optional)
- **castShadow:** `boolean` - Enable shadow casting (default: `true`)
- **receiveShadow:** `boolean` - Enable shadow receiving (default: `true`)
- **boneRotationOffset:** `Quaternion | undefined` - Allows to apply an rotation offset when placing objects as children of the character's bones (default: `undefined`)
- Set to `false` to disable model loading
- Set to `true` or omit to use default robot model

### `physics` Options

- **capsuleRadius:** `number` - Character collision capsule radius (default: `0.4`)
- **capsuleHeight:** `number` - Character collision capsule height (default: `1.7`)
- **gravity:** `number` - Gravity acceleration in m/s² (default: `-20`)
- **linearDamping:** `number` - Air resistance coefficient (default: `0.1`)
- **maxGroundSlope:** `number` - Max slope for a collider to be detected as walkable (default: `0.5`)

### `cameraBehavior` Options

- **collision:** `object | boolean` - Enable camera collision (default: `true`)
  - **offset:** `number` - Collision offset distance (default: `0.2`)

- **characterBaseOffset:** `Vector3 | [number, number, number]` - Camera position relative to character (default: `[0, 1.3, 0]`)

- **rotation:** `object | boolean` - Enable camera rotation (default: `true`)
  - **minPitch:** `number` - Minimum pitch angle (default: `-Math.PI/2`)
  - **maxPitch:** `number` - Maximum pitch angle (default: `Math.PI/2`)
  - **minYaw:** `number` - Minimum yaw angle (default: `-Infinity`)
  - **maxYaw:** `number` - Maximum yaw angle (default: `+Infinity`)
  - **speed:** `number` - Rotation speed multiplier (default: `1000`)

- **zoom:** `object | boolean` - Enable camera zoom (default: `true`)
  - **speed:** `number` - Zoom speed multiplier (default: `1000`)
  - **minDistance:** `number` - Minimum camera distance (default: `1`)
  - **maxDistance:** `number` - Maximum camera distance (default: `7`)

### `animation` Options

- **yawRotationBasedOn:** `'camera' | 'movement'` - Character rotation basis (default: `'movement'`)
- **maxYawRotationSpeed:** `number` - Maximum rotation speed (default: `10`)
- **crossFadeDuration:** `number` - Animation blend time in seconds (default: `0.1`)

The `SimpleCharacter` uses the following animations `walk`, `run`, `idle`, `jumpForward`, `jumpUp`, `jumpLoop`, `jumpDown` each with the following options:

- **url:** `string` - Animation file URL
- **type:** `'gltf' | 'vrma' | 'fbx' | 'bvh'` - Animation file type (optional)
- **boneMap** - Allows to map the bone names of the animation amature to the standard VRM bone names
- **removeXZMovement:** `boolean` - Remove horizontal movement from animation
- **trimTime:** `{ start?: number; end?: number }` - Trim animation timing
- **scaleTime:** `number` - Scale animation playback speed

## PrototypeMaterial

The `<prototypeMaterial>` component provides a textured material for prototyping using kenney.nl's prototype texture.

- **color:** `ColorRepresentation` - Material color tint
- **repeat:** `Vector2` - Texture repeat pattern (accessible as `materialRef.current.repeat`)
- All standard Three.js MeshPhongMaterial properties

```tsx
// As JSX element
<mesh>
  <boxGeometry />
  <prototypeMaterial color="blue" />
</mesh>
```
