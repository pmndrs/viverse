import { Container, withOpacity, Image, Text, reversePainterSortStable, Fullscreen } from '@pmndrs/uikit'
import {
  BvhPhysicsWorld,
  FirstPersonCharacterCameraBehavior,
  PrototypeMaterial,
  SimpleCharacter,
} from '@pmndrs/viverse'
import { Client } from '@viverse/sdk'
import AvatarClient from '@viverse/sdk/avatar-client'
import {
  AmbientLight,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  Clock,
  Group,
  MathUtils,
  Vector3,
  InstancedMesh,
  BoxGeometry,
  Object3D,
} from 'three'
import { GLTFLoader, Sky } from 'three/examples/jsm/Addons.js'

const camera = new PerspectiveCamera(90)
camera.position.z = 1
camera.position.y = 1

const scene = new Scene()
scene.add(camera)
const sky = new Sky()
sky.scale.setScalar(450000)
const phi = MathUtils.degToRad(40)
const theta = MathUtils.degToRad(30)
const sunPosition = new Vector3().setFromSphericalCoords(1, phi, theta)

sky.material.uniforms.sunPosition.value = sunPosition

scene.add(sky)
const dirLight = new DirectionalLight('white', 1.0)
dirLight.shadow.bias = -0.001
dirLight.shadow.mapSize.set(1024, 1024)
dirLight.shadow.camera.left = -100
dirLight.shadow.camera.right = 100
dirLight.shadow.camera.top = 100
dirLight.shadow.camera.bottom = -50
dirLight.castShadow = true
dirLight.position.set(10, 10, 10)
scene.add(dirLight)
scene.add(new AmbientLight('white', 0.3))

const canvas = document.getElementById('root') as HTMLCanvasElement

const renderer = new WebGLRenderer({ antialias: true, canvas, powerPreference: 'high-performance', alpha: true })
renderer.shadowMap.enabled = true
renderer.xr.enabled = true

const gltfLoader = new GLTFLoader()
const ground = await gltfLoader.loadAsync('./map.glb')
ground.scene.traverse((object) => {
  object.castShadow = true
  object.receiveShadow = true
})
scene.add(ground.scene)

const fullscreen = new Fullscreen(renderer, { alignItems: 'flex-end', justifyContent: 'flex-end', padding: 32 })
camera.add(fullscreen)
const viverseLogo = new Image({ src: 'viverse-logo.png', height: 64 })
fullscreen.add(viverseLogo)

// connect the viverse client and load the profile
const client =
  import.meta.env.VITE_VIVERSE_APP_ID == null
    ? undefined
    : new Client({ clientId: import.meta.env.VITE_VIVERSE_APP_ID, domain: 'https://account.htcvive.com/' })
const auth = await client?.checkAuth()
const avatarClient =
  auth == null ? undefined : new AvatarClient({ token: auth?.access_token, baseURL: 'https://sdk-api.viverse.com/' })
const profile = (await avatarClient?.getProfile()) ?? {
  name: 'Anonymous',
  activeAvatar: { headIconUrl: 'https://picsum.photos/200', vrmUrl: undefined },
}

// setup the simple character and physics
const world = new BvhPhysicsWorld()
world.addBody(ground.scene, false)
// add some instanced cubes as static obstacles
const cubeCountPerSide = 8
const cubeSpacing = 2
const half = (cubeCountPerSide - 1) * cubeSpacing * 0.5
const boxGeometry = new BoxGeometry(1, 1, 1)
const boxMaterial = new PrototypeMaterial()
boxMaterial.repeat.setScalar(1)
const cubes = new InstancedMesh(boxGeometry, boxMaterial, cubeCountPerSide * cubeCountPerSide)
cubes.position.y = 2
cubes.castShadow = true
cubes.receiveShadow = true
const dummy = new Object3D()
let i = 0
for (let x = 0; x < cubeCountPerSide; x++) {
  for (let z = 0; z < cubeCountPerSide; z++) {
    dummy.position.set(x * cubeSpacing - half, Math.random() * 5, z * cubeSpacing - half)
    dummy.rotation.y = (x + z) * 0.2
    dummy.updateMatrix()
    cubes.setMatrixAt(i++, dummy.matrix)
  }
}
cubes.instanceMatrix.needsUpdate = true
scene.add(cubes)
world.addBody(cubes, false)
const character = new SimpleCharacter(camera, world, canvas, {
  model: false,
  cameraBehavior: FirstPersonCharacterCameraBehavior,
})
scene.add(character)

// build the player tag ui
// configure the renderer to support rendering ui properly
renderer.setTransparentSort(reversePainterSortStable)
renderer.localClippingEnabled = true
const playerTag = new Group()
character.add(playerTag)
playerTag.position.y = 2.15
const container = new Container({
  depthTest: false,
  renderOrder: 1,
  '*': {
    depthTest: false,
    renderOrder: 1,
  },
  borderRadius: 10,
  paddingX: 2,
  height: 20,
  backgroundColor: withOpacity('white', 0.5),
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
})
playerTag.add(container)
const playerImage = new Image({ width: 16, height: 16, borderRadius: 8, src: profile.activeAvatar?.headIconUrl })
container.add(playerImage)
const playerText = new Text({ fontWeight: 'bold', fontSize: 12, marginRight: 3, text: profile.name })
container.add(playerText)

const clock = new Clock()
clock.start()

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta()
  character.update(delta)
  renderer.render(scene, camera)
  // update the ui
  container.update(delta)
  fullscreen.update(delta)
  // rotate the player tag to the user
  playerTag.quaternion.copy(camera.quaternion)
  //respawn player when they felt down
  if (character.position.y < -10) {
    character.position.set(0, 0, 0)
  }
})

function updateSize() {
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
}

updateSize()
window.addEventListener('resize', updateSize)
