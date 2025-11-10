import {
  BvhCharacterPhysics,
  CharacterModelOptions,
  InputSystem,
  RunField,
  shouldJump,
  SimpleCharacterAnimationOptions,
  SimpleCharacterMovementOptions,
  SimpleCharacterOptions,
  updateSimpleCharacterInputVelocity,
  updateSimpleCharacterRotation,
} from '@pmndrs/viverse'
import {
  IdleAnimationUrl,
  JumpDownAnimationUrl,
  JumpForwardAnimationUrl,
  JumpLoopAnimationUrl,
  JumpUpAnimationUrl,
  RunAnimationUrl,
  WalkAnimationUrl,
} from '@pmndrs/viverse/src/animation/default.js'
import { ThreeElement, useFrame } from '@react-three/fiber'
import { Graph, GrapthState, Parallel, RunTimeline, Switch, SwitchCase, timePassed } from '@react-three/timeline'
import { forwardRef, ReactNode, Suspense, useImperativeHandle, useRef } from 'react'
import { Group, LoopOnce, Object3D, Vector3 } from 'three'
import { CharacterAnimationAction } from './animation.js'
import { useViverseActiveAvatar } from './index.js'
import { CharacterModelProvider } from './model.js'
import { useBvhCharacterPhysics } from './physics.js'
import { useCharacterCameraBehavior, useCharacterModelLoader, useInputSystem } from './utils.js'

export const SimpleCharacter = forwardRef<
  Object3D,
  { children?: ReactNode; useViverseAvatar?: boolean } & SimpleCharacterOptions & ThreeElement<typeof Group>
>(
  (
    {
      input,
      inputOptions,
      cameraBehavior,
      children,
      movement,
      physics: physicsOptions,
      model,
      useViverseAvatar,
      animation,
      ...props
    },
    ref,
  ) => {
    const internalRef = useRef<Object3D>(null)
    const inputSystem = useInputSystem(input, inputOptions)
    useCharacterCameraBehavior(internalRef, inputSystem, cameraBehavior)
    const physics = useBvhCharacterPhysics(internalRef, physicsOptions)
    const lastJumpTimeRef = useRef(-Infinity)
    useFrame((state) => updateSimpleCharacterInputVelocity(state.camera, inputSystem, physics, movement))
    useFrame(() => {
      if (model != false || movement?.jump === false) {
        return
      }
      const bufferTime = movement?.jump === true ? undefined : movement?.jump?.bufferTime
      if (shouldJump(physics, inputSystem, lastJumpTimeRef.current, bufferTime)) {
        lastJumpTimeRef.current = performance.now() / 1000
        physics.applyVelocity(
          // eslint-disable-next-line @react-three/no-new-in-loop
          new Vector3(0, (typeof movement?.jump === 'object' ? movement?.jump.speed : undefined) ?? 8, 0),
        )
      }
    })
    useImperativeHandle(ref, () => internalRef.current!, [])
    return (
      <group {...props} ref={internalRef}>
        {model == false ? (
          children
        ) : (
          <SimpleCharacterModel
            animation={animation}
            inputSystem={inputSystem}
            physics={physics}
            model={model == true ? undefined : model}
            movement={movement}
            useViverseAvatar={useViverseAvatar}
          >
            {children}
          </SimpleCharacterModel>
        )}
      </group>
    )
  },
)

