import { PrototypeMaterial } from '@pmndrs/viverse'
import { extend, ThreeElement } from '@react-three/fiber'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { ColorRepresentation, Group, PlaneGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

extend({ PrototypeMaterial })
declare module '@react-three/fiber' {
  interface ThreeElements {
    prototypeMaterial: ThreeElement<typeof PrototypeMaterial>
  }
}

const plane1 = new PlaneGeometry()
plane1.translate(0, 0, 0.5)
const plane2 = new PlaneGeometry()
plane2.rotateY(Math.PI)
plane2.translate(0, 0, -0.5)
const twoPlanes = mergeGeometries([plane1, plane2])

/**
 * component for rendering a simple placeholder prototype box using a the Prototype Material with a prototype texture from kenney.nl
 */
export const PrototypeBox = forwardRef<Group, ThreeElement<typeof Group> & { color?: ColorRepresentation }>(
  (props, ref) => {
    const internalRef = useRef<Group>(null)
    const mat1Ref = useRef<PrototypeMaterial>(null)
    const mat2Ref = useRef<PrototypeMaterial>(null)
    const mat3Ref = useRef<PrototypeMaterial>(null)
    useEffect(() => {
      if (
        mat1Ref.current == null ||
        mat2Ref.current == null ||
        mat3Ref.current == null ||
        internalRef.current == null
      ) {
        return
      }
      const scaleX = Math.max(0.5, Math.round(internalRef.current.scale.x) / 2)
      const scaleY = Math.max(0.5, Math.round(internalRef.current.scale.y) / 2)
      const scaleZ = Math.max(0.5, Math.round(internalRef.current.scale.z) / 2)
      mat1Ref.current.repeat.set(scaleX, scaleZ)
      mat2Ref.current.repeat.set(scaleZ, scaleY)
      mat3Ref.current.repeat.set(scaleX, scaleY)
    })
    useImperativeHandle(ref, () => internalRef.current!, [])
    return (
      <group {...props} ref={internalRef}>
        <mesh rotation-x={Math.PI / 2} geometry={twoPlanes} castShadow receiveShadow>
          <prototypeMaterial ref={mat1Ref} color={props.color} />
        </mesh>
        <mesh rotation-y={Math.PI / 2} geometry={twoPlanes} castShadow receiveShadow>
          <prototypeMaterial ref={mat2Ref} color={props.color} />
        </mesh>
        <mesh geometry={twoPlanes} castShadow receiveShadow>
          <prototypeMaterial ref={mat3Ref} color={props.color} />
        </mesh>
      </group>
    )
  },
)
