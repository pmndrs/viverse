import { VRM } from '@pixiv/three-vrm'
import {
  CharacterCameraBehavior,
  CharacterAnimationOptions,
  CharacterModelOptions,
  flattenCharacterAnimationOptions,
  flattenCharacterModelOptions,
  loadCharacterModel,
  loadCharacterAnimation,
  SimpleCharacterCameraBehaviorOptions,
  CharacterModel,
  ScreenJoystickInput,
  ScreenJumpButtonInput,
  PointerCaptureInput,
  LocomotionKeyboardInput,
  SimpleCharacterInputOptions,
  applySimpleCharacterInputOptions,
} from '@pmndrs/viverse'
import { useFrame, useThree } from '@react-three/fiber'
import { RefObject, useEffect, useMemo, useRef } from 'react'
import { suspend } from 'suspend-react'
import { Object3D } from 'three'
import { useViverseActiveAvatar } from './index.js'
import { useBvhPhysicsWorld } from './physics.js'

export function useCharacterCameraBehavior(
  model: Object3D | RefObject<Object3D | null>,
  options?: SimpleCharacterCameraBehaviorOptions,
) {
  const behaviorRef = useRef<CharacterCameraBehavior>(undefined)
  useEffect(() => {
    const behavior = new CharacterCameraBehavior()
    behaviorRef.current = behavior
    return () => {
      behaviorRef.current = undefined
      behavior.dispose()
    }
  }, [])
  const world = useBvhPhysicsWorld()
  const raycast = useMemo(() => world.raycast.bind(world), [world])
  useFrame((state, delta) => {
    const resolvedModel = model instanceof Object3D ? model : model.current
    if (resolvedModel == null) {
      return
    }
    behaviorRef.current?.update(state.camera, resolvedModel, delta, raycast, options)
  })
  return behaviorRef
}

const loadCharacterModelSymbol = Symbol('loadCharacterModel')
export function useCharacterModelLoader({
  useViverseAvatar = true,
  ...modelOptions
}: CharacterModelOptions & { useViverseAvatar?: boolean } = {}) {
  const avatar = useViverseActiveAvatar()
  const model = suspend(
    (_, ...params) => loadCharacterModel(...params),
    [
      loadCharacterModelSymbol,
      ...flattenCharacterModelOptions(
        avatar != null && useViverseAvatar
          ? {
              type: 'vrm',
              url: avatar?.vrmUrl,
              ...modelOptions,
            }
          : modelOptions,
      ),
    ],
  )
  useFrame((_, delta) => {
    if (model instanceof VRM) {
      model.update(delta)
    }
    model.mixer.update(delta)
  })
  return model
}

const loadCharacterAnimationSymbol = Symbol('loadCharacterAnimation')
export function useCharacterAnimationLoader(model: CharacterModel, options: CharacterAnimationOptions) {
  return suspend(
    (_, ...params) => loadCharacterAnimation(...params),
    [loadCharacterAnimationSymbol, model, ...flattenCharacterAnimationOptions(options)],
  )
}

/**
 * @deprecated use inputs directly
 */
export function useSimpleCharacterInputs(
  inputsClasses: ReadonlyArray<{ new (domElement: HTMLElement): { dispose(): void } }> = [
    ScreenJoystickInput,
    ScreenJumpButtonInput,
    PointerCaptureInput,
    LocomotionKeyboardInput,
  ],
  options?: SimpleCharacterInputOptions,
): void {
  const dom = useThree((s) => s.gl.domElement)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const inputs = useMemo<Array<{ dispose(): void }>>(() => [], [dom])
  useEffect(() => {
    const removedInputs = new Set(inputs)
    for (const inputClass of inputsClasses) {
      const existingInput = inputs.find((existingInput) => existingInput instanceof inputClass)
      if (existingInput != null) {
        removedInputs.delete(existingInput)
        continue
      }
      inputs.push(new inputClass(dom))
    }
    for (const removedInput of removedInputs) {
      removedInput.dispose()
      const index = inputs.indexOf(removedInput)
      if (index != -1) {
        inputs.splice(index, 1)
      }
    }
    applySimpleCharacterInputOptions(inputs, options)
  })
  useEffect(
    () => () => {
      inputs.forEach((input) => input.dispose())
      inputs.length = 0
    },
    [inputs],
  )
}
