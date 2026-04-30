
<!-- From: tutorials/simple-game.mdx -->
<a id="doc-tutorials-simple-game"></a>
# Building a Simple Game

In this tutorial, we'll build the following simple 3D platformer game using `@react-three/viverse` with:
- Character movement (WASD + mouse look)
- Jumping mechanics
- Physics-based collision detection
- A simple level with platforms to jump on
- Respawn system when falling off the map


*Here's a preview of what we will build in this tutorial:*

<!-- Sandpack/Sandbox replaced: inline code and dependencies -->
Dependencies:

```js
{
      'three': 'latest',
      '@react-three/fiber': '<9',
      '@react-three/viverse': 'latest',
      '@react-three/drei': '<10'
    }
```

Files:

File: /Scene.tsx

```tsx
import { Sky } from '@react-three/drei'
import { SimpleCharacter, BvhPhysicsBody, PrototypeBox } from '@react-three/viverse'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'

export function Scene() {
  const characterRef = useRef<Group>(null)
  
  // Respawn logic - reset character position if they fall off the map
  useFrame(() => {
    if (characterRef.current == null) {
      return
    }
    if (characterRef.current.position.y < -10) {
      characterRef.current.position.set(0, 0, 0)
    }
  })

  return (
    <>
      {/* Environment */}
      <Sky />
      
      {/* Lighting */}
      <directionalLight
        intensity={1.2}
        position={[5, 10, 10]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <ambientLight intensity={1} />
      
      {/* Character */}
      <SimpleCharacter ref={characterRef} />
      
      {/* Level Geometry */}
      <BvhPhysicsBody>
        {/* Main ground */}
        <PrototypeBox 
          color="#ffffff" 
          scale={[10, 0.5, 10]} 
          position={[0, -2, 0]} 
        />
        
        {/* Platforms */}
        <PrototypeBox 
          color="#cccccc" 
          scale={[2, 1, 3]} 
          position={[4, 0, 0]} 
        />
        <PrototypeBox 
          color="#ffccff" 
          scale={[3, 1, 3]} 
          position={[3, 1.5, -1]} 
        />
        <PrototypeBox 
          color="#ccffff" 
          scale={[2, 0.5, 3]} 
          position={[2, 2.5, -3]} 
        />
        <PrototypeBox 
          color="#ffccff" 
          scale={[2, 1, 3]} 
          position={[-3, 0, -2]} 
        />
        <PrototypeBox 
          color="#ccffff" 
          scale={[1, 1, 4]} 
          position={[0, -1, 0]} 
        />
        <PrototypeBox 
          color="#ffffcc" 
          scale={[4, 1, 1]} 
          position={[0, 3.5, 0]} 
        />
      </BvhPhysicsBody>
    </>
  )
}
```

File: /App.tsx

```tsx
import { Suspense } from "react"
import { Canvas } from '@react-three/fiber'
import { Viverse } from '@react-three/viverse'
import { Scene } from "./Scene"

export default function App() {
  return (
    <Canvas
      style={{ position: "absolute", inset: "0", touchAction: "none" }}
      camera={{ fov: 90, position: [0, 2, 2] }}
      shadows
    >
      <Suspense fallback={null}>
        <Viverse>
          <Scene />
        </Viverse>
      </Suspense>
    </Canvas>
  )
}
```


## Step 0: Prerequisites

Make sure you have the required dependencies installed:

```bash
npm install three @react-three/fiber @react-three/viverse @react-three/drei
```

## Step 1: Setting Up the Canvas

First, let's create the basic Canvas setup with shadows and proper camera settings:

```tsx
import { Canvas } from '@react-three/fiber'
import { Viverse } from '@react-three/viverse'
import { Suspense } from 'react'

export function App() {
  return (
    <Canvas
      style={{ position: "absolute", inset: "0", touchAction: "none" }}
      camera={{ fov: 90, position: [0, 2, 2] }}
      shadows
    >
      <Suspense fallback={null}>
        <Viverse>
          <Scene />
        </Viverse>
      </Suspense>
    </Canvas>
  )
}
```

## Step 2: Adding the Scene and creating the Sky

Let's create another component called `Scene` and add the sky and basic lighting. Add the `Sky` import from `@react-three/drei`:

```tsx
import { Sky } from '@react-three/drei'

export function Scene() {
  return (
    <>
      {/* Environment */}
      <Sky />
      
      {/* Basic lighting */}
      <directionalLight
        intensity={1.2}
        position={[5, 10, 10]}
        castShadow
      />
      <ambientLight intensity={1} />
    </>
  )
}
```

At this point, you should see a beautiful sky gradient in your scene!

## Step 3: Building the Level

Now add the level geometry. Import `BvhPhysicsBody` and `PrototypeBox` from `@react-three/viverse`, and expand the directional light with shadow properties:

```tsx
import { Sky } from '@react-three/drei'
import { BvhPhysicsBody, PrototypeBox } from '@react-three/viverse'

export function Scene() {
  return (
    <>
      {/* Environment */}
      <Sky />
      
      {/* Lighting - expanded with shadow settings */}
      <directionalLight
        intensity={1.2}
        position={[5, 10, 10]}
        castShadow
      />
      <ambientLight intensity={1} />
      
      <BvhPhysicsBody>
        <PrototypeBox 
          color="#ffffff" 
          scale={[10, 0.5, 10]} 
          position={[0, -2, 0]} 
        />
        
        {/* Platforms */}
        <PrototypeBox 
          color="#cccccc" 
          scale={[2, 1, 3]} 
          position={[4, 0, 0]} 
        />
        <PrototypeBox 
          color="#ffccff" 
          scale={[3, 1, 3]} 
          position={[3, 1.5, -1]} 
        />
        <PrototypeBox 
          color="#ccffff" 
          scale={[2, 0.5, 3]} 
          position={[2, 2.5, -3]} 
        />
        <PrototypeBox 
          color="#ffccff" 
          scale={[2, 1, 3]} 
          position={[-3, 0, -2]} 
        />
        <PrototypeBox 
          color="#ccffff" 
          scale={[1, 1, 4]} 
          position={[0, -1, 0]} 
        />
        <PrototypeBox 
          color="#ffffcc" 
          scale={[4, 1, 1]} 
          position={[0, 3.5, 0]} 
        />
      </BvhPhysicsBody>
    </>
  )
}
```

Now you should see a colorful platformer level with various platforms at different heights!

## Step 4: Adding the Character

Next we will add the character. Import `SimpleCharacter` from `@react-three/viverse`:

```tsx
import { Sky } from '@react-three/drei'
import { SimpleCharacter, BvhPhysicsBody, PrototypeBox } from '@react-three/viverse'
import { useRef } from 'react'

export function Scene() {

  return (
    <>
      {/* Environment */}
      <Sky />
      
      {/* Lighting */}
      <directionalLight
        intensity={1.2}
        position={[5, 10, 10]}
        castShadow
      />
      <ambientLight intensity={1} />
      
      <SimpleCharacter/>
      
      {/* Level Geometry */}
      <BvhPhysicsBody>
        {/* ... platforms remain the same ... */}
      </BvhPhysicsBody>
    </>
  )
}
```

Great! Now you can move around with WASD keys, look around with the mouse, and jump with the spacebar. Try jumping between the platforms!

## Step 5: Adding Respawn Logic

Finally, we will add the respawn system. Import `useRef` from `react` and `useFrame` from `@react-three/fiber` and add the respawn logic:

```tsx
import { Sky } from '@react-three/drei'
import { SimpleCharacter, BvhPhysicsBody, PrototypeBox } from '@react-three/viverse'
import { useRef } from 'react'
import { Group } from 'three'
import { useFrame } from '@react-three/fiber' // NEW

export function Scene() {
  const characterRef = useRef<Group>(null)
  
  // Respawn logic - NEW
  useFrame(() => {
    if (characterRef.current == null) {
      return
    }
    if (characterRef.current.position.y < -10) {
      characterRef.current.position.set(0, 0, 0)
    }
  })

  return (
    <>
      <SimpleCharacter ref={characterRef}/>

      {/* ... rest remains the same ... */}
    </>
  )
}
```

Perfect! Now if you fall off the map (below y = -10), you'll automatically respawn at the starting position (0, 0, 0).

<!-- From: tutorials/first-person.mdx -->
<a id="doc-tutorials-first-person"></a>
# First Person Controls

In this tutorial we will configure the `SimpleCharacter` to use first person controls with the following result:

_Here's a preview of this tutorial's result:_

<!-- Sandpack/Sandbox replaced: inline code and dependencies -->
Dependencies:

```js
{
      'three': 'latest',
      '@react-three/fiber': '<9',
      '@react-three/viverse': 'latest',
      '@react-three/drei': '<10'
    }
```

Files:

File: /App.tsx

```tsx
import { Sky } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import {
  Viverse,
  SimpleCharacter,
  BvhPhysicsBody,
  PrototypeBox,
  FirstPersonCharacterCameraBehavior,
  PointerLockRotateZoomActionBindings,
  KeyboardLocomotionActionBindings,
} from '@react-three/viverse'

export default function App() {
  return (
   <Canvas
      style={{ position: 'absolute', inset: '0', touchAction: 'none' }}
    >
      <Viverse>
        <Sky />
        <directionalLight intensity={1.2} position={[-10, 10, -10]} />
        <ambientLight intensity={1} />
        <SimpleCharacter
          model={false}
          actionBindings={[KeyboardLocomotionActionBindings, PointerLockRotateZoomActionBindings]}
          cameraBehavior={FirstPersonCharacterCameraBehavior}
        />
        <BvhPhysicsBody>
          <PrototypeBox scale={[10, 1, 15]} position={[0, -0.5, 0]} />
        </BvhPhysicsBody>
      </Viverse>
    </Canvas>
  )
}
```


