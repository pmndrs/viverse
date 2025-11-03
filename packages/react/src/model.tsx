import { CharacterModel } from '@pmndrs/viverse'
import { createContext, ReactNode, useContext } from 'react'

const CharacterModelContext = createContext<CharacterModel | undefined>(undefined)

export function CharacterModelProvider({ model, children }: { children?: ReactNode; model: CharacterModel }) {
  return <CharacterModelContext.Provider value={model}>{children}</CharacterModelContext.Provider>
}

export function useCharacterModel(): CharacterModel {
  const model = useContext(CharacterModelContext)
  if (model == null) {
    throw new Error(`useCharacterModel can only be used inside a CharacterModelProvider`)
  }
  return model
}
