import { ClientOptions, Client, checkAuthOptions } from '@viverse/sdk'
import AvatarClient from '@viverse/sdk/avatar-client'
import { createContext, ReactNode, useCallback, useContext } from 'react'
import { suspend, clear } from 'suspend-react'
import { BvhPhysicsWorld } from './character.js'

// auth

const viverseCheckAuthSymbol = Symbol('viverse-check-auth')

const authSuspenseKeys: Array<Array<any>> = []

function clearViverseAuthCheck() {
  for (const keys of authSuspenseKeys) {
    clear(keys)
  }
  authSuspenseKeys.length = 0
}

function useViverseAuthCheck(client: Client | undefined, options?: checkAuthOptions) {
  const keys = [viverseCheckAuthSymbol, client, options?.allowedOrigin]
  return suspend(async () => {
    authSuspenseKeys.push(keys)
    return client?.checkAuth({ allowedOrigin: options?.allowedOrigin })
  }, keys)
}

// main viverse component

const ViverseClientContext = createContext<Client | undefined>(undefined)
const ViverseAuthContext = createContext<Awaited<ReturnType<Client['checkAuth']>>>(undefined)
const ViverseAvatarClientContext = createContext<AvatarClient | undefined>(undefined)

declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_VIVERSE_APP_ID?: string
    }
  }
}

const viverseClientSymbol = Symbol('viverse-client')
const viverseAvatarClientSymbol = Symbol('viverse-avatar-client')

/**
 * provides the BvhPhysicsWorld context and the viverse context necassary for accessing any viverse content
 * @param props.loginRequired forces the user to login before playing
 */
export function Viverse({
  children,
  loginRequired = false,
  checkAuth,
  ...options
}: Partial<ClientOptions> & { children?: ReactNode; loginRequired?: boolean; checkAuth?: checkAuthOptions }) {
  const clientId = options.clientId
  const client = suspend(
    async () =>
      clientId == null
        ? undefined
        : new Client({
            domain: options.domain ?? 'account.htcvive.com',
            authorizationParams: options.authorizationParams,
            cookieDomain: options.cookieDomain,
            httpTimeoutInMS: options.httpTimeoutInMS,
            clientId,
          }),
    [
      viverseClientSymbol,
      clientId,
      options.authorizationParams,
      options.cookieDomain,
      options.domain,
      options.httpTimeoutInMS,
    ],
  )

  const auth = useViverseAuthCheck(client)
  if (clientId != null && auth == null && loginRequired) {
    clearViverseAuthCheck()
    client?.loginWithWorlds().catch(console.error)
  }
  const avatarClient = suspend(
    async () =>
      auth?.access_token != null
        ? new AvatarClient({ token: auth.access_token, baseURL: 'https://sdk-api.viverse.com/' })
        : undefined,
    [viverseAvatarClientSymbol, auth?.access_token],
  )

  if (client == null) {
    return <BvhPhysicsWorld>{children}</BvhPhysicsWorld>
  }

  return (
    <ViverseClientContext.Provider value={client}>
      <ViverseAuthContext.Provider value={auth}>
        <ViverseAvatarClientContext.Provider value={avatarClient}>
          <BvhPhysicsWorld>{children}</BvhPhysicsWorld>
        </ViverseAvatarClientContext.Provider>
      </ViverseAuthContext.Provider>
    </ViverseClientContext.Provider>
  )
}

/**
 * Hook to access the Viverse client instance for making API calls.
 */
export function useViverseClient(): Client | undefined {
  return useContext(ViverseClientContext)
}

/**
 * Hook to access the current authentication state.
 */
export function useViverseAuth() {
  return useContext(ViverseAuthContext)
}

/**
 * Hook to access the Viverse avatar client for avatar-related operations.
 */
export function useViverseAvatarClient() {
  return useContext(ViverseAvatarClientContext)
}

const viverseProfileSymbol = Symbol('viverse-profile')
/**
 * Hook to fetch and access the user's Viverse profile information.
 * Uses React Suspense for data fetching.
 */
