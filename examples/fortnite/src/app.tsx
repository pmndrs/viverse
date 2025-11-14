import { Cloud, Clouds, Gltf, Sky } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Image, Text, Fullscreen } from '@react-three/uikit'
import {
  Viverse,
  CharacterModelProvider,
  useCharacterModelLoader,
  useCharacterCameraBehavior,
  useBvhCharacterPhysics,
  CharacterModelBone,
  EventAction,
  StateAction,
  BooleanOr,
  updateSimpleCharacterVelocity,
  RunAction,
  useKeyboardActionBinding,
  usePointerButtonActionBinding,
  useKeyboardLocomotionActionBindings,
  usePointerLockRotateZoomActionBindings,
  CharacterCameraBehavior,
} from '@react-three/viverse'
import { RefObject, Suspense, useEffect } from 'react'
import { MeshBasicMaterial } from 'three'
import { create } from 'zustand'
import { HUD } from './hud.js'
import { LowerBodyAnimation } from './lower-body-animation.js'
import { Map } from './map.js'
import { SpineAnimation } from './spine-animation.js'
import { UpperBodyAdditiveAnimation } from './upper-body-additive-animation.js'
import { UpperBodyAimAnimation } from './upper-body-aim-animation.js'

//ammo state
export const useAmmo = create(() => ({ ammo: 12 }))

//custom actions
export const ReloadAction = new EventAction()
export const ShootAction = new EventAction()
export const AimAction = new StateAction<boolean>(BooleanOr, false)

export function App() {
  return (
    <Viverse clientId={import.meta.env.VITE_VIVERSE_APP_ID}>
      <HUD />
      <Canvas style={{ width: '100%', flexGrow: 1 }} shadows gl={{ antialias: true, localClippingEnabled: true }}>
        <fog attach="fog" args={[0xd3e1ec]} near={12} far={60} />
        <Sky rayleigh={0.2} turbidity={0.6} sunPosition={[9.2, 9, 5]} />
        <Suspense
          fallback={
            <Fullscreen alignItems="center" justifyContent="center">
              <Text paddingBottom={100}>Loading ...</Text>
            </Fullscreen>
          }
        >
          <Fullscreen alignItems="flex-end" justifyContent="flex-end" padding={32}>
            <Image src="viverse-logo.png" height={64} />
          </Fullscreen>
          <Clouds material={MeshBasicMaterial}>
            <Cloud position-y={40} segments={40} bounds={[50, 1, 50]} volume={20} color="gray" />
            <Cloud position-y={60} segments={40} bounds={[20, 5, 20]} volume={20} color="gray" />
          </Clouds>
          <directionalLight
            intensity={1.2}
            color="#ffccaa"
            position={[9.2, 9, 5]}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-left={-30}
            shadow-camera-right={30}
            shadow-camera-top={30}
            shadow-camera-bottom={-30}
          />
          <ambientLight intensity={1} />
          <Character />
          <Map />
        </Suspense>
      </Canvas>
    </Viverse>
  )
}
function Character() {
  //load model
  const model = useCharacterModelLoader({ castShadow: true, url: 'avatar.vrm' })
  //spawn position
  useEffect(() => void (model.scene.position.y = 70), [model])

  const physics = useBvhCharacterPhysics(model.scene)

  //action bindings:
  usePointerLockRotateZoomActionBindings()
  useKeyboardLocomotionActionBindings({ requiresPointerLock: true })
  useKeyboardActionBinding(ReloadAction, { keys: ['KeyR'], requiresPointerLock: true })
  usePointerButtonActionBinding(ShootAction, { buttons: [0], requiresPointerLock: true })
  usePointerButtonActionBinding(AimAction, { buttons: [2], requiresPointerLock: true })
  //apply the actions to the character physics movement (only movement not jumping) each frame
  useFrame((state) => updateSimpleCharacterVelocity(state.camera, physics))

  //character camera
  const cameraBehaviorRef = useCharacterCameraBehavior(model.scene, {
    zoom: { speed: 0 },
    characterBaseOffset: [0.5, 1.3, 0],
  })

  //character rotation matches camera rotation on y axis
  useFrame((state) => (model.scene.rotation.y = state.camera.rotation.y))

  // camera effects
  useCameraFovControl()
  useAimZoomControl(cameraBehaviorRef)

  return (
    <CharacterModelProvider model={model}>
      <LowerBodyAnimation physics={physics} />
      <SpineAnimation />
      <UpperBodyAimAnimation />
      <UpperBodyAdditiveAnimation />
      <CharacterModelBone bone="rightHand">
        <Gltf scale={0.13} position={[0.1, -0.03, 0]} rotation-x={-Math.PI / 2} src="pistol.glb" />
      </CharacterModelBone>
      <primitive object={model.scene} />
    </CharacterModelProvider>
  )
}

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

function useAimZoomControl(behaviorRef: RefObject<CharacterCameraBehavior | undefined>) {
  //since the camera position is controlled
  useFrame((_state, delta) => {
    const behavior = behaviorRef.current
    if (behavior == null) {
      return
    }
    const targetDistance = AimAction.get() ? 0.7 : 2.0
    const t = 1 - Math.exp(-20 * delta)
    behavior.zoomDistance += (targetDistance - behavior.zoomDistance) * t
  })
}
