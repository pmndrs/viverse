import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Euler,
  Group,
  LoopOnce,
  Object3D,
  Quaternion,
  Vector3,
} from 'three'
import {
  Input,
  InputSystem,
  LocomotionKeyboardInput,
  MoveBackwardField,
  MoveForwardField,
  MoveLeftField,
  MoveRightField,
  PointerCaptureInput,
  RunField,
  LastTimeJumpPressedField,
} from './input/index.js'
import { BvhCharacterPhysicsOptions, BvhCharacterPhysics, BvhPhysicsWorld } from './physics/index.js'
import {
  clearVrmCharacterModelCache,
  simpleCharacterAnimationNames as simpleCharacterAnimationNames,
  getSimpleCharacterVrmModelAnimationOptions,
  loadVrmCharacterModel,
  loadVrmCharacterModelAnimation,
  VrmModelAnimationOptions,
  VrmCharacterModelOptions,
} from './model.js'
import {
  action,
  animationFinished,
  build,
  timePassed,
  forever,
  parallel,
  Update,
  graph,
  ActionClock,
} from '@pmndrs/timeline'
import { SimpleCharacterCameraBehavior, SimpleCharacterCameraBehaviorOptions } from './camera.js'
import { VRM, VRMUtils } from '@pixiv/three-vrm'

export type SimpleCharacterMovementOptions = {
  /**
   * @default true
   */
  jump?:
    | {
        /**
         * @default 0.2
         */
        delay?: number
        /**
         * @default 0.1
         */
        bufferTime?: number
        /**
         * @default 8
         */
        speed?: number
      }
    | boolean
  /**
   * @default true
   */
  walk?: { speed?: number } | boolean
  /**
   * @default true
   */
  run?: { speed?: number } | boolean
}

export type SimpleCharacterAnimationOptions = {
  readonly walk?: VrmModelAnimationOptions
  readonly run?: VrmModelAnimationOptions
  readonly idle?: VrmModelAnimationOptions
  readonly jumpStart?: VrmModelAnimationOptions
  readonly jumpUp?: VrmModelAnimationOptions
  readonly jumpLoop?: VrmModelAnimationOptions
  readonly jumpDown?: VrmModelAnimationOptions
  readonly jumpForward?: VrmModelAnimationOptions
  /**
   * @default "movement"
   */
  yawRotationBasdOn?: 'camera' | 'movement'
  /**
   * @default 10
   */
  maxYawRotationSpeed?: number
  /**
   * @default 0.3
   */
  crossFadeDuration?: number
}

const DefaultCrossFadeDuration = 0.1
const DefaultJumDelay = 0.2

export type SimpleCharacterOptions = {
  /**
   * @default [LocomotionKeyboardInput,PointerCaptureInput]
   */
  readonly input?: ReadonlyArray<Input | { new (domElement: HTMLElement): Input }> | InputSystem
  movement?: SimpleCharacterMovementOptions
  readonly model?: VrmCharacterModelOptions
  physics?: BvhCharacterPhysicsOptions
  cameraBehavior?: SimpleCharacterCameraBehaviorOptions
  readonly animation?: SimpleCharacterAnimationOptions
}

//constants
const NegZAxis = new Vector3(0, 0, -1)
const _2MathPI = 2 * Math.PI

//helper objects
const cameraEuler = new Euler()
const cameraRotation = new Quaternion()
const vector = new Vector3()
const characterTargetEuler = new Euler()
const goalTargetEuler = new Euler()
const inputDirection = new Vector3()
const quaternion = new Quaternion()

export async function preloadSimpleCharacterAssets(options: Pick<SimpleCharacterOptions, 'animation' | 'model'>) {
  // load model
  const vrm = await loadVrmCharacterModel(options.model)
  if (vrm == null) {
    return {}
  }
  vrm.scene.addEventListener('dispose', () => clearVrmCharacterModelCache(options.model))

  // load animations
  return {
    vrm,
    animations: (
      await Promise.all(
        simpleCharacterAnimationNames.map(async (name) =>
          loadVrmCharacterModelAnimation(
            vrm,
            options.animation?.[name] ?? (await getSimpleCharacterVrmModelAnimationOptions(name)),
          ),
        ),
      )
    ).reduce(
      (prev, animation, i) => {
        prev[simpleCharacterAnimationNames[i]] = animation
        return prev
      },
      {} as Record<(typeof simpleCharacterAnimationNames)[number], AnimationClip>,
    ),
  }
}