First, we switch from third-person to first-person camera behavior and hide the character model to prevent the model from occluding the players view.

```tsx
<SimpleCharacter
  model={false}
  cameraBehavior={FirstPersonCharacterCameraBehavior}
  // ... other props
/>
```

**Changes:**

- `model={false}` - Hides the character model since in first-person view, you don't want to see your own character
- `cameraBehavior={FirstPersonCharacterCameraBehavior}` - Switches from the default third-person camera to first-person camera behavior

Next, you need to set up the appropriate action bindings for first-person movement and looking around:

```tsx
<SimpleCharacter
  actionBindings={[KeyboardLocomotionActionBindings, PointerLockRotateZoomActionBindings]}
  // ... other props
/>
```

- `KeyboardLocomotionActionBindings` - Handles WASD movement action bindings for walking around
- `PointerLockRotateZoomActionBindings` - Enables mouse look action bindings for rotating the camera/view direction

<!-- From: tutorials/augmented-and-virtual-reality.mdx -->
<a id="doc-tutorials-augmented-and-virtual-reality"></a>
# Augmented and Virtual Reality

This tutorial shows how to add Augmented Reality (AR) and Virtual Reality (VR) support to your `@react-three/viverse` games. We'll start with AR and then show the additional changes needed for VR.

## Prerequisites

Make sure you have the `@react-three/xr` package installed:

```bash
npm install @react-three/xr
```

## Augmented Reality (AR)

Let's start by adding AR support to a basic `@react-three/viverse` game.

*Here's the AR app we'll build now:*

<!-- Sandpack/Sandbox replaced: inline code and dependencies -->
Dependencies:

```js
{
      'three': 'latest',
      '@react-three/fiber': '<9',
      '@react-three/viverse': 'latest',
      '@react-three/drei': '<10',
      '@react-three/xr': 'latest'
    }
```

Files:

File: /App.tsx

```tsx
import { Canvas } from '@react-three/fiber'
import { Viverse } from '@react-three/viverse'
import { XR, XROrigin, createXRStore } from '@react-three/xr'
import { Scene } from './Scene'

const store = createXRStore({ offerSession: 'immersive-ar' })

export default function App() {
  return (
    <Viverse>
      <Canvas
        style={{ position: "absolute", inset: "0", touchAction: "none" }}
        camera={{ fov: 90, position: [0, 2, 2] }}
        shadows
        gl={{ antialias: true, localClippingEnabled: true }}
      >
        <XR store={store}>
            <XROrigin scale={10} position-y={-8} position-z={10} />
            <Scene />
        </XR>
      </Canvas>
    </Viverse>
  )
}

```

File: /Scene.tsx

```tsx
import { useFrame } from '@react-three/fiber'
import {
  SimpleCharacter,
  BvhPhysicsBody,
  PrototypeBox,
  useXRControllerLocomotionActionBindings,
} from '@react-three/viverse'
import { useRef } from 'react'
import { Group } from 'three'

export function Scene() {
  const characterRef = useRef<Group>(null)
  useFrame(() => {
    if (characterRef.current == null) {
      return
    }
    if (characterRef.current.position.y < -10) {
      characterRef.current.position.set(0, 0, 0)
    }
  })
  useXRControllerLocomotionActionBindings()
  return (
    <>
      <directionalLight
        intensity={1.2}
        position={[5, 10, 10]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <ambientLight intensity={1} />
      <SimpleCharacter cameraBehavior={false} ref={characterRef} />
      <BvhPhysicsBody>
        <PrototypeBox color="&#35;cccccc" scale={[2, 1, 3]} position={[3.91, 0, 0]} />
        <PrototypeBox color="&#35;ffccff" scale={[3, 1, 3]} position={[2.92, 1.5, -1.22]} />
        <PrototypeBox color="&#35;ccffff" scale={[2, 0.5, 3]} position={[1.92, 2.5, -3.22]} />
        <PrototypeBox color="&#35;ffccff" scale={[2, 1, 3]} position={[-2.92, 0, -2.22]} />
        <PrototypeBox color="&#35;ccffff" scale={[1, 1, 4]} position={[0.08, -1, 0]} />
        <PrototypeBox color="&#35;ffffcc" scale={[4, 1, 1]} position={[0.08, 3.5, 0]} />
        <PrototypeBox color="&#35;ffffff" scale={[10, 0.5, 10]} position={[0.08, -2, 0]} />
      </BvhPhysicsBody>
    </>
  )
}

```


### Step 1: Set Up the XR Store

Create an XR store configured for AR. Add these imports and create the store:

```tsx
import { XR, XROrigin, createXRStore } from '@react-three/xr'

const store = createXRStore({ offerSession: 'immersive-ar' })
```

The `offerSession: 'immersive-ar'` option tells the XR system that we want to create an AR experience.

### Step 2: Wrap Your Scene with XR Components

Wrap your scene content with the `XR` component and add an `XROrigin`:

```tsx
export function App() {
  return (
    <Viverse>
      <Canvas
        style={{ width: '100%', flexGrow: 1 }}
        camera={{ fov: 90, position: [0, 2, 2] }}
        shadows
        gl={{ antialias: true, localClippingEnabled: true }}
      >
        <Suspense fallback={<Text>Loading...</Text>}>
          <XR store={store}>
            <XROrigin scale={10} position-y={-8} position-z={10} />
            <Scene />
          </XR>
        </Suspense>
      </Canvas>
    </Viverse>
  )
}
```

**Key points:**
- `XROrigin` defines the coordinate system origin for AR tracking
- `scale={10}` makes the scene 10x larger relative to the real world
- `position-y={-8} position-z={10}` adjusts the initial positioning

### Step 3: Remove Sky Component

For AR, you don't want a sky background since the camera feed should show through. Remove any `Sky` components from your scene:

```tsx
export function Scene() {
  return (
    <>
      {/* Remove <Sky /> for AR */}
      <directionalLight intensity={1.2} position={[5, 10, 10]} castShadow />
      <ambientLight intensity={1} />
      {/* ... rest of your scene */}
    </>
  )
}
```

### Step 4: Use XR Controller Action Bindings

Add XR controller action bindings using the `useXRControllerLocomotionActionBindings` hook:

```tsx
import { useXRControllerLocomotionActionBindings } from '@react-three/viverse'

export function Scene() {
  useXRControllerLocomotionActionBindings()
  
  return (
    <>
      <SimpleCharacter 
        cameraBehavior={false} 
        ref={characterRef}
      >
        <PlayerTag />
      </SimpleCharacter>
      {/* ... rest of scene */}
    </>
  )
}
```

**Key changes:**
- `cameraBehavior={false}` - Disables automatic camera control (AR handles this)
- `useXRControllerLocomotionActionBindings()` - Hook that provides controller action bindings for movement

The `useXRControllerLocomotionActionBindings` hook binds XR controller inputs to character locomotion actions:
- **Left thumbstick** controls movement (forward/backward/left/right)
- **Right controller A button** triggers jumping
- **Left trigger** enables running

## Virtual Reality (VR)

Now let's look at how to add VR support to a game building on the knowledge from adding AR support.

*Here's the VR app we'll build now:*

<!-- Sandpack/Sandbox replaced: inline code and dependencies -->
Dependencies:

```js
{
      'three': 'latest',
      '@react-three/fiber': '<9',
      '@react-three/viverse': 'latest',
      '@react-three/drei': '<10',
      '@react-three/xr': 'latest'
    }
```

Files:

File: /App.tsx

```tsx
import { Canvas } from '@react-three/fiber'
import { Viverse } from '@react-three/viverse'
import { XR, createXRStore } from '@react-three/xr'
import { Scene } from './Scene'

const store = createXRStore({ offerSession: 'immersive-vr' })

export default function App() {
  return (
    <Viverse>
      <Canvas
        style={{ position: "absolute", inset: "0", touchAction: "none" }}
        camera={{ fov: 90, position: [0, 2, 2] }}
        shadows
        gl={{ antialias: true, localClippingEnabled: true }}
      >
        <XR store={store}>
            <Scene />
        </XR>
      </Canvas>
    </Viverse>
  )
}

```

File: /Scene.tsx

