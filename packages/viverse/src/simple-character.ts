import { AnimationAction, Euler, Group, LoopOnce, Object3D, Quaternion, Vector3 } from 'three'
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
import { SimpleAnimationMixer } from './mixer.js'
import {
  clearVrmCharacterModelCache,
  simpleCharacterAnimationNames as simpleCharacterAnimationNames,
  getSimpleCharacterVrmModelAnimationOptions,
  loadVrmCharacterModel,
  loadVrmCharacterModelAnimation,
  VrmModelAnimationOptions,
  VrmCharacterModelOptions,
} from './model.js'
import { action, animationFinished, build, duration, forever, parallel, Update } from '@pmndrs/timeline'
import { SimpleCharacterCameraBehavior, SimpleCharacterCameraBehaviorOptions } from './camera.js'
import { VRM, VRMUtils } from '@pixiv/three-vrm'

export type SimpleCharacterMovementOptions = {
  /**
   * @default true
   */
  jump?:
    | {
        /**
         * @default 0.15
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

function computeShouldJump(
  isGrounded: boolean,
  lastJump: number,
  lastTimePressed: number | null,
  options: Exclude<SimpleCharacterOptions['movement'], undefined>['jump'],
): boolean {
  if (options === false) {
    return false
  }
  if (options === true) {
    options = {}
  }
  if (!isGrounded) {
    return false
  }
  if (lastTimePressed == null) {
    return false
  }
  if (lastJump > lastTimePressed) {
    return false
  }
  return performance.now() / 1000 - lastTimePressed < (options?.bufferTime ?? 0.1)
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
    animations: await Promise.all(
      simpleCharacterAnimationNames.map(async (name) =>
        loadVrmCharacterModelAnimation(
          vrm,
          options.animation?.[name] ?? (await getSimpleCharacterVrmModelAnimationOptions(name)),
        ),
      ),
    ),
  }
}

async function* SimpleCharacterTimeline(
  camera: Object3D,
  inputSystem: InputSystem,
  physics: BvhCharacterPhysics,
  vrm: VRM | undefined,
  actions: Record<(typeof simpleCharacterAnimationNames)[number], AnimationAction> | undefined,
  mixer: SimpleAnimationMixer,
  options: SimpleCharacterOptions = {},
) {
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
        let runOptions = options.movement?.run ?? true
        if (inputSystem.get(RunField) && runOptions !== false) {
          runOptions = runOptions === true ? {} : runOptions
          inputSpeed = runOptions.speed ?? 4.5
        }

        let walkOptions = options.movement?.walk ?? true
        if (inputSpeed === 0 && walkOptions !== false) {
          walkOptions = walkOptions === true ? {} : walkOptions
          inputSpeed = walkOptions.speed ?? 2.5
        }

        physics.inputVelocity
          .set(
            -inputSystem.get(MoveLeftField) + inputSystem.get(MoveRightField),
            0,
            -inputSystem.get(MoveForwardField) + inputSystem.get(MoveBackwardField),
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
          const basedOn = options.animation?.yawRotationBasdOn ?? 'movement'

          // compute goalTargetEuler
          if (basedOn === 'camera') {
            goalTargetEuler.setFromQuaternion(camera.getWorldQuaternion(quaternion), 'YXZ')
          } else {
            //don't rotate if not moving
            if (physics.inputVelocity.lengthSq() === 0) {
              // run forever
              return true
            }
            inputDirection.copy(physics.inputVelocity).normalize()
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
            (typeof options.animation === 'object' ? options.animation.maxYawRotationSpeed : undefined) ?? 10
          vrm.scene.rotation.y += Math.min(maxYawRotationSpeed * clock.delta, absDeltaYaw) * yawRotationDirection
          // run forever
          return true
        },
      }),
    // jump and walk animations
    actions == null
      ? async function* () {
          let lastJump = 0
          yield* action({
            update() {
              if (
                computeShouldJump(
                  physics.isGrounded,
                  lastJump,
                  inputSystem.get(LastTimeJumpPressedField),
                  options.movement?.jump,
                )
              ) {
                physics.applyVelocity(
                  vector.set(
                    0,
                    (typeof options.movement?.jump === 'object' ? options.movement?.jump.speed : undefined) ?? 8,
                    0,
                  ),
                )
              }
              return true
            },
          })
        }
      : async function* () {
          let lastJump = 0
          while (true) {
            let shouldJump = false
            yield* action({
              update() {
                if (physics.inputVelocity.lengthSq() === 0) {
                  mixer.play(actions.idle, options.animation?.crossFadeDuration)
                } else {
                  let action = actions.idle
                  if (inputSystem.get(RunField) && options.movement?.run != false) {
                    action = actions.run
                  }
                  if (action === actions.idle && options.movement?.walk != false) {
                    action = actions.walk
                  }
                  mixer.play(action, options.animation?.crossFadeDuration)
                }
                shouldJump = computeShouldJump(
                  physics.isGrounded,
                  lastJump,
                  inputSystem.get(LastTimeJumpPressedField),
                  options.movement?.jump,
                )
                return !shouldJump && physics.isGrounded
              },
            })

            if (shouldJump) {
              lastJump = performance.now() / 1000
              mixer.play(actions.jumpStart, options.animation?.crossFadeDuration)
              yield* action({
                until: animationFinished(mixer, actions.jumpStart),
                update: () => {
                  physics.inputVelocity.multiplyScalar(0.5)
                  return true
                },
              })
              mixer.play(actions.jumpUp, options.animation?.crossFadeDuration)
              physics.applyVelocity(
                vector.set(
                  0,
                  (typeof options.movement?.jump === 'object' ? options.movement?.jump.speed : undefined) ?? 8,
                  0,
                ),
              )
            }

            yield* parallel('race', action({ update: () => !physics.isGrounded }), async function* () {
              if (shouldJump) {
                yield* action({ until: animationFinished(mixer, actions.jumpUp) })
              }
              mixer.play(actions.jumpLoop, options.animation?.crossFadeDuration)
              yield* action({ until: forever() })
            })

            mixer.play(actions.jumpDown, options.animation?.crossFadeDuration)
            yield* action({ until: duration(50, 'milliseconds') })
          }
        },
  )
}

export class SimpleCharacter extends Group {
  public readonly inputSystem: InputSystem
  public readonly cameraBehavior: SimpleCharacterCameraBehavior
  public readonly physics: BvhCharacterPhysics
  public readonly mixer = new SimpleAnimationMixer(this)

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

    let actions: Record<(typeof simpleCharacterAnimationNames)[number], AnimationAction> | undefined
    if (vrm != null && animations != null) {
      this.add(vrm.scene)
      const [walk, run, idle, jumpStart, jumpUp, jumpLoop, jumpDown] = animations.map((clip) =>
        this.mixer!.clipAction(clip),
      )
      jumpDown.loop = LoopOnce
      jumpDown.clampWhenFinished = true
      jumpStart.loop = LoopOnce
      jumpStart.clampWhenFinished = true
      jumpUp.loop = LoopOnce
      jumpUp.clampWhenFinished = true
      actions = { idle, jumpDown, jumpLoop, jumpStart, jumpUp, run, walk }
    }

    this.updateTimeline = build(
      SimpleCharacterTimeline(camera, this.inputSystem, this.physics, vrm, actions, this.mixer, options),
    )
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
