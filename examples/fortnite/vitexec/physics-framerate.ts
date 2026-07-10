import {
  BvhCharacterPhysics,
  BvhPhysicsWorld,
} from '/@fs/Users/bela/Documents/react-three-viverse/packages/viverse/src/physics/index.ts'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Group, Object3D } from 'three'

const map = (await new GLTFLoader().loadAsync('/map.glb')).scene
map.scale.setScalar(0.3)
map.updateWorldMatrix(true, true)

function fallsThrough(spawnY: number, physicsHz: number) {
  const world = new BvhPhysicsWorld()
  world.addBody(map, false)
  const physics = new BvhCharacterPhysics(world)
  const parent = new Group()
  const character = new Object3D()
  parent.add(character)
  character.position.y = spawnY

  // Emulate a severely janked device: one render update every 200 ms.
  for (let frame = 0; frame < 30; frame++) {
    physics.update(character, 0.2, { updatesPerSecond: physicsHz })
  }
  return character.position.y < -5
}

function phaseSweep(physicsHz: number) {
  const failedSpawnHeights: Array<number> = []
  for (let index = 0; index <= 40; index++) {
    const spawnY = 69 + index * 0.05
    if (fallsThrough(spawnY, physicsHz)) failedSpawnHeights.push(spawnY)
  }
  console.log('phase-sweep', JSON.stringify({ physicsHz, failedSpawnHeights }))
  return failedSpawnHeights
}

function benchmarkGroundedUpdates() {
  const world = new BvhPhysicsWorld()
  world.addBody(map, false)
  const physics = new BvhCharacterPhysics(world)
  const parent = new Group()
  const character = new Object3D()
  parent.add(character)
  character.position.y = -0.775

  const start = performance.now()
  for (let frame = 0; frame < 6_000; frame++) {
    physics.update(character, 1 / 60)
  }
  const duration = performance.now() - start
  console.log('grounded-update-benchmark', JSON.stringify({ updates: 6_000, duration }))
  return duration
}

const failuresAt60Hz = phaseSweep(60)

if (failuresAt60Hz.length !== 0) {
  throw new Error(`Character fell through the production map from ${failuresAt60Hz.length} spawn heights`)
}

const groundedUpdateDuration = benchmarkGroundedUpdates()
if (groundedUpdateDuration > 1_000) {
  throw new Error(`6,000 grounded updates took ${groundedUpdateDuration.toFixed(1)}ms`)
}

console.log('physics-framerate-regression-passed')
