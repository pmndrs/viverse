import { useFrame } from '@react-three/fiber'
import { RunTimeline, Graph, GrapthState, Switch, SwitchCase, timePassed } from '@react-three/timeline'
import {
  CharacterAnimationLayer,
  shouldJump,
  CharacterAnimationAction,
  lowerBody,
  IdleAnimationUrl,
  JumpUpAnimationUrl,
  JumpLoopAnimationUrl,
  JumpDownAnimationUrl,
  MoveBackwardAction,
  MoveForwardAction,
  MoveLeftAction,
  MoveRightAction,
  RunAction,
  BvhCharacterPhysics,
} from '@react-three/viverse'
import { useMemo, useRef } from 'react'
import { AnimationAction, LoopOnce, Vector2, Vector3 } from 'three'
import { boneMap } from './bone-map.js'

export function LowerBodyAnimation({ physics }: { physics: BvhCharacterPhysics }) {
  const normalizedDirection = useMemo(() => new Vector2(), [])
  useFrame(() =>
    normalizedDirection
      .set(MoveRightAction.get() - MoveLeftAction.get(), MoveForwardAction.get() - MoveBackwardAction.get())
      .normalize(),
  )

  const forwardRef = useRef<AnimationAction>(null)
  const backwardRef = useRef<AnimationAction>(null)
  const leftRef = useRef<AnimationAction>(null)
  const rightRef = useRef<AnimationAction>(null)
  const forwardRightRef = useRef<AnimationAction>(null)
  const forwardLeftRef = useRef<AnimationAction>(null)
  const backwardRightRef = useRef<AnimationAction>(null)
  const backwardLeftRef = useRef<AnimationAction>(null)

  useFrame(() => {
    const timeScale = RunAction.get() ? 2 : 1
    forwardRef.current && (forwardRef.current.timeScale = timeScale)
    backwardRef.current && (backwardRef.current.timeScale = timeScale)
    leftRef.current && (leftRef.current.timeScale = timeScale)
    rightRef.current && (rightRef.current.timeScale = timeScale)
    forwardRightRef.current && (forwardRightRef.current.timeScale = timeScale)
    forwardLeftRef.current && (forwardLeftRef.current.timeScale = timeScale)
    backwardRightRef.current && (backwardRightRef.current.timeScale = timeScale)
    backwardLeftRef.current && (backwardLeftRef.current.timeScale = timeScale)
  })

  const lastJumpTimeRef = useRef(0)
  return (
    <RunTimeline>
      <CharacterAnimationLayer name="lower-body">
        <Graph enterState="move">
          <GrapthState
            name="move"
            transitionTo={{
              jumpStart: {
                whenUpdate: () => shouldJump(physics, lastJumpTimeRef.current),
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
              <SwitchCase
                index={2}
                condition={() => normalizedDirection.x > 0.5 && Math.abs(normalizedDirection.y) < 0.5}
              >
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
              <SwitchCase
                index={4}
                condition={() => Math.abs(normalizedDirection.x) < 0.5 && normalizedDirection.y < -0.5}
              >
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
              <SwitchCase
                index={6}
                condition={() => normalizedDirection.x < -0.5 && Math.abs(normalizedDirection.y) < 0.5}
              >
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
              mask={lowerBody}
              paused
              url={JumpUpAnimationUrl}
            />
          </GrapthState>
          <GrapthState
            name="jumpLoop"
            transitionTo={{
              jumpDown: { whenUpdate: () => physics.isGrounded },
            }}
          >
            <CharacterAnimationAction mask={lowerBody} url={JumpLoopAnimationUrl} />
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
        </Graph>
      </CharacterAnimationLayer>
    </RunTimeline>
  )
}
