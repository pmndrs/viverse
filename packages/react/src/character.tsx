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
} from '@pmndrs/viverse'
import {
  createContext,
  forwardRef,
  ReactNode,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'
import { useFrame, useThree, extend, ThreeElement } from '@react-three/fiber'
import { Camera, Group, Object3D, OrthographicCamera } from 'three'
import { useViverseActiveAvatar } from './index.js'
import { clear, suspend } from 'suspend-react'
import type {} from '@pmndrs/pointer-events'

const BvhPhyiscsWorldContext = createContext<BvhPhysicsWorldImpl | undefined>(undefined)

extend({ SimpleCharacterImpl })
declare module '@react-three/fiber' {
  interface ThreeElements {
    simpleCharacterImpl: ThreeElement<typeof SimpleCharacterImpl>
  }
}

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
export const SimpleCharacter = forwardRef<Group, SimpleCharacterOptions & { children?: ReactNode }>(
  ({ children, input, ...options }, ref) => {
    const avatar = useViverseActiveAvatar()
    const world = useContext(BvhPhyiscsWorldContext)
    if (world == null) {
      throw new Error('SimpleCharacter must be used within a BvhPhysicsWorld component')
    }
    const camera = useThree((s) => s.camera)
    const domElement = useThree((s) => s.gl.domElement)
    const newOptions = {
      ...options,
      model:
        options.model != false && avatar != null
          ? { url: avatar?.vrmUrl, ...(options.model === true ? undefined : options.model) }
          : options.model,
    } satisfies SimpleCharacterOptions
    const preloadSimpleCharacterAssetsKeys = [
      JSON.stringify(options.model),
      ...simpleCharacterAnimationNames.map((name) => JSON.stringify(options.animation?.[name])),
    ]
    suspend(async () => {
      const result = await preloadSimpleCharacterAssets(newOptions)
      result.vrm?.scene.addEventListener('dispose', () =>
        clear([PreloadSimpleCharacterAssetsSymbol, ...preloadSimpleCharacterAssetsKeys]),
      )
      return result
    }, [PreloadSimpleCharacterAssetsSymbol, ...preloadSimpleCharacterAssetsKeys])
    const currentOptions = useMemo<SimpleCharacterOptions>(() => ({}), preloadSimpleCharacterAssetsKeys)
    Object.assign(currentOptions, newOptions)
    const internalRef = useRef<SimpleCharacterImpl>(null)
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
      Array.isArray(input) ? [...input, domElement] : [input, domElement],
    )
    useImperativeHandle(ref, () => internalRef.current!, [camera as any, world, domElement, currentOptions])
    useFrame((_, delta) => internalRef.current?.update(delta))
    return (
      <simpleCharacterImpl args={[camera as any, world, domElement, currentOptions]} ref={internalRef}>
        {children}
      </simpleCharacterImpl>
    )
  },
)

/**
 * allows to add all children as static (non-moving) objects to the bvh physics world
 * @requires that the inner content is not dynamic
 * do not wrap the content inside in a suspense!
 */
export const FixedBvhPhysicsBody = forwardRef<Object3D, { children?: ReactNode }>(({ children }, ref) => {
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
    world.addFixedBody(body)
    return () => world.removeFixedBody(body)
  }, [world])
  useImperativeHandle(ref, () => internalRef.current!, [])
  return <group ref={internalRef}>{children}</group>
})

export function VrmCharacterModelBone({ bone }: { bone: VRMHumanBoneName }) {}
