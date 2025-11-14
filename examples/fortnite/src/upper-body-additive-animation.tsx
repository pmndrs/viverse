import { Billboard, PositionalAudio, useTexture } from '@react-three/drei'
import { RunTimeline, Graph, GrapthState, Parallel, Action, timePassed } from '@react-three/timeline'
import { CharacterAnimationLayer, AdditiveCharacterAnimationAction, CharacterModelBone } from '@react-three/viverse'
import { useRef } from 'react'
import { LoopOnce, Mesh, PositionalAudio as PositionalAudioImpl } from 'three'
import { useAmmo, ReloadAction, ShootAction } from './app.js'
import { boneMap, upperBodyWithoutSpine } from './bone-map.js'

export function UpperBodyAdditiveAnimation() {
  const muzzleFlashVisualRef = useRef<Mesh>(null)
  const muzzleFlashAudioRef = useRef<PositionalAudioImpl>(null)
  const reloadAudioRef = useRef<PositionalAudioImpl>(null)

  const muzzleflashTexture = useTexture('muzzleflash.png')
  return (
    <>
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
              <Parallel type="all">
                <Action
                  update={(state) => {
                    const jitter = 0.01
                    const baseX = state.camera.rotation.x
                    const baseY = state.camera.rotation.y
                    state.camera.rotation.set(
                      baseX + (Math.random() - 0.5) * jitter,
                      baseY + (Math.random() - 0.5) * jitter,
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
                    const muzzleFlashVisual = muzzleFlashVisualRef.current
                    if (muzzleFlashVisual == null) {
                      return
                    }
                    muzzleFlashVisual.visible = true
                    return () => (muzzleFlashVisual.visible = false)
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
    </>
  )
}