```tsx
import { useFrame } from '@react-three/fiber'
import {
  SimpleCharacter,
  BvhPhysicsBody,
  PrototypeBox,
  useXRControllerLocomotionActionBindings,
} from '@react-three/viverse'
import { Sky } from '@react-three/drei'
import { XROrigin, useXRInputSourceState } from '@react-three/xr'
import { useRef } from 'react'
import { Group } from 'three'

export function Scene() {
  const characterRef = useRef<Group>(null)
  useFrame(() => {
    if (characterRef.current == null) {
      return
    }
    if (characterRef.current.position.y < -10) {
      characterRef.current.position.set(0, 0, 0)
    }
  })
  useXRControllerLocomotionActionBindings()
  return (
    <>
      <Sky />
      <directionalLight
        intensity={1.2}
        position={[5, 10, 10]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <ambientLight intensity={1} />
      <SimpleCharacter cameraBehavior={false} model={false} ref={characterRef}>
        <SnapRotateXROrigin />
      </SimpleCharacter>
             <BvhPhysicsBody>
         <PrototypeBox color="&#35;cccccc" scale={[2, 1, 3]} position={[3.91, 0, 0]} />
         <PrototypeBox color="&#35;ffccff" scale={[3, 1, 3]} position={[2.92, 1.5, -1.22]} />
         <PrototypeBox color="&#35;ccffff" scale={[2, 0.5, 3]} position={[1.92, 2.5, -3.22]} />
         <PrototypeBox color="&#35;ffccff" scale={[2, 1, 3]} position={[-2.92, 0, -2.22]} />
         <PrototypeBox color="&#35;ccffff" scale={[1, 1, 4]} position={[0.08, -1, 0]} />
         <PrototypeBox color="&#35;ffffcc" scale={[4, 1, 1]} position={[0.08, 3.5, 0]} />
         <PrototypeBox color="&#35;ffffff" scale={[10, 0.5, 10]} position={[0.08, -2, 0]} />
       </BvhPhysicsBody>
    </>
  )
}

function SnapRotateXROrigin() {
  const ref = useRef<Group>(null)
  const rightController = useXRInputSourceState('controller', 'right')
  const prev = useRef(0)
  
  useFrame(() => {
    if (ref.current == null) return
    
    const current = Math.round(rightController?.gamepad?.['xr-standard-thumbstick']?.xAxis ?? 0)
    if (current < 0 && prev.current >= 0) {
      // Rotate left
      ref.current.rotation.y += Math.PI / 2
    }
    if (current > 0 && prev.current <= 0) {
      // Rotate right
      ref.current.rotation.y -= Math.PI / 2
    }
    prev.current = current
  })
  
  return <XROrigin ref={ref} />
}

```


### Step 1: Change Session Type to VR

We can update the offer session to show the user a native "VR" enter button.

```tsx
const store = createXRStore({ 
  offerSession: 'immersive-vr',
})
```

### Step 2: Re-add the Sky for VR

Unlike AR, VR needs a sky background since there's no camera feed:

```tsx
import { Sky } from '@react-three/drei'

export function Scene() {
  return (
    <>
      <Sky />
      <directionalLight intensity={1.2} position={[5, 10, 10]} castShadow />
      <ambientLight intensity={1} />
      {/* ... rest of scene */}
    </>
  )
}
```

### Step 3: Hide the Character Model

In VR, you typically don't want to see your own character model:

```tsx
<SimpleCharacter 
  cameraBehavior={false} 
  model={false}
  ref={characterRef}
>
```

**Key change:**
- `model={false}` - Hides the character model in VR

### Step 4: Place the XROrigin into the Simple Character and Optionally Add Snap Rotation

As the XROrigin defines the player's position, we need to remove it from outside the Scene and add it into the SimpleCharacter.

```tsx
import { useXRInputSourceState } from '@react-three/xr'

<SimpleCharacter ... >
    <XROrigin />
</SimpleCharacter>
```

For comfort in VR, you can add snap rotation using the right thumbstick by building a SnapRotateXROrigin which replaces the XROrigin component.

```tsx
import { useXRInputSourceState } from '@react-three/xr'

<SimpleCharacter ... >
    <SnapRotateXROrigin />
</SimpleCharacter>

function SnapRotateXROrigin() {
  const ref = useRef<Group>(null)
  const rightController = useXRInputSourceState('controller', 'right')
  const prev = useRef(0)
  
  useFrame(() => {
    if (ref.current == null) return
    
    const current = Math.round(rightController?.gamepad?.['xr-standard-thumbstick']?.xAxis ?? 0)
    if (current < 0 && prev.current >= 0) {
      // Rotate left
      ref.current.rotation.y += Math.PI / 2
    }
    if (current > 0 && prev.current <= 0) {
      // Rotate right
      ref.current.rotation.y -= Math.PI / 2
    }
    prev.current = current
  })
  
  return <XROrigin ref={ref} />
}
```

## Summary

**For AR:**
1. Use `offerSession: 'immersive-ar'`
2. Remove `Sky` component
3. Use `useXRControllerLocomotionActionBindings()` for to bind the locomotion actions
4. Set `cameraBehavior={false}` on SimpleCharacter
5. Add `XROrigin` with appropriate scaling/positioning

**Additional changes for VR:**
1. Change to `offerSession: 'immersive-vr'` 
2. Re-add `Sky` component
3. Set `model={false}` to hide character
4. Place the XROrigin into the SimpleCharacter and optionally add snap rotation for comfort

<!-- From: tutorials/access-avatar-and-profile.mdx -->
<a id="doc-tutorials-access-avatar-and-profile"></a>
# Accessing Avatar and Profile

This tutorial shows you how to display a player tag above the character by accessing the user profile information from VIVERSE.

_Here's a preview of what we'll build in this tutorial:_

<!-- Sandpack/Sandbox replaced: inline code and dependencies -->
Dependencies:

```js
{
      'three': 'latest',
      '@react-three/fiber': '<9',
      '@react-three/viverse': 'latest',
      '@react-three/drei': '<10',
      "@react-three/uikit": "^1.0.41"
    }
```

Files:

File: /Playertag.tsx

```tsx
import { useViverseProfile } from '@react-three/viverse'
import { Container, Image, Text } from '@react-three/uikit'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'

export function PlayerTag() {
  const profile = useViverseProfile() ?? {
    name: 'Anonymous',
    activeAvatar: { headIconUrl: 'https://picsum.photos/200' },
  }
  
  const ref = useRef<Group>(null)
  
  // Make the tag always face the camera
  useFrame((state) => {
    if (ref.current == null) {
      return
    }
    ref.current.quaternion.copy(state.camera.quaternion)
  })

return (

<group ref={ref} position-y={2.15}>
  <Container
    depthTest={false}
    renderOrder={1}
    borderRadius={10}
    paddingX={2}
    height={20}
    backgroundColor="rgba(255, 255, 255, 0.5)"
    flexDirection="row"
    alignItems="center"
    gap={4}
  >
    <Image
      width={16}
      height={16}
      borderRadius={14}
      depthTest={false}
      renderOrder={1}
      src={profile.activeAvatar?.headIconUrl}
    />
    <Text depthTest={false} renderOrder={1} fontWeight="bold" fontSize={12} marginRight={3}>
      {profile.name}
    </Text>
  </Container>
</group>
) }
```

File: /App.tsx

```tsx
 import {Sky} from '@react-three/drei' import {Canvas} from '@react-three/fiber' import
{(Viverse, SimpleCharacter, BvhPhysicsBody, PrototypeBox)} from '@react-three/viverse' import {PlayerTag} from
"./Playertag"

export default function App() {
  return (
    <Canvas shadows style={{ position: "absolute", inset: "0", touchAction: "none" }}>
      <Viverse>
        <Sky />
        <directionalLight intensity={1.2} position={[-10, 10, -10]} castShadow />
        <ambientLight intensity={1} />
        <SimpleCharacter>
          <PlayerTag />
        </SimpleCharacter>
        <BvhPhysicsBody>
          <PrototypeBox scale={[10, 1, 15]} position={[0, -0.5, 0]} />
        </BvhPhysicsBody>
      </Viverse>
    </Canvas>
  )
}
```


First, we use the `useViverseProfile()` hook to fetch the current user's profile from VIVERSE, including their name and avatar information. We provide a fallback for when the user isn't logged in:

```tsx
const profile = useViverseProfile() ?? {
  name: 'Anonymous',
  activeAvatar: { headIconUrl: 'https://picsum.photos/200' },
}
```

Next, we need a 3D ui library, install it via

```bash
npm install @react-three/uikit
```

UIKit provides HTML-like components (`Container`, `Image`, `Text`) that work in 3D space. We create a card-like layout with flexbox:

```tsx
<Container
  depthTest={false}
  renderOrder={1}
  borderRadius={10}
  paddingX={2}
  height={20}
  backgroundColor="rgba(255, 255, 255, 0.5)"
  flexDirection="row"
  alignItems="center"
  gap={4}
>
  <Image
    depthTest={false}
    renderOrder={1}
    width={16}
    height={16}
    borderRadius={14}
    src={profile.activeAvatar?.headIconUrl}
  />
  <Text depthTest={false} renderOrder={1} fontWeight="bold" fontSize={12} marginRight={3}>
    {profile.name}
  </Text>
</Container>
```

Next, we use `useFrame` to constantly update the tag's rotation to match the camera:

```tsx
import { Group } from 'three'

const ref = useRef<Group>(null)

useFrame((state) => {
  if (ref.current == null) {
    return
  }
  ref.current.quaternion.copy(state.camera.quaternion)
})
```

The full `PlayerTag` component looks like this:

```tsx
import { useViverseProfile } from '@react-three/viverse'
import { Container, Image, Text } from '@react-three/uikit'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'

export function PlayerTag() {
  const profile = useViverseProfile() ?? {
    name: 'Anonymous',
    activeAvatar: { headIconUrl: 'https://picsum.photos/200' },
  }

  const ref = useRef<Group>(null)

  // Make the tag always face the camera
  useFrame((state) => {
    if (ref.current == null) {
      return
    }
    ref.current.quaternion.copy(state.camera.quaternion)
  })

  return (
    <group ref={ref} position-y={2.15}>
      <Container
        depthTest={false}
        renderOrder={1}
        borderRadius={10}
        paddingX={2}
        height={20}
        backgroundColor="rgba(255, 255, 255, 0.5)"
        flexDirection="row"
        alignItems="center"
        gap={4}
      >
        <Image
          depthTest={false}
          renderOrder={1}
          width={16}
          height={16}
          borderRadius={14}
          src={profile.activeAvatar?.headIconUrl}
        />
        <Text depthTest={false} renderOrder={1} fontWeight="bold" fontSize={12} marginRight={3}>
          {profile.name}
        </Text>
      </Container>
    </group>
  )
}
```