async function* SimpleCharacterTimeline(camera: Object3D, character: SimpleCharacter) {
  let lastJump = 0

  function shouldJump(): boolean {
    let jumpOptions = character.options.movement?.jump
    if (jumpOptions === false) {
      return false
    }
    if (jumpOptions === true) {
      jumpOptions = {}
    }
    if (!character.physics.isGrounded) {
      return false
    }
    const lastTimePressed = character.inputSystem.get(LastTimeJumpPressedField)
    if (lastTimePressed == null) {
      return false
    }
    if (lastJump > lastTimePressed) {
      return false
    }
    return performance.now() / 1000 - lastTimePressed < (jumpOptions?.bufferTime ?? 0.1)
  }

  function applyJumpForce() {
    character.physics.applyVelocity(
      vector.set(
        0,
        (typeof character.options.movement?.jump === 'object' ? character.options.movement?.jump.speed : undefined) ??
          8,
        0,
      ),
    )
  }

  const vrm = character.vrm
  const actions = character.actions

  //run character
  yield* parallel(
    'all',
    // character movement
    action({
      update() {
        cameraEuler.setFromQuaternion(camera.getWorldQuaternion(cameraRotation), 'YXZ')
        cameraEuler.x = 0
        cameraEuler.z = 0

        let inputSpeed = 0
        let runOptions = character.options.movement?.run ?? true
        if (character.inputSystem.get(RunField) && runOptions !== false) {
          runOptions = runOptions === true ? {} : runOptions
          inputSpeed = runOptions.speed ?? 6
        }

        let walkOptions = character.options.movement?.walk ?? true
        if (inputSpeed === 0 && walkOptions !== false) {
          walkOptions = walkOptions === true ? {} : walkOptions
          inputSpeed = walkOptions.speed ?? 3
        }

        character.physics.inputVelocity
          .set(
            -character.inputSystem.get(MoveLeftField) + character.inputSystem.get(MoveRightField),
            0,
            -character.inputSystem.get(MoveForwardField) + character.inputSystem.get(MoveBackwardField),
          )
          .normalize()
          .applyEuler(cameraEuler)
          .multiplyScalar(inputSpeed)

        //run forever
        return true
      },
    }),
    // rotation animations
    vrm != null &&
      action({
        update(_, clock) {
          // Character yaw rotation logic
          const basedOn = character.options.animation?.yawRotationBasdOn ?? 'movement'

          // compute goalTargetEuler
          if (basedOn === 'camera') {
            goalTargetEuler.setFromQuaternion(camera.getWorldQuaternion(quaternion), 'YXZ')
          } else {
            //don't rotate if not moving
            if (character.physics.inputVelocity.lengthSq() === 0) {
              // run forever
              return true
            }
            inputDirection.copy(character.physics.inputVelocity).normalize()
            quaternion.setFromUnitVectors(NegZAxis, inputDirection)
            goalTargetEuler.setFromQuaternion(quaternion, 'YXZ')
          }

          // compute currentTargetEuler
          vrm.scene.getWorldQuaternion(quaternion)
          characterTargetEuler.setFromQuaternion(quaternion, 'YXZ')
          // apply delta yaw rotation
          let deltaYaw = (goalTargetEuler.y - characterTargetEuler.y + _2MathPI) % _2MathPI
          if (deltaYaw > Math.PI) {
            deltaYaw = deltaYaw - _2MathPI
          }
          const absDeltaYaw = Math.abs(deltaYaw)
          if (absDeltaYaw < 0.001) {
            // run forever
            return true
          }
          const yawRotationDirection = deltaYaw / absDeltaYaw
          const maxYawRotationSpeed =
            (typeof character.options.animation === 'object'
              ? character.options.animation.maxYawRotationSpeed
              : undefined) ?? 10
          vrm.scene.rotation.y += Math.min(maxYawRotationSpeed * clock.delta, absDeltaYaw) * yawRotationDirection
          // run forever
          return true
        },
      }),
    // jump and walk animations
    actions == null
      ? action({
          update: () => void (shouldJump() && applyJumpForce()),
        })
      : graph('moving', {
          jumpStart: {
            timeline: async function* () {
              yield* action({
                init() {
                  actions.jumpUp.reset()
                  actions.jumpUp.play()
                  actions.jumpUp.paused = true
                  actions.jumpUp.fadeIn(character.options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration)
                  actions.jumpForward.reset()
                  actions.jumpForward.play()
                  actions.jumpForward.paused = true
                  actions.jumpForward.fadeIn(character.options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration)
                },
                update: () => void character.physics.inputVelocity.multiplyScalar(DefaultCrossFadeDuration),
                until: timePassed(
                  (typeof character.options.movement?.jump === 'object'
                    ? character.options.movement?.jump.delay
                    : undefined) ?? DefaultJumDelay,
                  'seconds',
                ),
              })
              if (character.inputSystem.get(RunField)) {
                actions.jumpUp.fadeOut(0.1)
                return 'jumpForward'
              } else {
                actions.jumpForward.fadeOut(0.1)
                return 'jumpUp'
              }
            },
            transitionTo: {
              jumpDown: { when: () => !character.physics.isGrounded },
            },
          },
          jumpForward: {
            timeline: async function* () {
              yield* action({
                init: () => {
                  actions.jumpForward.paused = false
                  applyJumpForce()
                },
                cleanup: () =>
                  void actions.jumpForward.fadeOut(
                    character.options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration,
                  ),
                until: animationFinished(actions.jumpForward),
              })
              if (character.physics.isGrounded) {
                return 'moving'
              }
              return 'jumpLoop'
            },
          },
          jumpUp: {
            timeline: () =>
              action({
                init: () => {
                  actions.jumpUp.paused = false
                  applyJumpForce()
                },
                cleanup: () =>
                  void actions.jumpUp.fadeOut(
                    character.options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration,
                  ),
                until: animationFinished(actions.jumpUp),
              }),
            transitionTo: {
              jumpDown: {
                when: (_: unknown, clock: ActionClock) => clock.actionTime > 0.1 && character.physics.isGrounded,
              },
              finally: 'jumpLoop',
            },
          },
          jumpLoop: {
            timeline: () =>
              action({
                init: () => {
                  actions.jumpLoop.reset()
                  actions.jumpLoop.play()
                  actions.jumpLoop.fadeIn(character.options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration)
                },
                cleanup: () =>
                  actions.jumpLoop.fadeOut(character.options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration),
                until: forever(),
              }),
            transitionTo: {
              jumpDown: { when: () => character.physics.isGrounded },
            },
          },
          jumpDown: {
            timeline: () =>
              action({
                init: () => {
                  actions.jumpUp.fadeOut(character.options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration)
                  actions.jumpForward.fadeOut(
                    character.options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration,
                  )
                  actions.jumpDown.reset()
                  actions.jumpDown.play()
                  actions.jumpDown.fadeIn(character.options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration)
                },
                cleanup: () =>
                  actions.jumpDown.fadeOut(character.options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration),
                until: timePassed(50, 'milliseconds'),
              }),
            transitionTo: { finally: 'moving' },
          },
          moving: {
            timeline: () => {
              let currentAnimation: AnimationAction | undefined
              return action({
                update() {
                  let nextAnimation: AnimationAction
                  if (character.physics.inputVelocity.lengthSq() === 0) {
                    nextAnimation = actions.idle
                  } else if (character.inputSystem.get(RunField) && character.options.movement?.run != false) {
                    nextAnimation = actions.run
                  } else if (character.options.movement?.walk != false) {
                    nextAnimation = actions.walk
                  } else {
                    nextAnimation = actions.idle
                  }
                  if (nextAnimation === currentAnimation) {
                    return
                  }
                  currentAnimation?.fadeOut(character.options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration)
                  nextAnimation.reset()
                  nextAnimation.play()
                  nextAnimation.fadeIn(character.options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration)
                  currentAnimation = nextAnimation
                },
                cleanup: () =>
                  currentAnimation?.fadeOut(character.options.animation?.crossFadeDuration ?? DefaultCrossFadeDuration),
              })
            },
            transitionTo: {
              jumpStart: { when: () => shouldJump() },
              jumpLoop: { when: () => !character.physics.isGrounded },
            },
          },
        }),
  )
}

