---
title: All Components and Hooks
description: Complete reference for all available components and hooks in @react-three/viverse.
nav: 1
---

## Components

## `<Viverse>`

The main provider component that sets up VIVERSE authentication and physics context. Must wrap your entire application or the parts that use VIVERSE features.

**Props:**

- `children?: ReactNode` - Child components
- `loginRequired?: boolean` - Forces user to login before playing (default: `false`)
- `checkAuth?: checkAuthOptions` - Authentication check options
- `clientId?: string` - VIVERSE app client ID (can also be set via `VITE_VIVERSE_APP_ID` environment variable).
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

Creates a simple character controller with physics based on three-mesh-bvh, walking, running, jumping actions, and camera controls. Automatically uses the active VIVERSE avatar if authenticated.

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

### `<FixedBvhPhysicsBody>`

Adds child meshes as static collision objects to the physics world.

> [!WARNING]
> Content must not be dynamic.

**Props:**

- `children?: ReactNode` - Static mesh objects for collision

**Example:**

```tsx
<FixedBvhPhysicsBody>
  <mesh>
    <boxGeometry />
    <meshStandardMaterial />
  </mesh>
</FixedBvhPhysicsBody>
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

### `<VrmCharacterModelBone>`

Component for placing content inside the in VRM character models.

**Props:**

- `bone: VRMHumanBoneName` - The bone name to access

```tsx
<SimpleCharacter>
  <VrmCharacterModelBone bone="rightHand">
    <SwordModel />
  </VrmCharacterModelBone>
</SimpleCharacter>
```

## Hooks

| Hook                             | Description                                                   | Returns                                                          |
| -------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `useViverseClient()`             | Returns the VIVERSE client instance for making API calls      | `Client`                                                         |
| `useViverseAuth()`               | Returns the current authentication state                      | Auth object with access tokens, or `undefined`                   |
| `useViverseAvatarClient()`       | Returns the avatar client for avatar-related operations       | `AvatarClient \| undefined`                                      |
| `useViverseLogin()`              | Returns a function to initiate the VIVERSE login flow         | Login function                                                   |
| `useViverseLogout()`             | Returns a function to initiate the VIVERSE logout flow        | Logout function                                                  |
| `useViverseProfile()`            | Fetches the user's profile (name, avatar info) using Suspense | Profile object with `name`, `activeAvatar`, etc., or `undefined` |
| `useViverseActiveAvatar()`       | Fetches the user's currently selected avatar using Suspense   | Avatar object with `vrmUrl`, `headIconUrl`, etc., or `undefined` |
| `useViverseAvatarList()`         | Fetches the user's personal avatar collection using Suspense  | Array of avatar objects, or `undefined`                          |
| `useViversePublicAvatarList()`   | Fetches publicly available avatars using Suspense             | Array of public avatar objects, or `undefined`                   |
| `useViversePublicAvatarByID(id)` | Fetches a specific public avatar by ID using Suspense         | Avatar object, or `undefined`                                    |

> [!NOTE]
> `useViverseClient()` throws an error if not within a `<Viverse>` provider. All avatar-related hooks return `undefined` when the user is not authenticated.

## SimpleCharacter Options

The `SimpleCharacter` component can be configured with a variety of props but also supports all the default group props, such as position, rotation, and scale.

### `useViverseAvatar` flag

Allows to configure whether the users vrm avatar should be displayed as the character model.
- **Default:** `true`

### `movement` Options

- **walk:** `object | boolean` - Enable walking (default: `true`)
  - **speed:** Movement speed in units per second (default: `2.5`)
  - Set to `false` to disable walking

- **run:** `object | boolean` - Enable running (default: `true`)
  - **speed:** Running speed in units per second (default: `4.5`)
  - Set to `false` to disable running

- **run:** `object | boolean` - Enable jumping (default: `true`)
  - **delay:** Time before jump starts in seconds (default: `0.15`)
  - **bufferTime:** Jump input buffer time in seconds (default: `0.1`)
  - **speed:** Jump velocity in units per second (default: `8`)
  - Set to `false` to disable jumping

### `input` Options

Either a array of `Input` objects or a custom `InputSystem`

- **Default:** `[LocomotionKeyboardInput, PointerCaptureInput]`
- Configure input handling with custom input classes

**Available Input Classes provided by @pmndrs/viverse:**

- `LocomotionKeyboardInput` - WASD movement, Space for jump, Shift for run
- `PointerCaptureInput` - Mouse look with pointer capture (requires manual `setPointerCapture`)
- `PointerLockInput` - Mouse look with pointer lock (requires manual `requestPointerLock`)

### `model` Options

- **url:** `string` - URL to VRM or GLTF model file
- **type:** `"gltf" | "vrm"` - the type of file to be loaded
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
- **maxGroundSlope:** `number` - Max slope for a collider to be detected as a walkable ground (default: `1` which equals to 45°)

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
- **crossFadeDuration:** `number` - Animation blend time in seconds (default: `0.3`)

The `SimpleCharacter` uses the following animations `walk`, `run`, `idle`, `jumpForward`, `jumpUp`, `jumpLoop`, `jumpDown` each with the following options:

- **type:** `'mixamo' | 'gltf' | 'vrma'` - Animation file type
- **url:** `string` - Animation file URL
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