Now finally lets add the PlayerTag as a child of SimpleCharacter to display it

```tsx
<SimpleCharacter>
  <PlayerTag />
</SimpleCharacter>
```

<!-- From: tutorials/equipping-items.mdx -->
<a id="doc-tutorials-equipping-items"></a>
# Equipping the Character With Items

This tutorial shows you how to equip your character with items by attaching 3D objects to specific bones. We'll create a simple sword using just two meshes and attach it to the character's right hand.

_Here's a preview of what we'll build in this tutorial:_

<!-- Sandpack/Sandbox replaced: inline code and dependencies -->
Dependencies:

```js
{
      'three': 'latest',
      '@react-three/fiber': '<9',
      '@react-three/viverse': 'latest',
      '@react-three/drei': '<10'
    }
```

Files:

File: /App.tsx

```tsx
import { Sky } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Viverse, SimpleCharacter, BvhPhysicsBody, PrototypeBox, CharacterModelBone } from '@react-three/viverse'

export default function App() {
  return (
    <Canvas shadows style={{ position: "absolute", inset: "0", touchAction: "none" }}>
      <Viverse>
        <Sky />
        <directionalLight intensity={1.2} position={[-10, 10, -10]} castShadow />
        <ambientLight intensity={1} />
        <SimpleCharacter>
          <CharacterModelBone bone="rightHand">
            <group
              scale={0.5}
              position-y={-0.02}
              position-x={0.07}
              rotation-z={-(0.2 * Math.PI) / 2}
              rotation-x={-(1 * Math.PI) / 2}
            >
                {/* Blade */}
                <mesh position={[0, 0.8, 0]} castShadow>
                    <boxGeometry args={[0.08, 1.9, 0.04]} />
                    <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} />
                </mesh>
                
                {/* Handle */}
                <mesh position={[0, 0.2, 0]} castShadow>
                    <boxGeometry args={[0.3, 0.04, 0.04]} />
                    <meshStandardMaterial color="#654321" metalness={0.1} roughness={0.8} />
                </mesh>
            </group>
          </CharacterModelBone>
        </SimpleCharacter>
        <BvhPhysicsBody>
          <PrototypeBox scale={[10, 1, 15]} position={[0, -0.5, 0]} />
        </BvhPhysicsBody>
      </Viverse>
    </Canvas>
  )
}
```


## Understanding Bone Attachment

The `CharacterModelBone` component allows you to attach any 3D object to specific bones in the character's skeleton. This is perfect for equipping weapons, accessories, or any items that should move with the character.

### Step 1: Import the CharacterModelBone Component

First, import the `CharacterModelBone` component from `@react-three/viverse`:

```tsx
import { CharacterModelBone } from '@react-three/viverse'
```

### Step 2: Add a Simple Sword to the `"rightHand"`

Next, we place the CharacterModelBone inside the `SimpleCharacter` component and attach it to the `"rightHand"`. We then build a simple sword using two meshes. For better looks, you probably want to import your own 3D model.

```tsx
<SimpleCharacter>
  <CharacterModelBone bone="rightHand">
    <group
      scale={0.5}
      position-y={-0.02}
      position-x={0.07}
      rotation-z={-(0.2 * Math.PI) / 2}
      rotation-x={-(1 * Math.PI) / 2}
    >
      {/* Blade */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.08, 1.9, 0.04]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Handle */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.3, 0.04, 0.04]} />
        <meshStandardMaterial color="#654321" metalness={0.1} roughness={0.8} />
      </mesh>
    </group>
  </CharacterModelBone>
</SimpleCharacter>
```

<!-- From: tutorials/custom-models-and-animations.mdx -->
<a id="doc-tutorials-custom-models-and-animations"></a>
# Custom Models and Animations

## Using Custom Character Models

By default, the `SimpleCharacter` component uses a built-in robot avatar. You can easily replace this with your own 3D model by providing a URL to the model file in any of the following formats:

- **VRM** - The standardized VRM format for avatars requires no additional configuration
- **GLTF** - (or also glb) Standard 3D Model format - make sure to use the standard vrm bone names as shown below or provide a `boneMap`.

<details>
<summary>VRM 1.0 humanoid bone names (click to expand)</summary>

The following are the standard VRM 1.0 humanoid bone names your GLTF rig should use (aligned with the VRM specification). If your model uses these names, animations and retargeting will work reliably:

| Bone name                 | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `hips`                    | Pelvis root; parent of the spine and both legs |
| `spine`                   | Lower/waist spine segment above hips           |
| `chest`                   | Mid/upper torso segment above spine            |
| `upperChest`              | Optional highest chest segment below neck      |
| `neck`                    | Neck base; parent of head                      |
| `head`                    | Head root; parent of eyes and jaw              |
| `leftEye`                 | Left eyeball transform                         |
| `rightEye`                | Right eyeball transform                        |
| `jaw`                     | Jaw/mandible pivot                             |
| `leftUpperLeg`            | Left thigh (upper leg)                         |
| `leftLowerLeg`            | Left shin (lower leg)                          |
| `leftFoot`                | Left foot root/ankle                           |
| `leftToes`                | Left toe base                                  |
| `rightUpperLeg`           | Right thigh (upper leg)                        |
| `rightLowerLeg`           | Right shin (lower leg)                         |
| `rightFoot`               | Right foot root/ankle                          |
| `rightToes`               | Right toe base                                 |
| `leftShoulder`            | Left clavicle/shoulder pivot                   |
| `leftUpperArm`            | Left upper arm (humerus)                       |
| `leftLowerArm`            | Left forearm                                   |
| `leftHand`                | Left hand/wrist root                           |
| `rightShoulder`           | Right clavicle/shoulder pivot                  |
| `rightUpperArm`           | Right upper arm (humerus)                      |
| `rightLowerArm`           | Right forearm                                  |
| `rightHand`               | Right hand/wrist root                          |
| `leftThumbMetacarpal`     | Left thumb metacarpal (root of thumb)          |
| `leftThumbProximal`       | Left thumb proximal phalanx                    |
| `leftThumbDistal`         | Left thumb distal phalanx                      |
| `leftIndexProximal`       | Left index proximal phalanx                    |
| `leftIndexIntermediate`   | Left index intermediate phalanx                |
| `leftIndexDistal`         | Left index distal phalanx                      |
| `leftMiddleProximal`      | Left middle proximal phalanx                   |
| `leftMiddleIntermediate`  | Left middle intermediate phalanx               |
| `leftMiddleDistal`        | Left middle distal phalanx                     |
| `leftRingProximal`        | Left ring proximal phalanx                     |
| `leftRingIntermediate`    | Left ring intermediate phalanx                 |
| `leftRingDistal`          | Left ring distal phalanx                       |
| `leftLittleProximal`      | Left little/pinky proximal phalanx             |
| `leftLittleIntermediate`  | Left little/pinky intermediate phalanx         |
| `leftLittleDistal`        | Left little/pinky distal phalanx               |
| `rightThumbMetacarpal`    | Right thumb metacarpal (root of thumb)         |
| `rightThumbProximal`      | Right thumb proximal phalanx                   |
| `rightThumbDistal`        | Right thumb distal phalanx                     |
| `rightIndexProximal`      | Right index proximal phalanx                   |
| `rightIndexIntermediate`  | Right index intermediate phalanx               |
| `rightIndexDistal`        | Right index distal phalanx                     |
| `rightMiddleProximal`     | Right middle proximal phalanx                  |
| `rightMiddleIntermediate` | Right middle intermediate phalanx              |
| `rightMiddleDistal`       | Right middle distal phalanx                    |
| `rightRingProximal`       | Right ring proximal phalanx                    |
| `rightRingIntermediate`   | Right ring intermediate phalanx                |
| `rightRingDistal`         | Right ring distal phalanx                      |
| `rightLittleProximal`     | Right little/pinky proximal phalanx            |
| `rightLittleIntermediate` | Right little/pinky intermediate phalanx        |
| `rightLittleDistal`       | Right little/pinky distal phalanx              |

</details>

```tsx
import { SimpleCharacter } from '@react-three/viverse'

export function MyCharacter() {
  return <SimpleCharacter model={{ url: '/path/to/your-model.vrm' }} />
}
```

If your GLTF model does not use the standard VRM bone names, you can provide a `boneMap` to map your model's bone names to the VRM standard:

```tsx
import { SimpleCharacter } from '@react-three/viverse'

const myBoneMap = {
  'mixamorig:Hips': 'hips',
  'mixamorig:Spine': 'spine',
  // ... other bones
}

export function MyCharacter() {
  return (
    <SimpleCharacter
      model={{
        url: '/path/to/your-model.glb',
        boneMap: myBoneMap
      }}
    />
  )
}
```

## Adding Custom Animations

Your can replace the default animations of the `SimpleCharacter` component with files in any of these three supported animation formats:

- **VRMA** (VRM Animation) - The native VRM animation format
- **FBX** - Popular file format for character animations
- **GLTF** - Standard 3D format with animations
- **Mixamo** - **deprecated** - use remove `type: 'mixamo'` and add `boneMap: mixamoBoneMap` instead