export class SimpleCharacter extends Group {
  public readonly cameraBehavior: SimpleCharacterCameraBehavior
  public readonly physics: BvhCharacterPhysics
  public readonly mixer = new AnimationMixer(this)

  //can be changed from the outside
  public inputSystem: InputSystem

  //loaded asychronously
  public actions?: Record<(typeof simpleCharacterAnimationNames)[number], AnimationAction> | undefined
  public vrm?: Awaited<Exclude<ReturnType<typeof loadVrmCharacterModel>, undefined>>

  private updateTimeline?: Update<unknown>

  constructor(
    camera: Object3D,
    world: BvhPhysicsWorld,
    domElement: HTMLElement,
    public readonly options: SimpleCharacterOptions = {},
  ) {
    super()

    // input system
    this.inputSystem =
      options.input instanceof InputSystem
        ? options.input
        : new InputSystem(domElement, options.input ?? [LocomotionKeyboardInput, PointerCaptureInput])
    options.physics ??= {}

    // camera behavior
    this.cameraBehavior = new SimpleCharacterCameraBehavior(camera, this, this.inputSystem, world.raycast.bind(world))

    // physics
    this.physics = new BvhCharacterPhysics(this, world)

    this.init(camera, options).catch(console.error)
  }

  private async init(camera: Object3D, options: SimpleCharacterOptions) {
    const { vrm, animations } = await preloadSimpleCharacterAssets(options)
    this.vrm = vrm

    if (vrm != null && animations != null) {
      this.add(vrm.scene)
      this.actions = {} as Record<(typeof simpleCharacterAnimationNames)[number], AnimationAction>
      for (const name of simpleCharacterAnimationNames) {
        this.actions[name] = this.mixer!.clipAction(animations[name])
      }
      this.actions.jumpDown.loop = LoopOnce
      this.actions.jumpDown.clampWhenFinished = true
      this.actions.jumpUp.loop = LoopOnce
      this.actions.jumpUp.clampWhenFinished = true
      this.actions.jumpForward.loop = LoopOnce
      this.actions.jumpForward.clampWhenFinished = true
    }

    this.updateTimeline = build(SimpleCharacterTimeline(camera, this))
  }

  update(delta: number) {
    this.updateTimeline?.(undefined, delta)
    this.mixer?.update(delta)
    this.vrm?.update(delta)
    this.physics.update(delta, this.options.physics)
    this.cameraBehavior.update(delta, this.options.cameraBehavior)
  }

  dispose(): void {
    this.parent?.remove(this)
    this.vrm?.scene.dispatchEvent({ type: 'dispose' })
    VRMUtils.deepDispose(this)
  }
}
