import {
  BvhCharacterPhysics,
  BvhCharacterPhysicsOptions,
  BvhPhysicsWorld as VanillaBvhPhysicsWorld,
} from '@pmndrs/viverse'
import { useFrame } from '@react-three/fiber'
import {
  createContext,
  forwardRef,
  ReactNode,
  RefObject,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'
import { Object3D } from 'three'

const BvhPhyiscsWorldContext = createContext<VanillaBvhPhysicsWorld | undefined>(undefined)
/**
 * provides the bvh physics world context
 */
export function BvhPhysicsWorld({ children }: { children?: ReactNode }) {
  const world = useMemo(() => new VanillaBvhPhysicsWorld(), [])
  return <BvhPhyiscsWorldContext.Provider value={world}>{children}</BvhPhyiscsWorldContext.Provider>
}

export function useBvhPhysicsWorld() {
  const world = useContext(BvhPhyiscsWorldContext)
  if (world == null) {
    throw new Error('useBvhPhysicsWorld must be used within a BvhPhysicsWorld component')
  }
  return world
}

export function useBvhCharacterPhysics(
  model: Object3D | RefObject<Object3D | null>,
  options?: BvhCharacterPhysicsOptions,
) {
  const world = useBvhPhysicsWorld()
  const characterPhysics = useMemo(() => new BvhCharacterPhysics(world), [world])
  useFrame((_, delta) => {
    const resolvedModel = model instanceof Object3D ? model : model.current
    if (resolvedModel == null) {
      return
    }
    characterPhysics.update(resolvedModel, delta, options)
  })
  return characterPhysics
}

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
  const world = useBvhPhysicsWorld()
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
    const world = useBvhPhysicsWorld()
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