Make sure to either use a bone map, e.g. when your bone names follow the mixamo naming conventions use the `mixamoBoneMap` or use the standard VRM bones for the animation amature as shown above under "VRM 1.0 humanoid bone names".

Each animation type can be configured individually:

```tsx
<SimpleCharacter
  animation={{
    walk: {
      url: '/animations/walking.fbx',
      boneMap: mixamoBoneMap,
      removeXZMovement: true,
      scaleTime: 0.8,
    },
    run: {
      url: '/animations/running.vrma',
    },
    idle: {
      url: '/animations/idle.gltf',
      trimTime: { start: 0.5, end: 3.0 },
    },
  }}
/>
```

You can customize any of these animation slots:

- `walk` - Walking animation
- `run` - Running animation
- `idle` - Standing idle animation
- `jumpStart` - Beginning of jump
- `jumpUp` - Ascending during jump
- `jumpLoop` - Mid-air loop animation
- `jumpDown` - Landing animation

<!-- From: tutorials/actions.mdx -->
<a id="doc-tutorials-actions"></a>
# Actions and Action Bindings

Actions allow to decouple specific user inputs from game/business logic. Inputs (keyboard, mouse/touch, controllers, on‑screen UI) are converted by action bindings into actions that game systems consume on every frame or whenever an event happens to act upon the action.

- **Input → Action Binding → Action → Effect**
  - Input: hardware or UI event (key, mouse move, touch, thumbstick, button)
  - Action Binding: translates that input into a domain signal
  - Action: a shared signal (event or state) consumed by systems
  - Effect: the game changes on frame (e.g., camera rotates, character moves, jumps)

## State vs. Event actions

- **StateAction&lt;T&gt;**
  - Represents a continuous state that persists until changed (e.g., movement axes, “is running”).
  - Merges multiple writers (e.g., keyboard + joystick) into one value each frame.
  - Read anywhere via `.get()`.

- **EventAction&lt;T&gt;**
  - Represents instantaneous events (e.g., “jump pressed”, “rotate delta”, “zoom delta”).
  - Produces values per frame via a reader; values are combined (sum, etc.) before consumption.

For example, the CharacterCameraBehavior consumes rotation and zoom event actions, which are StateActions, every frame. The StateAction returns the final value as an accumulation of all the inputs since the last frame.

## Built-in actions:

- Movement: `MoveForwardAction`, `MoveBackwardAction`, `MoveLeftAction`, `MoveRightAction`, `RunAction` (State)
- Jumping: `JumpAction` (Event)
- Camera: `RotateYawAction`, `RotatePitchAction`, `ZoomAction` (Event)

## Built-in action bindings

- Keyboard locomotion: `useKeyboardLocomotionActionBindings(...)`
- Mouse/touch camera (pointer capture): `usePointerCaptureRotateZoomActionBindings(...)`
- Mouse camera (pointer lock): `usePointerLockRotateZoomActionBindings(...)`
- Single key/button bindings: `useKeyboardActionBinding(...)`, `usePointerButtonActionBinding(...)`
- Mobile UI: `useScreenJoystickLocomotionActionBindings(...)`, `useScreenButton(...)`

These hooks connect hardware inputs to actions. Multiple bindings can feed the same action; values are safely merged.

## Example: Rotate the camera with the mouse (Pointer Lock)

*This shows the full pipeline: mouse movement → pointer-lock binding → rotation actions → camera rotates on frame.*

<!-- Sandpack/Sandbox replaced: inline code and dependencies -->
Dependencies:

```js
{
      'three': 'latest',
      '@react-three/fiber': '<9',
      '@react-three/viverse': 'latest',
      '@react-three/drei': '<10'
    }
```

Files:

File: /App.tsx

```tsx
import { Canvas } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import {
  Viverse,
  SimpleCharacter,
  BvhPhysicsBody,
  PrototypeBox,
  usePointerLockRotateZoomActionBindings,
} from '@react-three/viverse'

function Bindings() {
  // Binds mouse movement (while pointer is locked) to RotateYawAction/RotatePitchAction,
  // and mouse wheel to ZoomAction. The camera behavior consumes these every frame.
  usePointerLockRotateZoomActionBindings({ lockOnClick: true })
  return null
}

export default function App() {
  return (
    <Canvas
      style={{ position: 'absolute', inset: '0', touchAction: 'none' }}
      camera={{ fov: 90, position: [0, 2, 2] }}
      shadows
    >
      <Viverse>
        <Sky />
        <directionalLight intensity={1.2} position={[5, 10, 10]} castShadow />
        <ambientLight intensity={1} />

        {/* SimpleCharacter includes a default camera behavior that reads rotation + zoom actions */}
        <SimpleCharacter actionBindings={[]} />
        <Bindings />

        <BvhPhysicsBody>
          <PrototypeBox color="#ffffff" scale={[10, 0.5, 10]} position={[0, -2, 0]} />
          <PrototypeBox color="#cccccc" scale={[2, 1, 3]} position={[4, 0, 0]} />
          <PrototypeBox color="#ffccff" scale={[3, 1, 3]} position={[3, 1.5, -1]} />
        </BvhPhysicsBody>
      </Viverse>
    </Canvas>
  )
}

```


Click the canvas once to lock the pointer. Move the mouse to rotate the camera; use the mouse wheel to zoom. That’s the actions pipeline in action.

## Example: Map Q/E keys to camera yaw rotation

You can also route keyboard inputs into camera rotation by mapping `KeyboardEvent` to yaw deltas and binding them to the same `RotateYawAction`.

```tsx
import { useKeyboardActionBinding } from '@react-three/viverse'
import { RotateYawAction } from '@react-three/viverse'

function KeyboardYawBindings() {
  // Map KeyboardEvent → number (negative = left, positive = right)
  const rotateFromKeyboard = RotateYawAction.mapFrom((e: KeyboardEvent) => {
    if (e.code === 'KeyQ') return -0.02
    if (e.code === 'KeyE') return  0.02
    return 0
  })
  // Bind Q/E key presses to the mapped action
  useKeyboardActionBinding(rotateFromKeyboard, { keys: ['KeyQ', 'KeyE'] })
  return null
}
```

Place `<KeyboardYawBindings />` alongside your other bindings. Now both mouse and keys contribute to `RotateYawAction`; their values are combined before the camera consumes them each frame.

## Example: Keyboard locomotion and jump

To bind classic WASD + Shift + Space to movement and jump, use the built-in locomotion bindings:

```tsx
import { useKeyboardLocomotionActionBindings } from '@react-three/viverse'

function LocomotionBindings() {
  useKeyboardLocomotionActionBindings({
    requiresPointerLock: false, // set to true if you want movement only when pointer is locked
  })
  return null
}
```

These bindings write to:
- `MoveForwardAction`, `MoveBackwardAction`, `MoveLeftAction`, `MoveRightAction` (State: 0..1)
- `RunAction` (State: boolean)
- `JumpAction` (Event)

Your character controller (e.g., `SimpleCharacter`) reads these to move and animate on frame, regardless of the input device that produced them.

## Takeaways

- **Decouple input from gameplay**: actions provide a stable interface your systems consume.
- **Compose inputs**: multiple bindings can feed the same action; values merge predictably.
- **Think “signals,” not devices**: code against actions like “move forward” or “yaw delta,” not specific keys or hardware.

<!-- From: tutorials/custom-character-controller.mdx -->
<a id="doc-tutorials-custom-character-controller"></a>
# Custom Character Controller

In this tutorial, you’ll build a custom extensible humanoid character controller in a fortnite style with support for aim, shoot, reload, run, and jump, using `@react-three/viverse` and `@react-three/timeline`.

## What you’ll build

- Third-person character with physics and camera behavior
- WASD movement, run, jump, mouse look (pointer lock)
- Aiming up/forward/down with upper-body blending
- Pistol idle/shoot/reload with sound and muzzle flash
- Camera FOV and zoom effects while running/aiming
- Map collisions using a BVH physics body
- Simple HUD with name, health bar, ammo, and crosshair

## Prereqs and install

Use pnpm and ensure these packages are installed. VRM support is optional but recommended for humanoids.

```bash
pnpm add three @react-three/fiber @react-three/drei @react-three/timeline @react-three/viverse zustand
```

## Step 1 — App shell (scene, provider, UI)

First, we start by copying all the assets, we'll need from this repository under `examples/fortnite/public` into your public folder. For animations, we are using the [Universal Animation Library - Pro](https://quaternius.com/packs/universalanimationlibrary.html) from Quaternius. If you want to use these animations for your project, please make sure to buy the Pro version at their website.

Next, we start adding a `<Canvas>` and `<Viverse>` component, a environment that includes a sky, clouds, fog, lights, a HUD overlay, the character, and the map. In the next steps, we will create the `Map`, `Character`, and `HUD` components. We use `<Viverse>` up front so profile features, shared actions, and integrations are available everywhere; you could delay it, but then you’d pass more props around later.

Key ideas:

- **Provider**: `<Viverse>` enables account/profile APIs and shared actions/state.
- **Suspense Fallback**: Show a simple “Loading...” UI.
- **Environment**: `Sky`, `Clouds`, `directionalLight` with shadows.
- **Composition**: `<Character />` and `<Map />` live inside the canvas.

Add the following snippet into your `src/app.tsx`:

