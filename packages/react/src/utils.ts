import { VRM } from '@pixiv/three-vrm'
import {
  CharacterCameraBehavior,
  CharacterAnimationOptions,
  CharacterModelOptions,
  flattenCharacterAnimationOptions,
  flattenCharacterModelOptions,
  loadCharacterModel,
  loadCharacterAnimation,
  CharacterCameraBehaviorOptions,
  CharacterModel,
  ScreenJoystickLocomotionActionBindings,
  ScreenButtonJumpActionBindings,
  PointerCaptureRotateZoomActionBindings,
  KeyboardLocomotionActionBindings,
  SimpleCharacterActionBindingOptions,
  applySimpleCharacterActionBindingOptions,
  KeyboardActionBinding,
  WriteonlyEventAction,
  StateAction,
  PointerButtonActionBinding,
  defaultScreenButtonStyles,
  PointerLockRotateZoomActionBindings,
  DefaultMoveBackwardKeys,
  DefaultMoveForwardKeys,
  DefaultJumpKeys,
  DefaultMoveLeftKeys,
  DefaultMoveRightKeys,
  DefaultRunKeys,
} from '@pmndrs/viverse'
import { useFrame, useThree } from '@react-three/fiber'
import { RefObject, useCallback, useEffect, useMemo, useRef } from 'react'
import { suspend } from 'suspend-react'
import { Object3D, Ray } from 'three'
import { useBvhPhysicsWorld } from './physics.js'
import { useViverseActiveAvatar } from './viverse.js'

