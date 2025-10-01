import { VRM } from '@pixiv/three-vrm'
import {
  BvhPhysicsWorld as BvhPhysicsWorldImpl,
  SimpleCharacterOptions,
  SimpleCharacter as SimpleCharacterImpl,
  VRMHumanBoneName,
  preloadSimpleCharacterAssets,
  simpleCharacterAnimationNames,
  InputSystem,
  LocomotionKeyboardInput,
  PointerCaptureInput,
  type loadCharacterModel,
} from '@pmndrs/viverse'
import { useFrame, useThree, extend, ThreeElement, createPortal } from '@react-three/fiber'
import {
  createContext,
  forwardRef,
  Fragment,
  ReactNode,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { clear, suspend } from 'suspend-react'
import { Group, Object3D, Quaternion } from 'three'
import { create, StoreApi } from 'zustand'
import { useViverseActiveAvatar } from './index.js'

const BvhPhyiscsWorldContext = createContext<BvhPhysicsWorldImpl | undefined>(undefined)

extend({ SimpleCharacterImpl })
declare module '@react-three/fiber' {
  interface ThreeElements {
    simpleCharacterImpl: ThreeElement<typeof SimpleCharacterImpl>
  }
}

const CharacterModelStoreContext = createContext<
  StoreApi<{ model: Awaited<ReturnType<typeof loadCharacterModel>> | undefined }> | undefined
>(undefined)

/**
 * provides the bvh physics world context
 */
export function BvhPhysicsWorld({ children }: { children?: ReactNode }) {
  const world = useMemo(() => new BvhPhysicsWorldImpl(), [])
  return <BvhPhyiscsWorldContext.Provider value={world}>{children}</BvhPhyiscsWorldContext.Provider>
}

const PreloadSimpleCharacterAssetsSymbol = Symbol('preload-simple-character-assets')

/**
 * creates a simple character controller supporting running, walking, and jumping with a default avatar and animations with can be configutred
 */
export const SimpleCharacter = forwardRef<
  Group,
  SimpleCharacterOptions & { useViverseAvatar?: boolean; children?: ReactNode } & ThreeElement<typeof Group>
>(
  (
    { children, useViverseAvatar = true, input, movement, model, physics, cameraBehavior, animation, ...groupProps },
    ref,
  ) => {
    const avatar = useViverseActiveAvatar()
    const world = useContext(BvhPhyiscsWorldContext)
    if (world == null) {
      throw new Error('SimpleCharacter must be used within a BvhPhysicsWorld component')
    }
    const camera = useThree((s) => s.camera)
    const domElement = useThree((s) => s.gl.domElement)
    const newOptions = {
      movement,
      physics,
      cameraBehavior,
      animation,
      model:
        model != false && avatar != null && useViverseAvatar
          ? {
              type: avatar.vrmUrl != null ? 'vrm' : undefined,
              url: avatar?.vrmUrl,
              ...(model === true ? undefined : model),
            }
          : model,
    } satisfies SimpleCharacterOptions
    const preloadSimpleCharacterAssetsKeys = [
      JSON.stringify(newOptions.model),
      ...simpleCharacterAnimationNames.map((name) => JSON.stringify(newOptions.animation?.[name])),
    ]
    suspend(async () => {
      const result = await preloadSimpleCharacterAssets(newOptions)
      result.model?.scene.addEventListener('dispose', () =>
        clear([PreloadSimpleCharacterAssetsSymbol, ...preloadSimpleCharacterAssetsKeys]),
      )
      return result
    }, [PreloadSimpleCharacterAssetsSymbol, ...preloadSimpleCharacterAssetsKeys])
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const currentOptions = useMemo<SimpleCharacterOptions>(() => ({}), preloadSimpleCharacterAssetsKeys)
    Object.assign(currentOptions, newOptions)
    const internalRef = useRef<SimpleCharacterImpl>(null)
    const store = useMemo(
      () => create<{ model: Awaited<ReturnType<typeof loadCharacterModel>> | undefined }>(() => ({ model: undefined })),
      [],
    )
    useEffect(
      () => {
        if (internalRef.current == null) {
          return
        }
        if (input == null || 'length' in input) {
          internalRef.current.inputSystem = new InputSystem(
            domElement,
            input ?? [LocomotionKeyboardInput, PointerCaptureInput],
          )
          return
        }
        internalRef.current.inputSystem = input
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Array.isArray(input) ? [...input, domElement] : [input, domElement],
    )
    useEffect(() => {
      const simpleCharacter = internalRef.current
      if (simpleCharacter == null) {
        return
      }
      simpleCharacter.addEventListener('loaded', () => {
        store.setState({ model: simpleCharacter.model })
      })
      if (simpleCharacter.model != null) {
        store.setState({ model: simpleCharacter.model })
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [camera as any, world, domElement, currentOptions])
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useImperativeHandle(ref, () => internalRef.current!, [camera as any, world, domElement, currentOptions])
    useFrame((_, delta) => internalRef.current?.update(delta))
    return (
      <simpleCharacterImpl {...groupProps} args={[camera as any, world, domElement, currentOptions]} ref={internalRef}>
        <CharacterModelStoreContext.Provider value={store}>{children}</CharacterModelStoreContext.Provider>
      </simpleCharacterImpl>
    )
  },
)

/**
 * @deprecated use <BvhPhysicsBody kinematic={false} /> instead (kinematic={false} can be skipped as its the default)
 */
export const FixedBvhPhysicsBody = forwardRef<Object3D, { children?: ReactNode }>(({ children }, ref) => {
  return <BvhPhysicsBody> {children}</BvhPhysicsBody>
})

/**
 * allows to add all children as static (non-moving) objects as sensors to the bvh physics world
 * @requires that the structure of the inner content is not changing or has a suspense boundary
 * do not wrap the content inside in a suspense!
 */
export const BvhPhysicsSensor = forwardRef<
  Object3D,
  { children?: ReactNode; isStatic?: boolean; onIntersectedChanged?: (intersected: boolean) => void }
>(({ children, isStatic = true, onIntersectedChanged }, ref) => {
  const world = useContext(BvhPhyiscsWorldContext)
  if (world == null) {
    throw new Error('BvhPhysicsSensor must be used within a BvhPhysicsWorld component')
  }
  const internalRef = useRef<Object3D>(null)
  const listenerRef = useRef(onIntersectedChanged)
  listenerRef.current = onIntersectedChanged
  useEffect(() => {
    const body = internalRef.current
    if (body == null) {
      return
    }
    world.addSensor(body, isStatic, (intersected) => listenerRef.current?.(intersected))
    return () => world.removeSensor(body)
  }, [world, isStatic])
  useImperativeHandle(ref, () => internalRef.current!, [])
  return <group ref={internalRef}>{children}</group>
})

/**
 * allows to add all children as static (non-moving) or kinematic (moving) objects as obstacles to the bvh physics world
 * @requires that the structure of the inner content is not changing or has a suspense boundary
 * do not wrap the content inside in a suspense!
 */
export const BvhPhysicsBody = forwardRef<Object3D, { children?: ReactNode; kinematic?: boolean }>(
  ({ children, kinematic = false }, ref) => {
    const world = useContext(BvhPhyiscsWorldContext)
    if (world == null) {
      throw new Error('FixedPhysicsBody must be used within a BvhPhysicsWorld component')
    }
    const internalRef = useRef<Object3D>(null)
    useEffect(() => {
      const body = internalRef.current
      if (body == null) {
        return
      }
      world.addBody(body, kinematic)
      return () => world.removeBody(body)
    }, [world, kinematic])
    useImperativeHandle(ref, () => internalRef.current!, [])
    return <group ref={internalRef}>{children}</group>
  },
)

export function CharacterModelBone({ bone, children }: { bone: VRMHumanBoneName; children?: ReactNode }) {
  const [state, setState] = useState<{ boneObject: Object3D; boneRotationOffset?: Quaternion } | undefined>(undefined)
  const store = useContext(CharacterModelStoreContext)
  useEffect(() => {
    if (store == null) {
      return
    }
    const updateContainer = ({ model }: { model: Awaited<ReturnType<typeof loadCharacterModel>> | undefined }) => {
      if (model == null) {
        return
      }
      const boneObject = model instanceof VRM ? model.humanoid.getRawBoneNode(bone) : model.scene.getObjectByName(bone)
      if (boneObject == null) {
        return
      }
      setState({ boneObject: boneObject as any, boneRotationOffset: model.boneRotationOffset })
    }
    updateContainer(store.getState())
    return store.subscribe(updateContainer)
  }, [bone, store])
  if (state == null) {
    return null
  }
  return (
    <Fragment key={state.boneObject.id}>
      {createPortal(<group quaternion={state.boneRotationOffset}>{children}</group>, state.boneObject)}
    </Fragment>
  )
}