```tsx
return (
  <Viverse clientId={import.meta.env.VITE_VIVERSE_APP_ID}>
    <HUD />
    <Canvas style={{ width: '100%', flexGrow: 1 }} shadows gl={{ antialias: true, localClippingEnabled: true }}>
      <fog attach="fog" args={[0xd3e1ec]} near={12} far={60} />
      <Sky rayleigh={0.2} turbidity={0.6} sunPosition={[9.2, 9, 5]} />
      <Suspense fallback={null}>
        <Clouds material={MeshBasicMaterial}>
          <Cloud position-y={40} segments={40} bounds={[50, 1, 50]} volume={20} color="gray" />
          <Cloud position-y={60} segments={40} bounds={[20, 5, 20]} volume={20} color="gray" />
        </Clouds>
        <directionalLight /* with shadows */ />
        <ambientLight intensity={1} />
        <Character />
        <Map />
      </Suspense>
    </Canvas>
  </Viverse>
)
```

## Step 2 — Map and collisions

Create `src/map.tsx` and add the full component below. It loads the map, enables collisions via `BvhPhysicsBody`, and tweaks the ground material to receive shadows properly.

```tsx
export function Map() {
  const [map, setMap] = useState<Group | null>(null)
  useEffect(
    () =>
      map?.traverse(
        (object) =>
          object.name === 'Plane' &&
          object instanceof Mesh &&
          ((object.receiveShadow = true),
          (object.material = new MeshStandardMaterial({
            roughness: 1,
            metalness: 0,
            map: (object.material as MeshStandardMaterial).map,
          }))),
      ),
    [map],
  )
  return (
    <BvhPhysicsBody>
      <Gltf ref={setMap} scale={0.3} src="map.glb" />
    </BvhPhysicsBody>
  )
}
```

Notes:

- Wrapping the map in `BvhPhysicsBody` builds a BVH acceleration structure, necessary for performing collision detections.
- We set `receiveShadow = true` on the ground mesh and re-create the material to ensure proper PBR/shadowing with the embedded base color map.
- Keep your `map.glb` in `public/` so it’s served statically by Vite.
- If you wonder why we load via `src="map.glb"` instead of `import`, it keeps asset paths simple for Vite and mirrors how the rest of the example serves content.

## Step 3 — The Character component

Next, we create the `Character` component, which uses a VRM model (`avatar.vrm`), displays the pistol attached to the right hand (`pistol.glb`), adds animations (jogging, aiming, pistol actions), and sets up audio and visual effects. We prefer VRM for humanoids because it standardizes bone names (handy for retargeting); plain glTF works too if your bone names match the `boneMap`.

Before creating the component, we need to create several custom actions, specifically reloading, shooting, and aiming actions outside of the character component.

```tsx
export const ReloadAction = new EventAction()
export const ShootAction = new EventAction()
export const AimAction = new StateAction<boolean>(BooleanOr, false)
```

Next, we create the character component and start by loading the character model and setting its height to the spawn height.

```tsx
const model = useCharacterModelLoader({ castShadow: true, url: 'avatar.vrm' })
useEffect(() => void (model.scene.position.y = 70), [model])
```

We set the spawn height once so the character drops onto the level instead of intersecting it. Next, we set up physics on the character and apply the movement actions to the physics. We use the built-in helper rather than writing raw velocity math to keep input → motion deterministic and consistent with other examples.

```tsx
const physics = useBvhCharacterPhysics(model.scene)
useFrame((state) => updateSimpleCharacterVelocity(state.camera, physics))
```

Then, we bind all actions to the inputs (keyboard and mouse). Notice, that we have not yet added a camera behavior or used the custom actions, so even though they are bound, they have no effect yet.

```tsx
// action bindings
usePointerLockRotateZoomActionBindings()
useKeyboardLocomotionActionBindings({ requiresPointerLock: true })
useKeyboardActionBinding(ReloadAction, { keys: ['KeyR'], requiresPointerLock: true })
usePointerButtonActionBinding(ShootAction, { buttons: [0], requiresPointerLock: true })
usePointerButtonActionBinding(AimAction, { buttons: [2], requiresPointerLock: true })
```

Render the character and attach the pistol so you can already walk around. We will create the animation components, specifically `LowerBodyAnimation`, `SpineAnimation`, `UpperBodyAimAnimation`, `UpperBodyAdditiveAnimation` later.

```tsx
<CharacterModelProvider model={model}>
  <LowerBodyAnimation physics={physics} />
  <SpineAnimation />
  <UpperBodyAimAnimation />
  <UpperBodyAdditiveAnimation />
  {/* pistol and model */}
  <CharacterModelBone bone="rightHand">
    <Gltf scale={0.13} position={[0.1, -0.03, 0]} rotation-x={-Math.PI / 2} src="pistol.glb" />
  </CharacterModelBone>
  <primitive object={model.scene} />
</CharacterModelProvider>
```

## Step 3.1 — Create ammo store

We’ll track ammo with a tiny Zustand store so reload/shoot actions can update it and the HUD can display it.

Add this for example in `src/app.tsx` or in a small `src/state.ts` file:

```tsx
import { create } from 'zustand'

export const useAmmo = create(() => ({ ammo: 12 }))
```

## Step 4 — Camera behavior and rotation sync

We use the character camera behavior and keep the character’s yaw aligned with the camera. Using the provided behavior avoids re‑implementing orbit/zoom/offset logic; if you need full control later, you can swap it for your own.

```tsx
const cameraBehaviorRef = useCharacterCameraBehavior(model.scene, {
  zoom: { speed: 0 },
  characterBaseOffset: [0.5, 1.3, 0],
})

// character rotation matches camera Y
useFrame((state) => (model.scene.rotation.y = state.camera.rotation.y))
```

## Step 5 — Camera effects: FOV while running, zoom while aiming

Two small hooks manage the cinematic feel. We apply gentle, framerate‑independent easing to avoid jarring changes:

**FOV while running**: When `RunAction` is active, we increase the camera’s field of view (from 60 → 75) to convey speed. We use exponential smoothing (`t = 1 - exp(-k * delta)`) so the transition feels responsive yet stable at any framerate. After changing `fov`, we call `updateProjectionMatrix()` to apply it.

```tsx
function useCameraFovControl() {
  useFrame((state, delta) => {
    if ('fov' in state.camera) {
      const targetFov = RunAction.get() ? 75 : 60
      const t = 1 - Math.exp(-10 * delta)
      state.camera.fov += (targetFov - state.camera.fov) * t
      state.camera.updateProjectionMatrix?.()
    }
  })
}
```

**Zoom while aiming**: We adjust the `CharacterCameraBehavior`’s `zoomDistance` (2.0 → 0.7) while the `AimAction` is active. This narrows composition around the crosshair and subtly reduces parallax. We use a slightly faster smoothing constant for snappier aim‑down‑sights behavior.

```tsx
function useAimZoomControl(behaviorRef: RefObject<CharacterCameraBehavior | undefined>) {
  useFrame((_state, delta) => {
    const behavior = behaviorRef.current
    if (behavior == null) return
    const targetDistance = AimAction.get() ? 0.7 : 2.0
    const t = 1 - Math.exp(-20 * delta)
    behavior.zoomDistance += (targetDistance - behavior.zoomDistance) * t
  })
}
```

## Step 6 — Bone map and masks

We provide a bone map for retargeting and define a mask for “upper body without spine”.

Why exclude the spine?

- We manually control the spine rotation in Step 8 to keep the torso aiming consistently forward inline with the cross-hair. If the aim layer also animated the spine, it would fight our manual rotation.
- Therefore, the “upper body without spine” mask includes shoulders, arms, hands, chest, etc., but excludes the spine so we can drive it explicitly.
- And because rigs vary, the `boneMap` lets us translate from your model’s bone names to VRM’s, so timeline clips target the right joints.

```ts
export const upperBodyWithoutSpine = (name: VRMHumanBoneName) => upperBody(name) && name !== 'spine'
export const boneMap: Record<string, VRMHumanBoneName> = {
  'DEF-hips': 'hips',
  'DEF-spine001': 'spine',
  // ... full mapping in file
}
```

## Step 7 — Lower-body locomotion and jumping

For the lower body, which represents the character’s movement and jumping, we blend eight move directions plus idle, then add a jump state machine. This uses `@react-three/timeline` graphs and viverse helpers.

Concepts:

- Compute normalized input direction from actions.
- Scale animation speed when running.
- Jump state machine: start → loop → land → move.

Create `src/lower-body-animation.tsx`. We’ll build it in small parts so each piece is clear and easy to place. This timeline approach keeps animation state readable and composable, compared to ad‑hoc `useFrame` toggles.

1. Setup: compute input direction and time scaling

We convert the action values into a normalized 2D direction (for selecting locomotion clips) and speed up locomotion when running.

```tsx
export function LowerBodyAnimation({ physics }) {
  const normalizedDirection = useMemo(() => new Vector2(), [])
  useFrame(() =>
    normalizedDirection
      .set(MoveRightAction.get() - MoveLeftAction.get(), MoveForwardAction.get() - MoveBackwardAction.get())
      .normalize(),
  )

  const forwardRef = useRef(null)
  const backwardRef = useRef(null)
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const forwardRightRef = useRef(null)
  const forwardLeftRef = useRef(null)
  const backwardRightRef = useRef(null)
  const backwardLeftRef = useRef(null)

  useFrame(() => {
    const timeScale = RunAction.get() ? 2 : 1
    for (const ref of [
      forwardRef,
      backwardRef,
      leftRef,
      rightRef,
      forwardRightRef,
      forwardLeftRef,
      backwardRightRef,
      backwardLeftRef,
    ]) {
      ref.current && (ref.current.timeScale = timeScale)
    }
  })
  // ...
}
```

