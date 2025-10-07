import { getIsMobileMediaQuery } from '@pmndrs/viverse'
import { useSyncExternalStore } from 'react'

export function useIsMobile(): boolean {
  const subscribe = (onStoreChange: () => void) => {
    const mediaQuery = getIsMobileMediaQuery()
    if (mediaQuery == null) return () => {}
    const handler = () => onStoreChange()
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }

  const getSnapshot = () => getIsMobileMediaQuery()?.matches ?? false
  const getServerSnapshot = () => false

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
