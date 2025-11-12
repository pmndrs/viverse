import { VRM } from '@pixiv/three-vrm'
import { Billboard, Gltf, PositionalAudio, Sky, useTexture } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Graph, GrapthState, Parallel, RunTimeline, Switch, SwitchCase, timePassed } from '@react-three/timeline'
import { Image, Text, Fullscreen } from '@react-three/uikit'
import {
  BvhPhysicsBody,
  Viverse,
  CharacterModelProvider,
  CharacterAnimationAction,
  useCharacterModelLoader,
  useCharacterCameraBehavior,
  Vanilla,
  useBvhCharacterPhysics,
  CharacterModelBone,
  useViverseProfile,
  CharacterAnimationLayer,
  AdditiveCharacterAnimationAction,
} from '@react-three/viverse'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AnimationAction,
  Euler,
  Group,
  LoopOnce,
  Mesh,
  MeshStandardMaterial,
  PositionalAudio as PositionalAudioImpl,
  Quaternion,
  Vector2,
  Vector3,
} from 'three'
import { create } from 'zustand'

const useAmmo = create(() => ({ ammo: 12 }))

export function App() {
  return (
    <Viverse clientId={import.meta.env.VITE_VIVERSE_APP_ID}>
      <FortniteHUD />
      <Canvas style={{ width: '100%', flexGrow: 1 }} shadows gl={{ antialias: true, localClippingEnabled: true }}>
        <fog attach="fog" args={[0xd3e1ec]} near={12} far={60} />
        <Sky azimuth={0.5} rayleigh={0.5} sunPosition={[-0.6, 26.7, -7.0]} />
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

const ReloadAction = new Vanilla.EventAction<void>()
const ShootAction = new Vanilla.EventAction<void>()
const AimAction = new Vanilla.StateAction<boolean>(Vanilla.BooleanOr, false)

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
  const [map, setMap] = useState<Group | null>(null)
  useEffect(
    () =>
      map?.traverse(
        (object) =>
          object.name === 'Plane' &&
          object instanceof Mesh &&
          (object.receiveShadow = true) &&
          (object.material = new MeshStandardMaterial({ map: object.material.map })),
      ),
    [map],
  )
  return (
    <>
      <directionalLight
        intensity={1.2}
        position={[-0.6, 26.7, -7.0]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <ambientLight intensity={1} />
      <Suspense fallback={null}>
        <Character />
      </Suspense>
      <Suspense fallback={null}>
        <BvhPhysicsBody>
          <Gltf ref={setMap} scale={0.3} src="map.glb" />
        </BvhPhysicsBody>
      </Suspense>
    </>
  )
}

const cameraRotationOffsetY = -0.5

const boneMap: Record<string, Vanilla.VRMHumanBoneName> = {
  'DEF-hips': 'hips',
  'DEF-spine001': 'spine',
  'DEF-spine002': 'chest',
  'DEF-spine003': 'upperChest',
  'DEF-neck': 'neck',
  'DEF-head': 'head',
  'DEF-shoulderL': 'leftShoulder',
  'DEF-upper_armL': 'leftUpperArm',
  'DEF-forearmL': 'leftLowerArm',
  'DEF-handL': 'leftHand',
  'DEF-thumb.01L': 'leftThumbMetacarpal',
  'DEF-thumb.02L': 'leftThumbProximal',
  'DEF-thumb.03L': 'leftThumbDistal',
  'DEF-f_index.01L': 'leftIndexProximal',
  'DEF-f_index.02L': 'leftIndexIntermediate',
  'DEF-f_index.03L': 'leftIndexDistal',
  'DEF-f_middle.01L': 'leftMiddleProximal',
  'DEF-f_middle.02L': 'leftMiddleIntermediate',
  'DEF-f_middle.03L': 'leftMiddleDistal',
  'DEF-f_ring.01L': 'leftRingProximal',
  'DEF-f_ring.02L': 'leftRingIntermediate',
  'DEF-f_ring.03L': 'leftRingDistal',
  'DEF-f_pinky.01L': 'leftLittleProximal',
  'DEF-f_pinky.02L': 'leftLittleIntermediate',
  'DEF-f_pinky.03L': 'leftLittleDistal',
  'DEF-shoulderR': 'rightShoulder',
  'DEF-upper_armR': 'rightUpperArm',
  'DEF-forearmR': 'rightLowerArm',
  'DEF-handR': 'rightHand',
  'DEF-thumb01R': 'rightThumbMetacarpal',
  'DEF-thumb02R': 'rightThumbProximal',
  'DEF-thumb03R': 'rightThumbDistal',
  'DEF-f_index01R': 'rightIndexProximal',
  'DEF-f_index02R': 'rightIndexIntermediate',
  'DEF-f_index03R': 'rightIndexDistal',
  'DEF-f_middle01R': 'rightMiddleProximal',
  'DEF-f_middle02R': 'rightMiddleIntermediate',
  'DEF-f_middle03R': 'rightMiddleDistal',
  'DEF-f_ring01R': 'rightRingProximal',
  'DEF-f_ring02R': 'rightRingIntermediate',
  'DEF-f_ring03R': 'rightRingDistal',
  'DEF-f_pinky01R': 'rightLittleProximal',
  'DEF-f_pinky02R': 'rightLittleIntermediate',
  'DEF-f_pinky03R': 'rightLittleDistal',
  'DEF-thighL': 'leftUpperLeg',
  'DEF-shinL': 'leftLowerLeg',
  'DEF-footL': 'leftFoot',
  'DEF-toeL': 'leftToes',
  'DEF-thighR': 'rightUpperLeg',
  'DEF-shinR': 'rightLowerLeg',
  'DEF-footR': 'rightFoot',
  'DEF-toeR': 'rightToes',
}

const upperBodyWithoutSpine = (name: Vanilla.VRMHumanBoneName) => Vanilla.upperBody(name) && name !== 'spine'

function Character() {
  const model = useCharacterModelLoader({ castShadow: true, url: 'avatar.vrm' })
  const domElement = useThree((s) => s.gl.domElement)
  const spineBone = useMemo(() => {
    const anyModel = model as any
    if (anyModel?.humanoid?.getRawBoneNode != null) {
      return anyModel.humanoid.getRawBoneNode('spine')
    }
    return model.scene.getObjectByName('spine')
  }, [model])
  const eulerYXZ = useMemo(() => new Euler(0, 0, 0, 'YXZ'), [])
  const qWorld = useMemo(() => new Quaternion(), [])
  const qParentWorldInv = useMemo(() => new Quaternion(), [])
  const qLocal = useMemo(() => new Quaternion(), [])
  useEffect(() => {
    const pointerLockInput = new Vanilla.PointerLockInput(domElement)
    return () => pointerLockInput.dispose()
  }, [domElement])
  useEffect(() => {
    const locomotionKeyboardInput = new Vanilla.LocomotionKeyboardInput(domElement)
    return () => locomotionKeyboardInput.dispose()
  }, [domElement])
  const physics = useBvhCharacterPhysics(model.scene)
  useEffect(() => {
    const reloadKeyboardInput = new Vanilla.KeyboardInput(domElement)
    reloadKeyboardInput.options.keys = ['KeyR']
    reloadKeyboardInput.bindEvent(ReloadAction)
    return () => reloadKeyboardInput.dispose()
  }, [domElement])
  const cameraBehaviorRef = useCharacterCameraBehavior(model.scene, {
    zoom: { speed: 0 },
    characterBaseOffset: [0.5, 1.3, 0],
  })

  useEffect(() => {
    const abortController = new AbortController()
    const signal = abortController.signal
    const writer = AimAction.createWriter(signal)
    domElement.addEventListener(
      'contextmenu',
      (e) => {
        e.preventDefault()
      },
      { signal },
    )
    domElement.addEventListener(
      'mousedown',
      (e) => {
        if (document.pointerLockElement !== domElement) {
          if (e.button === 0) {
            domElement.requestPointerLock()
          }
          return
        }
        if (e.button === 0) {
          ShootAction.emit()
        } else if (e.button === 2) {
          writer.write(true)
        }
      },
      { signal },
    )
    domElement.addEventListener(
      'mouseup',
      (e) => {
        if (document.pointerLockElement !== domElement) {
          return
        }
        if (e.button === 2) {
          writer.write(false)
        }
      },
      { signal },
    )
    return () => abortController.abort()
  }, [domElement])

  const lastJumpTimeRef = useRef(0)

  useFrame((state) => Vanilla.updateSimpleCharacterInputVelocity(state.camera, physics))

  useFrame((state) => (model.scene.rotation.y = state.camera.rotation.y))

  const normalizedDirection = useMemo(() => new Vector2(), [])
  // Keep the lowest upper-body bone (spine) upright (X=Z=0 in world) and match world yaw to camera yaw.
  useFrame((state) => {
    if (spineBone == null) {
      return
    }
    // target world rotation: upright, with camera world yaw
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
  useFrame(() =>
    normalizedDirection
      .set(
        Vanilla.MoveRightAction.get() - Vanilla.MoveLeftAction.get(),
        Vanilla.MoveForwardAction.get() - Vanilla.MoveBackwardAction.get(),
      )
      .normalize(),
  )

  const muzzleFlashVisualRef = useRef<Mesh>(null)
  const muzzleFlashAudioRef = useRef<PositionalAudioImpl>(null)
  const reloadAudioRef = useRef<PositionalAudioImpl>(null)

  const moveForwardAnimationRef = useRef<AnimationAction>(null)
  const moveBackwardAnimationRef = useRef<AnimationAction>(null)
  const moveLeftAnimationRef = useRef<AnimationAction>(null)
  const moveRightAnimationRef = useRef<AnimationAction>(null)
  const moveForwardRightAnimationRef = useRef<AnimationAction>(null)
  const moveForwardLeftAnimationRef = useRef<AnimationAction>(null)
  const moveBackwardRightAnimationRef = useRef<AnimationAction>(null)
  const moveBackwardLeftAnimationRef = useRef<AnimationAction>(null)

  useFrame(() => {
    moveForwardAnimationRef.current && (moveForwardAnimationRef.current.timeScale = Vanilla.RunAction.get() ? 2 : 1)
    moveBackwardAnimationRef.current && (moveBackwardAnimationRef.current.timeScale = Vanilla.RunAction.get() ? 2 : 1)
    moveLeftAnimationRef.current && (moveLeftAnimationRef.current.timeScale = Vanilla.RunAction.get() ? 2 : 1)
    moveRightAnimationRef.current && (moveRightAnimationRef.current.timeScale = Vanilla.RunAction.get() ? 2 : 1)
    moveForwardRightAnimationRef.current &&
      (moveForwardRightAnimationRef.current.timeScale = Vanilla.RunAction.get() ? 2 : 1)
    moveForwardLeftAnimationRef.current &&
      (moveForwardLeftAnimationRef.current.timeScale = Vanilla.RunAction.get() ? 2 : 1)
    moveBackwardRightAnimationRef.current &&
      (moveBackwardRightAnimationRef.current.timeScale = Vanilla.RunAction.get() ? 2 : 1)
    moveBackwardLeftAnimationRef.current &&
      (moveBackwardLeftAnimationRef.current.timeScale = Vanilla.RunAction.get() ? 2 : 1)
  })

  const muzzleflashTexture = useTexture('muzzleflash.png')

  // camera effects
  const onShoot = useCameraShakeOnShoot({ duration: 0.11, strength: 0.005 })
  useCameraFovChangeOnRun({ baseFov: 60, runFov: 75 })
  useAimZoomControl(cameraBehaviorRef, { zoomedDistance: 0.7, normalDistance: 2.0, speed: 20 })

  const aimUpRef = useRef<AnimationAction>(null)
  const aimForwardRef = useRef<AnimationAction>(null)
  const aimDownRef = useRef<AnimationAction>(null)

  useFrame((state) => {
    if (aimUpRef.current == null || aimForwardRef.current == null || aimDownRef.current == null) {
      return
    }
    // Blend aim animations based on camera pitch (rotation.x)
    const pitch = -state.camera.rotation.x
    const upRange = Math.PI / 2 // radians up
    const downRange = Math.PI / 2 // radians down
    let wUp = 0
    let wForward = 1
    let wDown = 0
    if (pitch < 0) {
      // looking up
      wUp = Math.min(1, Math.max(0, -pitch / upRange))
      wForward = 1 - wUp
      wDown = 0
    } else if (pitch > 0) {
      // looking down
      wDown = Math.min(1, Math.max(0, pitch / downRange))
      wForward = 1 - wDown
      wUp = 0
    }
    aimUpRef.current.weight = wUp
    aimForwardRef.current.weight = wForward
    aimDownRef.current.weight = wDown
  })

  return (
    <CharacterModelProvider model={model}>
      <CharacterModelBone bone="rightHand">
        <Suspense fallback={null}>
          <Gltf scale={0.13} position={[0.1, -0.03, 0]} rotation-x={-Math.PI / 2} src="pistol.glb" />
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
        </Suspense>
      </CharacterModelBone>
      <RunTimeline>
        <CharacterAnimationLayer name="lower-body">
          <Graph enterState="move">
            <GrapthState
              name="move"
              transitionTo={{
                jumpStart: {
                  whenUpdate: () => Vanilla.shouldJump(physics, lastJumpTimeRef.current),
                },
                jumpLoop: { whenUpdate: () => !physics.isGrounded },
              }}
            >
              <Switch>
                <SwitchCase
                  index={0}
                  condition={() => Math.abs(normalizedDirection.x) < 0.5 && normalizedDirection.y > 0.5}
                >
                  <CharacterAnimationAction
                    mask={Vanilla.lowerBody}
                    sync
                    scaleTime={1.5}
                    boneMap={boneMap}
                    ref={moveForwardAnimationRef}
                    url="jog-forward.glb"
                  />
                </SwitchCase>
                <SwitchCase index={1} condition={() => normalizedDirection.x > 0.5 && normalizedDirection.y > 0.5}>
                  <CharacterAnimationAction
                    mask={Vanilla.lowerBody}
                    sync
                    scaleTime={1.5}
                    boneMap={boneMap}
                    ref={moveForwardRightAnimationRef}
                    url="jog-forward-right.glb"
                  />
                </SwitchCase>
                <SwitchCase
                  index={2}
                  condition={() => normalizedDirection.x > 0.5 && Math.abs(normalizedDirection.y) < 0.5}
                >
                  <CharacterAnimationAction
                    mask={Vanilla.lowerBody}
                    sync
                    scaleTime={0.9}
                    boneMap={boneMap}
                    ref={moveRightAnimationRef}
                    url="jog-right.glb"
                  />
                </SwitchCase>
                <SwitchCase index={3} condition={() => normalizedDirection.x > 0.5 && normalizedDirection.y < -0.5}>
                  <CharacterAnimationAction
                    mask={Vanilla.lowerBody}
                    sync
                    scaleTime={1.3}
                    boneMap={boneMap}
                    ref={moveBackwardRightAnimationRef}
                    url="jog-backward-right.glb"
                  />
                </SwitchCase>
                <SwitchCase
                  index={4}
                  condition={() => Math.abs(normalizedDirection.x) < 0.5 && normalizedDirection.y < -0.5}
                >
                  <CharacterAnimationAction
                    mask={Vanilla.lowerBody}
                    sync
                    scaleTime={1.4}
                    boneMap={boneMap}
                    ref={moveBackwardAnimationRef}
                    url="jog-backward.glb"
                  />
                </SwitchCase>
                <SwitchCase index={5} condition={() => normalizedDirection.x < -0.5 && normalizedDirection.y < -0.5}>
                  <CharacterAnimationAction
                    mask={Vanilla.lowerBody}
                    sync
                    scaleTime={1.3}
                    boneMap={boneMap}
                    ref={moveBackwardLeftAnimationRef}
                    url="jog-backward-left.glb"
                  />
                </SwitchCase>
                <SwitchCase
                  index={6}
                  condition={() => normalizedDirection.x < -0.5 && Math.abs(normalizedDirection.y) < 0.5}
                >
                  <CharacterAnimationAction
                    mask={Vanilla.lowerBody}
                    sync
                    scaleTime={0.9}
                    boneMap={boneMap}
                    ref={moveLeftAnimationRef}
                    url="jog-left.glb"
                  />
                </SwitchCase>
                <SwitchCase index={7} condition={() => normalizedDirection.x < -0.5 && normalizedDirection.y > 0.5}>
                  <CharacterAnimationAction
                    mask={Vanilla.lowerBody}
                    sync
                    scaleTime={1.5}
                    boneMap={boneMap}
                    ref={moveForwardLeftAnimationRef}
                    url="jog-forward-left.glb"
                  />
                </SwitchCase>
                <SwitchCase index={8}>
                  <CharacterAnimationAction mask={Vanilla.lowerBody} url={Vanilla.IdleAnimationUrl} />
                </SwitchCase>
              </Switch>
            </GrapthState>
            <GrapthState
              name="jumpStart"
              transitionTo={{
                jumpDown: { whenUpdate: () => !physics.isGrounded },
                finally: 'jumpUp',
              }}
            >
              <CharacterAnimationAction
                until={() => timePassed(0.2, 'seconds')}
                update={() => void physics.inputVelocity.multiplyScalar(0.3)}
                mask={Vanilla.lowerBody}
                paused
                url={Vanilla.JumpUpAnimationUrl}
              />
            </GrapthState>
            <GrapthState
              name="jumpLoop"
              transitionTo={{
                jumpDown: { whenUpdate: () => physics.isGrounded },
              }}
            >
              <CharacterAnimationAction mask={Vanilla.lowerBody} url={Vanilla.JumpLoopAnimationUrl} />
            </GrapthState>
            <GrapthState
              name="jumpUp"
              transitionTo={{
                jumpDown: {
                  whenUpdate: (_, _clock, actionTime) => actionTime > 0.3 && physics.isGrounded,
                },
                finally: 'jumpLoop',
              }}
            >
              <CharacterAnimationAction
                loop={LoopOnce}
                mask={Vanilla.lowerBody}
                init={() => {
                  lastJumpTimeRef.current = performance.now() / 1000
                  physics.applyVelocity(new Vector3(0, 8, 0))
                }}
                url={Vanilla.JumpUpAnimationUrl}
              />
            </GrapthState>
            <GrapthState name="jumpDown" transitionTo={{ finally: 'move' }}>
              <CharacterAnimationAction
                mask={Vanilla.lowerBody}
                until={() => timePassed(150, 'milliseconds')}
                loop={LoopOnce}
                url={Vanilla.JumpDownAnimationUrl}
              />
            </GrapthState>
          </Graph>
        </CharacterAnimationLayer>
      </RunTimeline>
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
                    if (useAmmo.getState().ammo === 0) {
                      //wait forever
                      await new Promise(() => {})
                    }
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
                  if (reloadAudioRef.current == null) {
                    return
                  }
                  reloadAudioRef.current.play(0.3)
                  useAmmo.setState({ ammo: 12 })
                }}
                mask={upperBodyWithoutSpine}
                scaleTime={0.5}
                url="pistol-reload.glb"
              />
            </GrapthState>
            <GrapthState name="shoot" transitionTo={{ finally: 'idle' }}>
              <AdditiveCharacterAnimationAction
                referenceClip={{ url: 'aim-forward.glb' }}
                boneMap={boneMap}
                loop={LoopOnce}
                mask={upperBodyWithoutSpine}
                fadeDuration={0}
                scaleTime={0.5}
                init={() => {
                  useAmmo.setState({ ammo: useAmmo.getState().ammo - 1 })
                  onShoot()
                  muzzleFlashAudioRef.current?.stop()
                  muzzleFlashAudioRef.current?.play()
                  if (muzzleFlashVisualRef.current) {
                    muzzleFlashVisualRef.current.visible = true
                    setTimeout(() => (muzzleFlashVisualRef.current!.visible = false), 70)
                  }
                }}
                url="pistol-shoot.glb"
              />
            </GrapthState>
          </Graph>
        </CharacterAnimationLayer>
      </RunTimeline>
      <primitive object={model.scene} />
    </CharacterModelProvider>
  )
}

function FortniteHUD() {
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

function useCameraShakeOnShoot(options: { duration?: number; strength?: number } = {}): () => void {
  const camera = useThree((s) => s.camera)
  const lastOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const latestShootTimRef = useRef(-Infinity)
  useFrame((_state, _delta) => {
    const cam: any = camera as any
    // remove previous frame offset to avoid drift
    if (cam?.rotation) {
      cam.rotation.x -= lastOffsetRef.current.x
      cam.rotation.y -= lastOffsetRef.current.y
    }
    const now = performance.now() / 1000
    const elapsed = now - latestShootTimRef.current
    const duration = options.duration ?? 0.12
    if (elapsed >= 0 && elapsed < duration && cam?.rotation) {
      const progress = 1 - elapsed / duration
      const amplitude = (options.strength ?? 0.03) * progress
      // simple dual-frequency shake
      const x = Math.sin(elapsed * 80) * amplitude
      const y = Math.sin(elapsed * 90 + 0.5) * amplitude * 0.6
      lastOffsetRef.current.x = x
      lastOffsetRef.current.y = y
      cam.rotation.x += x
      cam.rotation.y += y
    } else {
      // reset offsets
      lastOffsetRef.current.x = 0
      lastOffsetRef.current.y = 0
    }
  })
  return useCallback(() => void (latestShootTimRef.current = performance.now() / 1000), [])
}

function useCameraFovChangeOnRun(options: { baseFov?: number; runFov?: number; speed?: number } = {}) {
  const camera = useThree((s) => s.camera)
  useFrame((_state, delta) => {
    const cam: any = camera as any
    if (typeof cam?.fov !== 'number') {
      return
    }
    const base = options.baseFov ?? 50
    const run = options.runFov ?? 58
    const target = Vanilla.RunAction.get() ? run : base
    const speed = options.speed ?? 10
    const t = 1 - Math.exp(-speed * delta)
    cam.fov += (target - cam.fov) * t
    cam.updateProjectionMatrix?.()
  })
}

function useAimZoomControl(
  behaviorRef: React.RefObject<any>,
  options: { zoomedDistance?: number; normalDistance?: number; speed?: number } = {},
) {
  useFrame((_state, delta) => {
    const behavior = behaviorRef.current as any
    if (behavior == null) {
      return
    }
    const zoomed = options.zoomedDistance ?? 1.0
    const normal = options.normalDistance ?? 3.0
    const target = AimAction.get() ? zoomed : normal
    const speed = options.speed ?? 10
    const t = 1 - Math.exp(-speed * delta)
    behavior.zoomDistance += (target - behavior.zoomDistance) * t
  })
}