2. Timeline scaffold and movement state (add this inside the return)

We use a small timeline graph:

- `RunTimeline` evaluates the timeline every frame.
- `CharacterAnimationLayer` groups animation actions for a specific body region.
- `Graph` declares states and transitions.
- `GrapthState` is a named state node with transition rules.

```tsx
return (
  <RunTimeline>
    <CharacterAnimationLayer name="lower-body">
      <Graph enterState="move">
        <GrapthState
          name="move"
          transitionTo={{
            jumpStart: { whenUpdate: () => shouldJump(physics, lastJumpTimeRef.current) },
            jumpLoop: { whenUpdate: () => !physics.isGrounded },
          }}
        >
          {/* Add the directional Switch in substep 2a below */}
        </GrapthState>
        {/* jump states below */}
      </Graph>
    </CharacterAnimationLayer>
  </RunTimeline>
)
```

2a) Directional clip selection (Switch)

Inside the `move` state, we select one of eight directional clips plus idle based on the normalized input. The `scaleTime` values are tuned so diagonals feel consistent with straight movement.

```tsx
<Switch>
  <SwitchCase index={0} condition={() => Math.abs(normalizedDirection.x) < 0.5 && normalizedDirection.y > 0.5}>
    <CharacterAnimationAction
      mask={lowerBody}
      sync
      scaleTime={1.5}
      boneMap={boneMap}
      ref={forwardRef}
      url="jog-forward.glb"
    />
  </SwitchCase>
  <SwitchCase index={1} condition={() => normalizedDirection.x > 0.5 && normalizedDirection.y > 0.5}>
    <CharacterAnimationAction
      mask={lowerBody}
      sync
      scaleTime={1.5}
      boneMap={boneMap}
      ref={forwardRightRef}
      url="jog-forward-right.glb"
    />
  </SwitchCase>
  <SwitchCase index={2} condition={() => normalizedDirection.x > 0.5 && Math.abs(normalizedDirection.y) < 0.5}>
    <CharacterAnimationAction
      mask={lowerBody}
      sync
      scaleTime={0.9}
      boneMap={boneMap}
      ref={rightRef}
      url="jog-right.glb"
    />
  </SwitchCase>
  <SwitchCase index={3} condition={() => normalizedDirection.x > 0.5 && normalizedDirection.y < -0.5}>
    <CharacterAnimationAction
      mask={lowerBody}
      sync
      scaleTime={1.3}
      boneMap={boneMap}
      ref={backwardRightRef}
      url="jog-backward-right.glb"
    />
  </SwitchCase>
  <SwitchCase index={4} condition={() => Math.abs(normalizedDirection.x) < 0.5 && normalizedDirection.y < -0.5}>
    <CharacterAnimationAction
      mask={lowerBody}
      sync
      scaleTime={1.4}
      boneMap={boneMap}
      ref={backwardRef}
      url="jog-backward.glb"
    />
  </SwitchCase>
  <SwitchCase index={5} condition={() => normalizedDirection.x < -0.5 && normalizedDirection.y < -0.5}>
    <CharacterAnimationAction
      mask={lowerBody}
      sync
      scaleTime={1.3}
      boneMap={boneMap}
      ref={backwardLeftRef}
      url="jog-backward-left.glb"
    />
  </SwitchCase>
  <SwitchCase index={6} condition={() => normalizedDirection.x < -0.5 && Math.abs(normalizedDirection.y) < 0.5}>
    <CharacterAnimationAction
      mask={lowerBody}
      sync
      scaleTime={0.9}
      boneMap={boneMap}
      ref={leftRef}
      url="jog-left.glb"
    />
  </SwitchCase>
  <SwitchCase index={7} condition={() => normalizedDirection.x < -0.5 && normalizedDirection.y > 0.5}>
    <CharacterAnimationAction
      mask={lowerBody}
      sync
      scaleTime={1.5}
      boneMap={boneMap}
      ref={forwardLeftRef}
      url="jog-forward-left.glb"
    />
  </SwitchCase>
  <SwitchCase index={8}>
    <CharacterAnimationAction mask={lowerBody} url={IdleAnimationUrl} />
  </SwitchCase>
</Switch>
```

3. Jump states

Jumping splits into short phases so we can apply upward velocity once, loop while airborne, and land smoothly when grounded again.

```tsx
const lastJumpTimeRef = useRef(0)

/* place inside <Graph> after the "move" state */
<GrapthState name="jumpStart" transitionTo={{ jumpDown: { whenUpdate: () => !physics.isGrounded }, finally: 'jumpUp' }}>
  <CharacterAnimationAction
    until={() => timePassed(0.2, 'seconds')}
    update={() => void physics.inputVelocity.multiplyScalar(0.3)}
    mask={lowerBody}
    paused
    url={JumpUpAnimationUrl}
  />
</GrapthState>
<GrapthState name="jumpLoop" transitionTo={{ jumpDown: { whenUpdate: () => physics.isGrounded } }}>
  <CharacterAnimationAction mask={lowerBody} url={JumpLoopAnimationUrl} />
</GrapthState>
<GrapthState
  name="jumpUp"
  transitionTo={{
    jumpDown: { whenUpdate: (_, _clock, actionTime) => actionTime > 0.3 && physics.isGrounded },
    finally: 'jumpLoop',
  }}
>
  <CharacterAnimationAction
    loop={LoopOnce}
    mask={lowerBody}
    init={() => {
      lastJumpTimeRef.current = performance.now() / 1000
      physics.applyVelocity(new Vector3(0, 8, 0))
    }}
    url={JumpUpAnimationUrl}
  />
</GrapthState>
<GrapthState name="jumpDown" transitionTo={{ finally: 'move' }}>
  <CharacterAnimationAction
    mask={lowerBody}
    until={() => timePassed(150, 'milliseconds')}
    loop={LoopOnce}
    url={JumpDownAnimationUrl}
  />
</GrapthState>
```

## Step 8 — Spine: keep upright and match camera yaw

Create `src/spine-animation.tsx`. Add these parts:

1. Resolve the spine bone once

We cache the lowest upper‑body bone so updates are fast and don’t require repeated lookups.

```tsx
export function SpineAnimation() {
  const model = useCharacterModel()
  const spineBone = useMemo(() => {
    // VRM or plain glTF
    return model instanceof VRM ? model.humanoid.getNormalizedBoneNode('spine') : model.scene.getObjectByName('spine')
  }, [model])
  // ...
}
```

2. Align the spine each frame (keep upright, match camera yaw)

The spine should stay upright and rotate only around Y to match camera yaw; this keeps the torso aligned with aim and avoids double transforms.

```tsx
const eulerYXZ = new Euler(0, 0, 0, 'YXZ')
const qWorld = new Quaternion()
const qParentWorldInv = new Quaternion()
const qLocal = new Quaternion()
const cameraRotationOffsetY = -0.5

useFrame((state) => {
  if (spineBone == null) return
  state.camera.getWorldQuaternion(qWorld)
  eulerYXZ.setFromQuaternion(qWorld, 'YXZ')
  const cameraYaw = eulerYXZ.y + (model instanceof VRM ? 0 : Math.PI) + cameraRotationOffsetY
  eulerYXZ.set(0, cameraYaw, 0, 'YXZ')
  qWorld.setFromEuler(eulerYXZ)
  const parent = spineBone.parent
  if (parent != null) {
    parent.getWorldQuaternion(qParentWorldInv).invert()
    qLocal.copy(qParentWorldInv).multiply(qWorld)
    spineBone.quaternion.copy(qLocal)
  } else {
    spineBone.quaternion.copy(qWorld)
  }
  spineBone.updateMatrixWorld()
})
```

## Step 9 — Aim up/forward/down blending

Create `src/upper-body-aim-animation.tsx`. Add these parts:

1. Weight aim clips by camera pitch

We blend “up/forward/down” by the camera’s pitch so the upper body points toward where you look. Using three focused clips keeps pose fidelity better than stretching a single generic clip. We also introduce `Parallel`, which plays its children at the same time—we’ll reuse it for simultaneous clip layers and effects.

```tsx
export function UpperBodyAimAnimation() {
  const aimUpRef = useRef(null)
  const aimForwardRef = useRef(null)
  const aimDownRef = useRef(null)

  useFrame((state) => {
    if (!aimUpRef.current || !aimForwardRef.current || !aimDownRef.current) return
    const pitch = -state.camera.rotation.x
    if (pitch <= 0) {
      aimUpRef.current.weight = Math.min(1, Math.max(0, -pitch / (Math.PI / 2)))
      aimForwardRef.current.weight = 1 - aimUpRef.current.weight
      aimDownRef.current.weight = 0
    } else {
      aimDownRef.current.weight = Math.min(1, Math.max(0, pitch / (Math.PI / 2)))
      aimForwardRef.current.weight = 1 - aimDownRef.current.weight
      aimUpRef.current.weight = 0
    }
  })
  // ...
}
```

2. Layer the three aim clips (mask excludes the spine)

We play all three clips together and only change their weights; the mask excludes the spine to avoid conflicts with our manual spine rotation.