export function useViverseProfile(): Awaited<ReturnType<AvatarClient['getProfile']>> | undefined {
  const avatarClient = useViverseAvatarClient()
  return suspend(async () => avatarClient?.getProfile(), [viverseProfileSymbol, avatarClient])
}

/**
 * Hook that returns a function to initiate Viverse login flow.
 */
export function useViverseLogin() {
  const client = useViverseClient()
  return useCallback(
    (...params: Parameters<Client['loginWithWorlds']>) => {
      if (client == null) {
        console.warn(
          `useViverseLogin was called without an available client either because not Viverse provider is available or because no client id was provided to the Viverse provider`,
        )
        return
      }
      clearViverseAuthCheck()
      client.loginWithWorlds(...params)
    },
    [client],
  )
}

/**
 * Hook that returns a function to initiate Viverse logout flow.
 */
export function useViverseLogout() {
  const client = useViverseClient()
  return useCallback(
    (...params: Parameters<Client['logoutWithWorlds']>) => {
      if (client == null) {
        console.warn(
          `useViverseLogout was called without an available client either because not Viverse provider is available or because no client id was provided to the Viverse provider`,
        )
        return
      }
      clearViverseAuthCheck()
      client.logoutWithWorlds(...params)
    },
    [client],
  )
}

const viverseAvatarListSymbol = Symbol('viverse-avatar-list')
/**
 * Hook to fetch the user's personal avatar collection.
 * Uses React Suspense for data fetching.
 */
export function useViverseAvatarList(): Awaited<ReturnType<AvatarClient['getAvatarList']>> | undefined {
  const avatarClient = useViverseAvatarClient()
  return suspend(async () => avatarClient?.getAvatarList(), [viverseAvatarListSymbol, avatarClient])
}

const viverseActiveAvatarSymbol = Symbol('viverse-active-avatar')
/**
 * Hook to fetch the user's currently active/selected avatar.
 * Uses React Suspense for data fetching.
 */
export function useViverseActiveAvatar(): Awaited<ReturnType<AvatarClient['getActiveAvatar']>> | undefined {
  const avatarClient = useViverseAvatarClient()
  return suspend(async () => avatarClient?.getActiveAvatar(), [viverseActiveAvatarSymbol, avatarClient])
}

const viversePublicAvatarListSymbol = Symbol('viverse-public-avatar-list')
/**
 * Hook to fetch the list of publicly available avatars in Viverse.
 * Uses React Suspense for data fetching.
 */
export function useViversePublicAvatarList(): Awaited<ReturnType<AvatarClient['getPublicAvatarList']>> | undefined {
  const avatarClient = useViverseAvatarClient()
  return suspend(async () => avatarClient?.getPublicAvatarList(), [viversePublicAvatarListSymbol, avatarClient])
}

const viversePublicAvatarByIDSymbol = Symbol('viverse-public-avatar-by-id')
/**
 * Hook to fetch a specific public avatar by its ID.
 * Uses React Suspense for data fetching.
 */
export function useViversePublicAvatarByID(
  id: string,
): Awaited<ReturnType<AvatarClient['getPublicAvatarByID']>> | undefined {
  const avatarClient = useViverseAvatarClient()
  return suspend(async () => avatarClient?.getPublicAvatarByID(id), [viversePublicAvatarByIDSymbol, avatarClient, id])
}

export * from './character.js'
export * from './material.js'
export {
  mixamoBoneMap,
  FirstPersonCharacterCameraBehavior,
  SimpleCharacter as SimpleCharacterImpl,
  type SimpleCharacterOptions,
  LocomotionKeyboardInput,
  PointerCaptureInput,
  PointerLockInput,
  type InputField,
  InputSystem,
  type LocomotionKeyboardInputOptions,
  type PointerLockInputOptions,
  type PointerCaptureInputOptions,
  ScreenJoystickInput,
  type ScreenJoystickInputOptions,
  type SimpleCharacterInputOptions,
  ScreenJumpButtonInput,
  VRMHumanBoneName,
} from '@pmndrs/viverse'
export * from '@viverse/sdk'
export * from '@viverse/sdk/avatar-client'
export * from './gamepad.js'
export * from './mobile.js'
