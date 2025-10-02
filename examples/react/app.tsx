import { Gltf, Sky } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Root, Image, Text, Fullscreen } from '@react-three/uikit'
import {
  SimpleCharacter,
  BvhPhysicsBody,
  useViverseProfile,
  Viverse,
  CharacterModelBone,
  PrototypeBox,
  BvhPhysicsSensor,
} from '@react-three/viverse'
import { Suspense, useRef, useState } from 'react'
import { Group, Object3D } from 'three'

export function App() {
  return (
    <Viverse clientId={import.meta.env.VITE_VIVERSE_APP_ID}>
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
          <Fullscreen alignItems="flex-end" justifyContent="flex-end" padding={32}>
            <Image src="viverse-logo.png" height={64} />
          </Fullscreen>
          <Scene />
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
  const swordRef = useRef<Group>(null)
  useFrame((_, delta) => {
    if (swordRef.current == null) {
      return
    }
    swordRef.current.rotation.y += delta * 1
  })
  const [hasSword, setHasSword] = useState(false)
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
      <SimpleCharacter ref={characterRef}>
        <PlayerTag />
        {hasSword && (
          <CharacterModelBone bone="rightHand">
            <Suspense>
              <Gltf
                scale={0.5}
                scale-y={0.65}
                position-y={-0.02}
                position-x={0.07}
                rotation-z={-(0.2 * Math.PI) / 2}
                rotation-x={-(1 * Math.PI) / 2}
                src="sword.gltf"
              />
            </Suspense>
          </CharacterModelBone>
        )}
      </SimpleCharacter>
      <BvhPhysicsBody>
        <PrototypeBox color="#cccccc" scale={[2, 1, 3]} position={[3.91, 0, 0]} />
        <PrototypeBox color="#ffccff" scale={[3, 1, 3]} position={[2.92, 1.5, -1.22]} />
        <PrototypeBox color="#ccffff" scale={[2, 0.5, 3]} position={[1.92, 2.5, -3.22]} />
        <PrototypeBox color="#ffccff" scale={[2, 1, 3]} position={[-2.92, 0, -2.22]} />
        <PrototypeBox color="#ccffff" scale={[1, 1, 4]} position={[0.08, -1, 0]} />
        <PrototypeBox color="#ffffcc" scale={[4, 1, 1]} position={[0.08, 3.5, 0]} />
        <PrototypeBox color="#ffffff" scale={[10, 0.5, 10]} position={[0.08, -2, 0]} />
      </BvhPhysicsBody>
      <group position-x={-1.3} position-y={4.6} rotation-z={Math.PI / 4} ref={swordRef}>
        {!hasSword && (
          <Suspense>
            <Gltf position-y={-0.3} scale={0.5} scale-y={0.65} src="sword.gltf" />
          </Suspense>
        )}
      </group>
      <group visible={false}>
        <BvhPhysicsSensor onIntersectedChanged={(intersected) => intersected && setHasSword(true)}>
          <mesh position-y={5} position-x={-1.3} scale-y={2}>
            <boxGeometry />
          </mesh>
        </BvhPhysicsSensor>
      </group>
    </>
  )
}

function PlayerTag() {
  const profile = useViverseProfile() ?? {
    name: 'Anonymous',
    activeAvatar: { headIconUrl: 'https://picsum.photos/200' },
  }
  const ref = useRef<Object3D>(null)
  useFrame((state) => {
    if (ref.current == null) {
      return
    }
    ref.current.quaternion.copy(state.camera.quaternion)
  })
  return (
    <group ref={ref} position-y={2.15}>
      <Root
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
