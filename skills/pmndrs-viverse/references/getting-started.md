
<!-- From: getting-started/index.mdx -->
<a id="doc-getting-started-index"></a>
# Introduction

```bash
npm install three @react-three/fiber @react-three/viverse
```

### What does it look like?

> A prototype map with the `<SimpleCharacter/>` component and its default model

<!-- Sandpack/Sandbox replaced: inline code and dependencies -->
Dependencies:

```js
{
      'three': 'latest',
      '@react-three/fiber': '<9',
      '@react-three/viverse': 'latest',
      '@react-three/drei': '<10'
    }
```

Files:

File: /App.tsx

```tsx
import { Sky } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Viverse, SimpleCharacter, BvhPhysicsBody, PrototypeBox } from '@react-three/viverse'

export default function App() {
  return (
    <Canvas shadows style={{ position: "absolute", inset: "0", touchAction: "none" }}>
      <Viverse>
        <Sky />
        <directionalLight intensity={1.2} position={[-10, 10, -10]} castShadow />
        <ambientLight intensity={1} />
        <SimpleCharacter />
        <BvhPhysicsBody>
          <PrototypeBox scale={[10, 1, 15]} position={[0, -0.5, 0]} />
        </BvhPhysicsBody>
      </Viverse>
    </Canvas>
  )
}
```


## How to get started

> Some familiarity with
> react, threejs, and @react-three/fiber, is recommended.

Get started with **[building a simple game](#doc-tutorials-simple-game)**, take a look at our **[examples](#doc-getting-started-examples)**, or follow one of our **tutorials**:

- [First person controls](#doc-tutorials-first-person)
- [Augmented and virtual reality](#doc-tutorials-augmented-and-virtual-reality)
- [Accessing avatar and profile](#doc-tutorials-access-avatar-and-profile)
- [Equipping the character with items](#doc-tutorials-equipping-items)
- [Using custom animations and models](#doc-tutorials-custom-models-and-animations)
- [Actions](#doc-tutorials-actions)
- [Custom Character Controller](#doc-tutorials-custom-character-controller)
- [How to remove the viverse integrations](#doc-tutorials-remove-viverse-integrations)
- [Publish to VIVERSE](#doc-tutorials-publish-to-viverse)
- [Vibe coding with @react-three/viverse (using AI)](../tutorials/vibe-coding-with-ai.mdx)

## Not into react?

> No Problem

Check out how to build games using @pmndrs/viverse and only [vanilla three.js](#doc-without-react-introduction).

## Acknowledgments

This project would not be possible without the default model and default animations made by [Quaternius](https://quaternius.com/), the prototype texture from [kenney.nl](https://www.kenney.nl/), and the [three-vrm project](https://github.com/pixiv/three-vrm) from the [pixiv team](https://github.com/pixiv)!

<!-- From: getting-started/examples.md -->
<a id="doc-getting-started-examples"></a>
# Examples

<Grid cols={2}>
  <li>
    [![Screenshot from the react example](./react-example.png)](https://worlds.viverse.com/wyTQbnB)  
    Simple Game Example w. a Player Tag
  </li>
  <li>
    [![Screenshot from the vanilla example](./vanilla-example.png)](https://worlds.viverse.com/kjALCp2)  
    Simple Game Example using Vanilla Threejs
  </li>
  <li>
    [![Screenshot from the AR example](./ar-example.gif)](https://worlds.viverse.com/UB6VBmX)  
    Augemented Reality Example using WebXR
  </li>
  <li>
    [![Screenshot from the VR example](./vr-example.gif)](https://worlds.viverse.com/asuA4ay)  
    Virtual Reality Example using WebXR
  </li>
  <li>
    [![Screenshot from the Fortnite example](./fortnite-example.gif)](https://worlds.viverse.com/ziWwWno)  
    Fortnite Character Controller Example
  </li>
</Grid>

