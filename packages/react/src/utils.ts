import { VRM } from '@pixiv/three-vrm'
import {
  CharacterCameraBehavior,
  CharacterAnimationOptions,
  CharacterModelOptions,
  flattenCharacterAnimationOptions,
  flattenCharacterModelOptions,
  InputSystem,
  loadCharacterModel,
  loadCharacterAnimation,
  SimpleCharacterCameraBehaviorOptions,
  CharacterModel,
  Input,
  ScreenJoystickInput,
  ScreenJumpButtonInput,
  PointerCaptureInput,
  LocomotionKeyboardInput,
} from '@pmndrs/viverse'
import { useFrame, useThree } from '@react-three/fiber'
import { RefObject, useEffect, useMemo } from 'react'
import { suspend } from 'suspend-react'
import { Object3D } from 'three'
import { useBvhPhysicsWorld } from './physics.js'

export function useCharacterCameraBehavior(
  model: Object3D | RefObject<Object3D | null>,
  inputSystem: InputSystem,
  options?: SimpleCharacterCameraBehaviorOptions,
) {
  const behavior = useMemo(() => new CharacterCameraBehavior(), [])
  const world = useBvhPhysicsWorld()
  const raycast = useMemo(() => world.raycast.bind(world), [world])
  useFrame((state, delta) => {
    const resolvedModel = model instanceof Object3D ? model : model.current
    if (resolvedModel == null) {
      return
    }
    behavior.update(state.camera, resolvedModel, inputSystem, delta, raycast, options)
  })
}

const loadCharacterModelSymbol = Symbol('loadCharacterModel')
export function useCharacterModelLoader(options?: CharacterModelOptions) {
  const model = suspend(
    (_, ...params) => loadCharacterModel(...params),
    [loadCharacterModelSymbol, ...flattenCharacterModelOptions(options)],
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

export function useInputSystem<T extends object>(
  inputs: ReadonlyArray<Input<T> | { new (domElement: HTMLElement): Input<T> }> = [
    ScreenJoystickInput,
    ScreenJumpButtonInput,
    PointerCaptureInput,
    LocomotionKeyboardInput,
  ],
  options: T = {} as T,
): InputSystem<T> {
  const dom = useThree((s) => s.gl.domElement)
  const optionsRef = useMemo(() => ({}) as T, [])
  //clearing and copying the options to optionsRef
  for (const key in optionsRef) {
    delete optionsRef[key]
  }
  Object.assign(optionsRef, options)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const system = useMemo(() => new InputSystem<T>(optionsRef), [])
  useEffect(() => {
    const removedInputs = new Set(system.inputs)
    for (const input of inputs) {
      const existingInput = system.inputs.find((existingInput) =>
        typeof input === 'function' ? existingInput instanceof input.constructor : existingInput === input,
      )
      if (existingInput != null) {
        removedInputs.delete(existingInput)
        continue
      }
      system.add(typeof input === 'function' ? new input(dom) : input)
    }
    for (const removedInput of removedInputs) {
      system.remove(removedInput)
      removedInput.dispose?.()
    }
  })
  useEffect(() => () => system.inputs.forEach((input) => input.dispose?.()), [system])
  return system
}
