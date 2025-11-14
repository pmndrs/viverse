import { Gltf } from '@react-three/drei'
import { BvhPhysicsBody } from '@react-three/viverse'
import { useState, useEffect } from 'react'
import { Group, Mesh, MeshStandardMaterial } from 'three'

export function Map() {
  const [map, setMap] = useState<Group | null>(null)
  useEffect(
    () =>
      map?.traverse(
        (object) =>
          object.name === 'Plane' &&
          object instanceof Mesh &&
          (object.receiveShadow = true) &&
          (object.material = new MeshStandardMaterial({
            roughness: 1,
            metalness: 0,
            map: object.material.map,
          })),
      ),
    [map],
  )
  return (
    <BvhPhysicsBody>
      <Gltf ref={setMap} scale={0.3} src="map.glb" />
    </BvhPhysicsBody>
  )
}