function SimpleCharacterModel({
  children,
  model: modelOptions,
  movement,
  physics,
  useViverseAvatar,
  inputSystem,
  animation,
}: {
  physics: BvhCharacterPhysics
  inputSystem: InputSystem
  children?: ReactNode
  model?: CharacterModelOptions
  useViverseAvatar?: boolean
  movement?: SimpleCharacterMovementOptions
  animation?: SimpleCharacterAnimationOptions
}) {
  const avatar = useViverseActiveAvatar()
  const model = useCharacterModelLoader(
    avatar != null && useViverseAvatar
      ? {
          url: avatar?.vrmUrl,
          ...modelOptions,
        }
      : modelOptions,
  )
  const lastJumpTimeRef = useRef(-Infinity)

  useFrame((state, delta) => updateSimpleCharacterRotation(delta, physics, state.camera, model, animation))
  return (
    <>
      <CharacterModelProvider model={model}>
        <RunTimeline>
          <Graph enterState="move">
            <GrapthState
              name="move"
              transitionTo={{
                jumpStart: {
                  whenUpdate: () => shouldJump(physics, inputSystem, lastJumpTimeRef.current),
                },
                jumpLoop: { whenUpdate: () => !physics.isGrounded },
              }}
            >
              <Switch>
                <SwitchCase index={0} condition={() => physics.inputVelocity.lengthSq() === 0}>
                  <Suspense fallback={null}>
                    <CharacterAnimationAction
                      {...animation?.idle}
                      fadeDuration={animation?.crossFadeDuration}
                      url={IdleAnimationUrl}
                    />
                  </Suspense>
                </SwitchCase>
                {movement?.run != false && (
                  <SwitchCase index={1} condition={() => inputSystem.get(RunField)}>
                    <Suspense fallback={null}>
                      <CharacterAnimationAction
                        {...animation?.run}
                        fadeDuration={animation?.crossFadeDuration}
                        scaleTime={0.8}
                        url={RunAnimationUrl}
                      />
                    </Suspense>
                  </SwitchCase>
                )}
                {movement?.walk != false && (
                  <SwitchCase index={2}>
                    <Suspense fallback={null}>
                      <CharacterAnimationAction
                        {...animation?.walk}
                        fadeDuration={animation?.crossFadeDuration}
                        scaleTime={0.5}
                        url={WalkAnimationUrl}
                      />
                    </Suspense>
                  </SwitchCase>
                )}
                <SwitchCase index={3}>
                  <Suspense fallback={null}>
                    <CharacterAnimationAction
                      {...animation?.idle}
                      fadeDuration={animation?.crossFadeDuration}
                      url={IdleAnimationUrl}
                    />
                  </Suspense>
                </SwitchCase>
              </Switch>
            </GrapthState>
            <GrapthState
              name="jumpStart"
              transitionTo={{
                jumpDown: { whenUpdate: () => !physics.isGrounded },
                finally: () => (inputSystem.get(RunField) ? 'jumpForward' : 'jumpUp'),
              }}
            >
              <Parallel type="race">
                <Suspense fallback={null}>
                  <CharacterAnimationAction
                    {...animation?.jumpUp}
                    fadeDuration={animation?.crossFadeDuration ?? 0.1}
                    until={() => timePassed(0.2, 'seconds')}
                    update={() => void physics.inputVelocity.multiplyScalar(0.3)}
                    paused
                    url={JumpUpAnimationUrl}
                  />
                  <CharacterAnimationAction
                    {...animation?.jumpForward}
                    fadeDuration={animation?.crossFadeDuration ?? 0.1}
                    paused
                    url={JumpForwardAnimationUrl}
                  />
                </Suspense>
              </Parallel>
            </GrapthState>
            <GrapthState
              name="jumpLoop"
              transitionTo={{
                jumpDown: { whenUpdate: () => physics.isGrounded },
              }}
            >
              <Suspense fallback={null}>
                <CharacterAnimationAction
                  {...animation?.jumpLoop}
                  fadeDuration={animation?.crossFadeDuration}
                  url={JumpLoopAnimationUrl}
                />
              </Suspense>
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
              <Suspense fallback={null}>
                <CharacterAnimationAction
                  {...animation?.jumpUp}
                  fadeDuration={animation?.crossFadeDuration}
                  loop={LoopOnce}
                  init={() => {
                    lastJumpTimeRef.current = performance.now() / 1000
                    physics.applyVelocity(
                      new Vector3(0, (typeof movement?.jump === 'object' ? movement?.jump.speed : undefined) ?? 8, 0),
                    )
                  }}
                  url={JumpUpAnimationUrl}
                />
              </Suspense>
            </GrapthState>
            <GrapthState
              name="jumpForward"
              transitionTo={{ finally: () => (physics.isGrounded ? 'move' : 'jumpLoop') }}
            >
              <Suspense fallback={null}>
                <CharacterAnimationAction
                  {...animation?.jumpForward}
                  fadeDuration={animation?.crossFadeDuration}
                  scaleTime={0.9}
                  init={() => {
                    lastJumpTimeRef.current = performance.now() / 1000
                    physics.applyVelocity(new Vector3(0, 8, 0))
                  }}
                  loop={LoopOnce}
                  url={JumpForwardAnimationUrl}
                />
              </Suspense>
            </GrapthState>
            <GrapthState name="jumpDown" transitionTo={{ finally: 'move' }}>
              <Suspense fallback={null}>
                <CharacterAnimationAction
                  {...animation?.jumpDown}
                  fadeDuration={animation?.crossFadeDuration}
                  until={() => timePassed(150, 'milliseconds')}
                  loop={LoopOnce}
                  url={JumpDownAnimationUrl}
                />
              </Suspense>
            </GrapthState>
          </Graph>
        </RunTimeline>
        <primitive object={model.scene} />
        {children}
      </CharacterModelProvider>
    </>
  )
}