export function useCharacterCameraBehavior(
  model: Object3D | RefObject<Object3D | null>,
  options?: CharacterCameraBehaviorOptions,
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
  const raycast = useCallback((ray: Ray, far: number) => world.raycast(ray, far)?.distance, [world])
  useFrame((state, delta) => {
    const resolvedModel = model instanceof Object3D ? model : model.current
    if (resolvedModel == null) {
      return
    }
    behaviorRef.current?.update(state.camera, resolvedModel, delta, raycast, options)
  }, -1)
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
              ...modelOptions,
              type: 'vrm',
              url: avatar?.vrmUrl,
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
 * @deprecated use the specific action binding hooks directly
 */
export function useSimpleCharacterActionBindings(
  actionBindingsClasses: ReadonlyArray<{ new (domElement: HTMLElement, abortSignal: AbortSignal): unknown }> = [
    ScreenJoystickLocomotionActionBindings,
    ScreenButtonJumpActionBindings,
    PointerCaptureRotateZoomActionBindings,
    KeyboardLocomotionActionBindings,
  ],
  options?: SimpleCharacterActionBindingOptions,
): void {
  const dom = useThree((s) => s.gl.domElement)
  const actionBindingsList = useMemo<Array<{ abortController: AbortController; actionBindings: unknown }>>(
    () => [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dom],
  )
  useEffect(() => {
    const removeActionBindingsSet = new Set(actionBindingsList)
    for (const actionBindingsClass of actionBindingsClasses) {
      const existingActionBindings = actionBindingsList.find(
        (existingActionBindings) => existingActionBindings instanceof actionBindingsClass,
      )
      if (existingActionBindings != null) {
        removeActionBindingsSet.delete(existingActionBindings)
        continue
      }
      const abortController = new AbortController()
      actionBindingsList.push({ actionBindings: new actionBindingsClass(dom, abortController.signal), abortController })
    }
    for (const entry of removeActionBindingsSet) {
      entry.abortController.abort()
      const index = actionBindingsList.indexOf(entry)
      if (index != -1) {
        actionBindingsList.splice(index, 1)
      }
    }
    applySimpleCharacterActionBindingOptions(
      actionBindingsList.map(({ actionBindings }) => actionBindings),
      options,
    )
  })
  useEffect(
    () => () => {
      actionBindingsList.forEach(({ abortController }) => abortController.abort())
      actionBindingsList.length = 0
    },
    [actionBindingsList],
  )
}

export function useKeyboardActionBinding(
  action: WriteonlyEventAction<KeyboardEvent> | StateAction<boolean>,
  options: { keys: Array<string>; requiresPointerLock?: boolean },
) {
  const ref = useRef<KeyboardActionBinding>(undefined)
  const domElement = useThree((s) => s.gl.domElement)
  useEffect(() => {
    const abortController = new AbortController()
    ref.current = new KeyboardActionBinding(action, domElement, abortController.signal)
    return () => abortController.abort()
  }, [action, domElement])
  useEffect(() => {
    if (ref.current == null) {
      return
    }
    ref.current.keys = options.keys
    ref.current.requiresPointerLock = options.requiresPointerLock
  })
}

export function usePointerButtonActionBinding(
  action: WriteonlyEventAction<PointerEvent> | StateAction<boolean>,
  options: {
    domElement?: HTMLElement | RefObject<HTMLElement | null>
    buttons?: Array<number>
    requiresPointerLock?: boolean
  },
) {
  const ref = useRef<PointerButtonActionBinding>(undefined)
  const canvasDomElement = useThree((s) => s.gl.domElement)
  const domElement = options.domElement ?? canvasDomElement
  useEffect(() => {
    const abortController = new AbortController()
    ref.current = new PointerButtonActionBinding(
      action,
      domElement instanceof HTMLElement ? domElement : domElement.current!,
      abortController.signal,
    )
    return () => abortController.abort()
  }, [action, domElement])
  useEffect(() => {
    if (ref.current == null) {
      return
    }
    ref.current.buttons = options.buttons
    ref.current.requiresPointerLock = options.requiresPointerLock
  })
}

export function usePointerCaptureRotateZoomActionBindings(options?: { rotationSpeed?: number; zoomSpeed?: number }) {
  const ref = useRef<PointerCaptureRotateZoomActionBindings>(undefined)
  const domElement = useThree((s) => s.gl.domElement)
  useEffect(() => {
    const abortController = new AbortController()
    ref.current = new PointerCaptureRotateZoomActionBindings(domElement, abortController.signal)
    return () => abortController.abort()
  }, [domElement])
  useEffect(() => {
    if (ref.current == null) {
      return
    }
    ref.current.rotationSpeed = options?.rotationSpeed
    ref.current.zoomSpeed = options?.zoomSpeed
  })
}

export function usePointerLockRotateZoomActionBindings(options?: {
  rotationSpeed?: number
  zoomSpeed?: number
  lockOnClick?: boolean
}) {
  const ref = useRef<PointerLockRotateZoomActionBindings>(undefined)
  const domElement = useThree((s) => s.gl.domElement)
  useEffect(() => {
    const abortController = new AbortController()
    ref.current = new PointerLockRotateZoomActionBindings(domElement, abortController.signal)
    return () => abortController.abort()
  }, [domElement])
  useEffect(() => {
    if (ref.current == null) {
      return
    }
    ref.current.lockOnClick = options?.lockOnClick
    ref.current.rotationSpeed = options?.rotationSpeed
    ref.current.zoomSpeed = options?.zoomSpeed
  })
}

export function useKeyboardLocomotionActionBindings(options?: {
  moveForwardKeys?: Array<string>
  moveBackwardKeys?: Array<string>
  moveLeftKeys?: Array<string>
  moveRightKeys?: Array<string>
  runKeys?: Array<string>
  jumpKeys?: Array<string>
  requiresPointerLock?: boolean
}) {
  const ref = useRef<KeyboardLocomotionActionBindings>(undefined)
  const domElement = useThree((s) => s.gl.domElement)
  useEffect(() => {
    const abortController = new AbortController()
    ref.current = new KeyboardLocomotionActionBindings(domElement, abortController.signal)
    return () => abortController.abort()
  }, [domElement])
  useEffect(() => {
    if (ref.current == null) {
      return
    }
    ref.current.moveBackwardBinding.keys = options?.moveBackwardKeys ?? DefaultMoveBackwardKeys
    ref.current.moveBackwardBinding.requiresPointerLock = options?.requiresPointerLock
    ref.current.moveForwardBinding.keys = options?.moveForwardKeys ?? DefaultMoveForwardKeys
    ref.current.moveForwardBinding.requiresPointerLock = options?.requiresPointerLock
    ref.current.jumpBinding.keys = options?.jumpKeys ?? DefaultJumpKeys
    ref.current.jumpBinding.requiresPointerLock = options?.requiresPointerLock
    ref.current.moveLeftBinding.keys = options?.moveLeftKeys ?? DefaultMoveLeftKeys
    ref.current.moveLeftBinding.requiresPointerLock = options?.requiresPointerLock
    ref.current.moveRightBinding.keys = options?.moveRightKeys ?? DefaultMoveRightKeys
    ref.current.moveRightBinding.requiresPointerLock = options?.requiresPointerLock
    ref.current.runBinding.keys = options?.runKeys ?? DefaultRunKeys
    ref.current.runBinding.requiresPointerLock = options?.requiresPointerLock
  })
}
export function useScreenButton(image: string): HTMLElement {
  const element = useMemo(() => document.createElement('div'), [])
  element.style.backgroundImage = image
  const domElement = useThree((s) => s.gl.domElement)
  useEffect(() => {
    domElement.className = 'viverse-button viverse-jump mobile-only'
    const parent = domElement.parentNode ?? domElement
    parent.appendChild(element)
    Object.assign(element.style, defaultScreenButtonStyles)
    const stopPropagation = (e: Event) => e.stopPropagation()
    element.addEventListener('pointerdown', stopPropagation)
    return () => {
      element.remove()
      element.removeEventListener('pointerdown', stopPropagation)
    }
  }, [element, domElement])
  return element
}

export function useScreenJoystickLocomotionActionBindings(options?: { runDistancePx?: number; deadZonePx?: number }) {
  const ref = useRef<ScreenJoystickLocomotionActionBindings>(undefined)
  const domElement = useThree((s) => s.gl.domElement)
  useEffect(() => {
    const abortController = new AbortController()
    ref.current = new ScreenJoystickLocomotionActionBindings(domElement, abortController.signal)
    return () => abortController.abort()
  }, [domElement])
  useEffect(() => {
    if (ref.current == null) {
      return
    }
    ref.current.deadZonePx = options?.deadZonePx
    ref.current.runDistancePx = options?.runDistancePx
  })
}
