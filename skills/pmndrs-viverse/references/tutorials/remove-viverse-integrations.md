
<a id="doc-tutorials-remove-viverse-integrations"></a>
# Remove VIVERSE Integrations

To remove the VIVERSE integrations replace the `<Viverse>` component with `<BvhPhysicsWorld>` and remove all VIVERSE-specific hooks from your components as these hooks will no longer work without the VIVERSE context.

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
import { BvhPhysicsWorld, SimpleCharacter, BvhPhysicsBody, PrototypeBox } from '@react-three/viverse'

export default function App() {
  return (
    <Canvas shadows style={{ position: "absolute", inset: "0", touchAction: "none" }}>
      <BvhPhysicsWorld>
        <Sky />
        <directionalLight intensity={1.2} position={[-10, 10, -10]} castShadow />
        <ambientLight intensity={1} />
        <SimpleCharacter />
        <BvhPhysicsBody>
          <PrototypeBox scale={[10, 1, 15]} position={[0, -0.5, 0]} />
        </BvhPhysicsBody>
      </BvhPhysicsWorld>
    </Canvas>
  )
}
```

