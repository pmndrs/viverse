import { Sky } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Graph, GrapthState, RunTimeline, Switch, SwitchCase, timePassed } from '@react-three/timeline'
import { Image, Text, Fullscreen } from '@react-three/uikit'
import {
  BvhPhysicsBody,
  Viverse,
  PrototypeBox,
  CharacterModelProvider,
  CharacterAnimationAction,
  useCharacterModelLoader,
  useCharacterCameraBehavior,
  useInputSystem,
  Vanilla,
  useBvhCharacterPhysics,
} from '@react-three/viverse'
import { Suspense, useMemo, useRef } from 'react'
import { Group, LoopOnce, Vector2, Vector3 } from 'three'

export function App() {
  return (
    <Viverse clientId={import.meta.env.VITE_VIVERSE_APP_ID}>
      <Canvas style={{ width: '100%', flexGrow: 1 }} shadows gl={{ antialias: true, localClippingEnabled: true }}>
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
      <Suspense fallback={null}>
        <Character />
      </Suspense>
      <BvhPhysicsBody>
        <PrototypeBox scale={[10, 0.5, 10]} position={[0.08, -2, 0]} />
      </BvhPhysicsBody>
    </>
  )
}

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

function Character() {
  const model = useCharacterModelLoader()
  const inputSystem = useInputSystem()
  const physics = useBvhCharacterPhysics(model.scene)
  useCharacterCameraBehavior(model.scene, inputSystem)

  const lastJumpTimeRef = useRef(0)

  useFrame((state) => Vanilla.updateSimpleCharacterInputVelocity(state.camera, inputSystem, physics))

  useFrame((state) => (model.scene.rotation.y = state.camera.rotation.y))

  const normalizedDirection = useMemo(() => new Vector2(), [])
  useFrame(() =>
    normalizedDirection
      .set(
        inputSystem.get(Vanilla.MoveRightField) - inputSystem.get(Vanilla.MoveLeftField),
        inputSystem.get(Vanilla.MoveForwardField) - inputSystem.get(Vanilla.MoveBackwardField),
      )
      .normalize(),
  )

  return (
    <CharacterModelProvider model={model}>
      <RunTimeline>
        <Graph enterState="move">
          <GrapthState
            name="move"
            transitionTo={{
              jumpStart: {
                whenUpdate: () => Vanilla.shouldJump(physics, inputSystem, lastJumpTimeRef.current),
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
                  url="jog-forward.glb"
                />
              </SwitchCase>
              <SwitchCase index={1} condition={() => normalizedDirection.x > 0.5 && normalizedDirection.y > 0.5}>
                <CharacterAnimationAction
                  mask={Vanilla.lowerBody}
                  sync
                  scaleTime={1.5}
                  boneMap={boneMap}
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
                  url="jog-right.glb"
                />
              </SwitchCase>
              <SwitchCase index={3} condition={() => normalizedDirection.x > 0.5 && normalizedDirection.y < -0.5}>
                <CharacterAnimationAction
                  mask={Vanilla.lowerBody}
                  sync
                  scaleTime={1.3}
                  boneMap={boneMap}
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
                  url="jog-backward.glb"
                />
              </SwitchCase>
              <SwitchCase index={5} condition={() => normalizedDirection.x < -0.5 && normalizedDirection.y < -0.5}>
                <CharacterAnimationAction
                  mask={Vanilla.lowerBody}
                  sync
                  scaleTime={1.3}
                  boneMap={boneMap}
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
                  url="jog-left.glb"
                />
              </SwitchCase>
              <SwitchCase index={7} condition={() => normalizedDirection.x < -0.5 && normalizedDirection.y > 0.5}>
                <CharacterAnimationAction
                  mask={Vanilla.lowerBody}
                  sync
                  scaleTime={1.5}
                  boneMap={boneMap}
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
      </RunTimeline>
      <RunTimeline>
        <Graph enterState="idle">
          <GrapthState name="idle">
            <CharacterAnimationAction
              boneMap={boneMap}
              mask={Vanilla.upperBody}
              url="aim-forward.glb"
            ></CharacterAnimationAction>
          </GrapthState>
        </Graph>
      </RunTimeline>
      <primitive object={model.scene} />
    </CharacterModelProvider>
  )
}
