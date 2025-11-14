import { useFrame } from '@react-three/fiber'
import { RunTimeline, Parallel } from '@react-three/timeline'
import { CharacterAnimationLayer, CharacterAnimationAction } from '@react-three/viverse'
import { useRef } from 'react'
import { AnimationAction } from 'three'
import { upperBodyWithoutSpine, boneMap } from './bone-map.js'

export function UpperBodyAimAnimation() {
  const aimUpRef = useRef<AnimationAction>(null)
  const aimForwardRef = useRef<AnimationAction>(null)
  const aimDownRef = useRef<AnimationAction>(null)

  useFrame((state) => {
    if (aimUpRef.current == null || aimForwardRef.current == null || aimDownRef.current == null) {
      return
    }
    const pitch = -state.camera.rotation.x
    if (pitch <= 0) {
      // looking up
      aimUpRef.current.weight = Math.min(1, Math.max(0, -pitch / (Math.PI / 2)))
      aimForwardRef.current.weight = 1 - aimUpRef.current.weight
      aimDownRef.current.weight = 0
    } else if (pitch > 0) {
      // looking down
      aimDownRef.current.weight = Math.min(1, Math.max(0, pitch / (Math.PI / 2)))
      aimForwardRef.current.weight = 1 - aimDownRef.current.weight
      aimUpRef.current.weight = 0
    }
  })
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
}