```tsx
return (
  <RunTimeline>
    <Parallel type="all">
      <CharacterAnimationLayer name="aim">
        <CharacterAnimationAction
          boneMap={boneMap}
          mask={upperBodyWithoutSpine}
          url="aim-up.glb"
          crossFade={false}
          ref={aimUpRef}
        />
        <CharacterAnimationAction
          boneMap={boneMap}
          mask={upperBodyWithoutSpine}
          url="aim-forward.glb"
          ref={aimForwardRef}
        />
        <CharacterAnimationAction
          boneMap={boneMap}
          mask={upperBodyWithoutSpine}
          url="aim-down.glb"
          crossFade={false}
          ref={aimDownRef}
        />
      </CharacterAnimationLayer>
    </Parallel>
  </RunTimeline>
)
```

## Step 10 — Additive upper-body: idle, shoot, reload, audio, muzzle flash

Create `src/upper-body-additive-animation.tsx`. Add these parts:

1. Attach muzzle flash and audio under the right hand

Audio and flash sit where the muzzle is, so sounds and visuals feel spatially correct. Notice, that the sound only plays when we execute `.play()` on the attached ref.

```tsx
<CharacterModelBone bone="rightHand">
  <group position={[0.3, 0, -0.1]}>
    <PositionalAudio ref={reloadAudioRef} loop={false} url="pistol-reload-sound.mp3" />
    <PositionalAudio ref={muzzleFlashAudioRef} loop={false} url="pistol-shoot-sound.mp3" />
    <Billboard scale={0.4}>
      <mesh visible={false} ref={muzzleFlashVisualRef}>
        <planeGeometry />
        <meshBasicMaterial color="#ffcc88" transparent opacity={0.7} map={muzzleflashTexture} />
      </mesh>
    </Billboard>
  </group>
</CharacterModelBone>
```

2. Timeline for idle → reload/shoot transitions (additive layer)

An additive layer lets us overlay weapon actions on top of locomotion/aim; timeline transitions keep behavior deterministic and easy to expand.

```tsx
<RunTimeline>
  <CharacterAnimationLayer name="upper-body">
    <Graph enterState="idle">
      <GrapthState
        name="idle"
        transitionTo={{
          reload: { whenPromise: () => ReloadAction.waitFor() },
          shoot: {
            whenPromise: async () => {
              await ShootAction.waitFor()
              if (useAmmo.getState().ammo === 0) await new Promise(() => {})
            },
          },
        }}
      >
        <AdditiveCharacterAnimationAction
          referenceClip={{ url: 'aim-forward.glb' }}
          url="pistol-idle.glb"
          boneMap={boneMap}
          mask={upperBodyWithoutSpine}
        />
      </GrapthState>
      <GrapthState name="reload" transitionTo={{ finally: 'idle' }}>
        <AdditiveCharacterAnimationAction
          referenceClip={{ url: 'aim-forward.glb' }}
          boneMap={boneMap}
          loop={LoopOnce}
          init={() => {
            reloadAudioRef.current?.play(0.3)
            useAmmo.setState({ ammo: 12 })
          }}
          mask={upperBodyWithoutSpine}
          scaleTime={0.5}
          url="pistol-reload.glb"
        />
      </GrapthState>
      <GrapthState name="shoot" transitionTo={{ finally: 'idle' }}>
        <Parallel type="all">
          <Action
            update={(state) => {
              const jitter = 0.01
              state.camera.rotation.set(
                state.camera.rotation.x + (Math.random() - 0.5) * jitter,
                state.camera.rotation.y + (Math.random() - 0.5) * jitter,
                0,
              )
            }}
            until={() => timePassed(0.11, 'seconds')}
          />
          <Action
            init={() => {
              useAmmo.setState({ ammo: useAmmo.getState().ammo - 1 })
              muzzleFlashAudioRef.current?.stop()
              muzzleFlashAudioRef.current?.play()
              if (muzzleFlashVisualRef.current) {
                muzzleFlashVisualRef.current.visible = true
                return () => (muzzleFlashVisualRef.current!.visible = false)
              }
            }}
            until={() => timePassed(0.07, 'seconds')}
          />
          <AdditiveCharacterAnimationAction
            referenceClip={{ url: 'aim-forward.glb' }}
            boneMap={boneMap}
            loop={LoopOnce}
            mask={upperBodyWithoutSpine}
            fadeDuration={0}
            scaleTime={0.5}
            url="pistol-shoot.glb"
          />
        </Parallel>
      </GrapthState>
    </Graph>
  </CharacterAnimationLayer>
</RunTimeline>
```

The brief “jitter” recoil in the `shoot` state nudges the camera by a tiny random amount only while the state is active. Because the `Action` has an `until={() => timePassed(0.11,'seconds')}`, the shake starts exactly when the state begins and stops automatically, letting the regular camera behavior bring the view back smoothly (we keep roll at 0 to avoid unwanted tilt).

## Step 11 — HUD and crosshair

The HUD is plain React DOM absolutely positioned over the canvas. It reads the player profile and ammo, shows a health bar, and renders a minimal crosshair.

Highlights from `src/hud.tsx`:

```tsx
const { name } = useViverseProfile() ?? { name: 'Anonymous', activeAvatar: null }
const ammo = useAmmo((s) => s.ammo)
// ... name at top-left, health bar bottom-left, ammo bottom-right ...
// ... a simple crosshair (centered) composed of small divs ...
```

Create `src/hud.tsx` and add the full component. It overlays the canvas (no pointer events on the crosshair) and uses the same system font stack as the example.

```tsx
export function HUD() {
  const [health, setHealth] = useState(50)
  const ammo = useAmmo((s) => s.ammo)

  const { name } = useViverseProfile() ?? { name: 'Anonymous', activeAvatar: null }

  const percent = Math.max(0, Math.min(100, health))

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          color: '#fff',
          zIndex: 100000,
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: 2 }}>{name}</div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 28,
          left: 28,
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'rgba(0,0,0,0.2)',
          padding: '8px 12px',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 22, lineHeight: 1, transform: 'translate(0, -2px)' }}>+</div>
        <div
          style={{
            width: 260,
            height: 20,
            background: 'rgba(255,255,255,0.3)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              background: 'linear-gradient(90deg,rgb(31, 224, 102), #2dbb5f)',
            }}
          />
        </div>
        <div style={{ fontWeight: 800, fontSize: 18, minWidth: 36, textAlign: 'right' }}>{Math.round(health)}</div>
      </div>

      <div
        style={{
          zIndex: 100000,
          position: 'absolute',
          bottom: 28,
          right: 28,
          color: '#fff',
          textAlign: 'right',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4, fontWeight: 700 }}>AMMO</div>
        <div style={{ fontWeight: 800, fontSize: 38 }}>
          {ammo}
          <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 'normal' }}>/ 12</span>
        </div>
      </div>

      {/* Crosshair */}
      <div
        style={{
          zIndex: 100000,
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      >
        {/* center dot */}
        <div
          style={{
            position: 'absolute',
            width: 2,
            height: 2,
            borderRadius: 1,
            background: 'rgba(255,255,255,0.55)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
            transform: 'translate(-1px, -1px)',
          }}
        />
        {/* top line */}
        <div
          style={{
            position: 'absolute',
            left: -1,
            top: -22,
            width: 2,
            height: 8,
            borderRadius: 1,
            background: 'rgba(255,255,255,0.55)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
          }}
        />
        {/* bottom line */}
        <div
          style={{
            position: 'absolute',
            left: -1,
            top: 14,
            width: 2,
            height: 8,
            borderRadius: 1,
            background: 'rgba(255,255,255,0.55)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
          }}
        />
        {/* left line */}
        <div
          style={{
            position: 'absolute',
            top: -1,
            left: -22,
            width: 8,
            height: 2,
            borderRadius: 1,
            background: 'rgba(255,255,255,0.55)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
          }}
        />
        {/* right line */}
        <div
          style={{
            position: 'absolute',
            top: -1,
            left: 14,
            width: 8,
            height: 2,
            borderRadius: 1,
            background: 'rgba(255,255,255,0.55)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
          }}
        />
      </div>
    </>
  )
}
```

At this point your project should behave exactly like `examples/fortnite`. If anything does not work, compare your project with the files in `examples/fortnite`.

<!-- From: tutorials/remove-viverse-integrations.mdx -->
<a id="doc-tutorials-remove-viverse-integrations"></a>
# Remove VIVERSE Integrations

To remove the VIVERSE integrations replace the `<Viverse>` component with `<BvhPhysicsWorld>` and remove all VIVERSE-specific hooks from your components as these hooks will no longer work without the VIVERSE context.

<!-- Sandpack/Sandbox replaced: inline code and dependencies -->
Dependencies:

```js
{
      'three': 'latest',
      '@react-three/fiber': '<9',
      '@react-three/viverse': 'latest',
      '@react-three/drei': '<10'
    }
```

Files:

File: /App.tsx

```tsx
import { Sky } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { BvhPhysicsWorld, SimpleCharacter, BvhPhysicsBody, PrototypeBox } from '@react-three/viverse'

export default function App() {
  return (
    <Canvas shadows style={{ position: "absolute", inset: "0", touchAction: "none" }}>
      <BvhPhysicsWorld>
        <Sky />
        <directionalLight intensity={1.2} position={[-10, 10, -10]} castShadow />
        <ambientLight intensity={1} />
        <SimpleCharacter />
        <BvhPhysicsBody>
          <PrototypeBox scale={[10, 1, 15]} position={[0, -0.5, 0]} />
        </BvhPhysicsBody>
      </BvhPhysicsWorld>
    </Canvas>
  )
}
```

