import { Canvas, useFrame } from '@react-three/fiber'
import { SimpleCharacter, FixedBvhPhysicsBody, useViverseProfile, Viverse } from '@react-three/viverse'
import { Sky } from '@react-three/drei'
import { Root, Image, Text, Fullscreen } from '@react-three/uikit'
import { Suspense, useRef } from 'react'
import { Group } from 'three'
import { PrototypeBox, useXRControllerInput } from '@react-three/viverse'
import { DefaultXRController, XR, XROrigin, createXRStore, useXRInputSourceState } from '@react-three/xr'

const store = createXRStore({
  offerSession: 'immersive-vr',
  controller: {
    right: () => (
      <>
        <DefaultXRController />
        <PlayerTag />
      </>
    ),
  },
})

export function App() {
  return (
    <Viverse>
      <Canvas
        style={{ width: '100%', flexGrow: 1 }}
        camera={{ fov: 90, position: [0, 2, 2] }}
        shadows
        gl={{ antialias: true, localClippingEnabled: true }}
      >
        <Suspense
          fallback={
            <Fullscreen alignItems="center" justifyContent="center">
              <Text>Loading ...</Text>
            </Fullscreen>
          }
        >
          <XR store={store}>
            <Fullscreen alignItems="flex-end" justifyContent="flex-end" padding={32}>
              <Image src="viverse-logo.png" height={64} />
            </Fullscreen>
            <Scene />
          </XR>
        </Suspense>
      </Canvas>
    </Viverse>
  )
}

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
  const input = useXRControllerInput()
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
      <SimpleCharacter input={[input]} cameraBehavior={false} model={false} ref={characterRef}>
        <SnapRotateXROrigin />
      </SimpleCharacter>
      <FixedBvhPhysicsBody>
        <PrototypeBox color="#cccccc" scale={[2, 1, 3]} position={[3.91, 0, 0]} />
        <PrototypeBox color="#ffccff" scale={[3, 1, 3]} position={[2.92, 1.5, -1.22]} />
        <PrototypeBox color="#ccffff" scale={[2, 0.5, 3]} position={[1.92, 2.5, -3.22]} />
        <PrototypeBox color="#ffccff" scale={[2, 1, 3]} position={[-2.92, 0, -2.22]} />
        <PrototypeBox color="#ccffff" scale={[1, 1, 4]} position={[0.08, -1, 0]} />
        <PrototypeBox color="#ffffcc" scale={[4, 1, 1]} position={[0.08, 3.5, 0]} />
        <PrototypeBox color="#ffffff" scale={[10, 0.5, 10]} position={[0.08, -2, 0]} />
      </FixedBvhPhysicsBody>
    </>
  )
}

function SnapRotateXROrigin() {
  const ref = useRef<Group>(null)
  const rightController = useXRInputSourceState('controller', 'right')
  const prev = useRef(0)
  useFrame(() => {
    if (ref.current == null) {
      return
    }
    const current = Math.round(rightController?.gamepad?.['xr-standard-thumbstick']?.xAxis ?? 0)
    if (current < 0 && prev.current >= 0) {
      //rotate left
      ref.current.rotation.y += Math.PI / 2
    }
    if (current > 0 && prev.current <= 0) {
      //rotate right
      ref.current.rotation.y -= Math.PI / 2
    }
    prev.current = current
  })
  return <XROrigin ref={ref} />
}

function PlayerTag() {
  const profile = useViverseProfile() ?? {
    name: 'Anonymous',
    activeAvatar: { headIconUrl: 'https://picsum.photos/200' },
  }
  return (
    <group rotation-x={-Math.PI / 4} rotation-y={-Math.PI / 2} position-y={-0.1} position-z={0.1}>
      <Root
        pixelSize={0.0015}
        depthTest={false}
        renderOrder={1}
        backgroundOpacity={0.5}
        borderRadius={10}
        paddingX={2}
        height={20}
        backgroundColor="white"
        flexDirection="row"
        alignItems="center"
        gap={4}
      >
        <Image width={16} height={16} borderRadius={14} src={profile.activeAvatar?.headIconUrl} />
        <Text fontWeight="bold" fontSize={12} marginRight={3}>
          {profile.name}
        </Text>
      </Root>
    </group>
  )
}
