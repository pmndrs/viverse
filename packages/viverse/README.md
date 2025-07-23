<h1 align="center">@pmndrs/viverse</h1>
<h3 align="center">Toolkit for building Three.js Apps for Viverse and beyond.</h3>
<br/>

<p align="center">
  <a href="https://npmjs.com/package/@react-three/viverse" target="_blank">
    <img src="https://img.shields.io/npm/v/@react-three/viverse?style=flat&colorA=000000&colorB=000000" alt="NPM" />
  </a>
  <a href="https://npmjs.com/package/@react-three/viverse" target="_blank">
    <img src="https://img.shields.io/npm/dt/@react-three/viverse.svg?style=flat&colorA=000000&colorB=000000" alt="NPM" />
  </a>
  <a href="https://twitter.com/pmndrs" target="_blank">
    <img src="https://img.shields.io/twitter/follow/pmndrs?label=%40pmndrs&style=flat&colorA=000000&colorB=000000&logo=twitter&logoColor=000000" alt="Twitter" />
  </a>
  <a href="https://discord.gg/ZZjjNvJ" target="_blank">
    <img src="https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=000000" alt="Discord" />
  </a>
</p>

```bash
npm install three @react-three/fiber @react-three/viverse
```

### What does it look like?

| A prototype map with the `SimpleCharacter` class and its default model. | ![render of the code below](../../docs/getting-started/basic-example.gif) |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------- |

```jsx
const world = new BvhPhysicsWorld()
world.addFixedBody(ground.scene)
const character = new SimpleCharacter(camera, world, canvas, { model: { url: profile.activeAvatar?.vrmUrl } })
scene.add(character)
```

## How to get started

> Some familiarity with
> threej is recommended.

Get started with building games using @pmndrs/viverse [vanilla three.js](https://pmndrs.github.io/viverse/without-react).
