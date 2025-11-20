import { VRM, VRMUtils } from '@pixiv/three-vrm'
import { runTimeline, Update, GraphTimeline } from '@pmndrs/timeline'
import { Group, Object3D, Object3DEventMap, AnimationAction, Vector3 } from 'three'
import { applySimpleCharacterActionBindingOptions } from './apply-input-options.js'
import {
  KeyboardLocomotionActionBindings,
  PointerCaptureRotateZoomActionBindings,
  ScreenJoystickLocomotionActionBindings,
  ScreenButtonJumpActionBindings,
} from '../action/index.js'
import { CharacterCameraBehavior } from '../camera.js'
import { loadCharacterModel, flattenCharacterModelOptions, CharacterModel } from '../model/index.js'
import { BvhCharacterPhysics, BvhPhysicsWorld } from '../physics/index.js'
import { shouldJump } from '../utils.js'
import { loadSimpleCharacterJumpDownState } from './state/jump-down.js'
import { loadSimpleCharacterJumpForwardAction, loadSimpleCharacterJumpForwardState } from './state/jump-forward.js'
import { loadSimpleCharacterJumpLoopState } from './state/jump-loop.js'
import { loadSimpleCharacterJumpStartState } from './state/jump-start.js'
import { loadSimpleCharacterJumpUpAction, loadSimpleCharacterJumpUpState } from './state/jump-up.js'
import { loadSimpleCharacterMovingState } from './state/movement.js'
import { SimpleCharacterOptions, SimpleCharacterState } from './types.js'
import { updateSimpleCharacterVelocity } from './update-input-velocity.js'
import { updateSimpleCharacterRotation } from './update-rotation.js'

export class SimpleCharacter extends Group<Object3DEventMap & { loaded: {} }> implements SimpleCharacterState {
  public readonly cameraBehavior: CharacterCameraBehavior
  public readonly physics: BvhCharacterPhysics
  public readonly currentAnimationRef: { current?: AnimationAction } = {}

  //loaded asychronously
  public model?: CharacterModel

  private readonly updateTimeline: Update<unknown>
  private readonly graph = new GraphTimeline('moving')
  private readonly abortController = new AbortController()

  public lastJump = 0

  public readonly abortSignal = this.abortController.signal

  constructor(
    public readonly camera: Object3D,
    private readonly world: BvhPhysicsWorld,
    domElement: HTMLElement,
    private readonly options: SimpleCharacterOptions = {},
  ) {
    super()
    const actionBindingsList = (
      options.actionBindings ??
      options.input ?? [
        ScreenJoystickLocomotionActionBindings,
        ScreenButtonJumpActionBindings,
        PointerCaptureRotateZoomActionBindings,
        KeyboardLocomotionActionBindings,
      ]
    ).map((ActionBindings) => new ActionBindings(domElement, this.abortController.signal))
    applySimpleCharacterActionBindingOptions(actionBindingsList, options.actionBindingOptions ?? options.inputOptions)

    // camera behavior
    this.cameraBehavior = new CharacterCameraBehavior()

    // physics
    this.physics = new BvhCharacterPhysics(world)
    // timeline graph
    this.updateTimeline = runTimeline(this.graph.run(), this.abortController.signal)
    //init resource loading
    this.init(this.options).catch(console.error)
  }

  private async init(options: SimpleCharacterOptions) {
    if (options.model === false) {
      return
    }
    this.model = await loadCharacterModel(
      ...flattenCharacterModelOptions(options.model === true ? undefined : options.model),
    )
    this.add(this.model.scene)
    const [jumpForwardAction, jumpUpAction] = await Promise.all([
      loadSimpleCharacterJumpForwardAction(this, options),
      loadSimpleCharacterJumpUpAction(this, options),
    ])
    await Promise.all([
      loadSimpleCharacterJumpDownState(this, options).then((state) =>
        this.graph.attach('jumpDown', state.timeline, state.transitionTo),
      ),
      loadSimpleCharacterJumpLoopState(this, options).then((state) =>
        this.graph.attach('jumpLoop', state.timeline, state.transitionTo),
      ),
      ,
      loadSimpleCharacterJumpForwardState(jumpForwardAction, this, options).then((state) =>
        this.graph.attach('jumpForward', state.timeline, state.transitionTo),
      ),
      ,
      loadSimpleCharacterJumpUpState(jumpUpAction, this, options).then((state) =>
        this.graph.attach('jumpUp', state.timeline, state.transitionTo),
      ),
      ,
      loadSimpleCharacterJumpStartState(jumpUpAction, jumpForwardAction, this, options).then((state) =>
        this.graph.attach('jumpStart', state.timeline, state.transitionTo),
      ),
      ,
      loadSimpleCharacterMovingState(this, options).then((state) =>
        this.graph.attach('moving', state.timeline, state.transitionTo),
      ),
      ,
    ])
  }

  update(delta: number) {
    const jumpOptions = this.options.movement?.jump
    if (
      jumpOptions != false &&
      this.model == null &&
      shouldJump(this.physics, this.lastJump, jumpOptions == true ? undefined : jumpOptions?.bufferTime)
    ) {
      this.physics.applyVelocity(
        new Vector3(
          0,
          (typeof this.options.movement?.jump === 'object' ? this.options.movement?.jump.speed : undefined) ?? 8,
          0,
        ),
      )
      this.lastJump = performance.now() / 1000
    }
    if (this.model != null) {
      updateSimpleCharacterRotation(delta, this.physics, this.camera, this.model, this.options.animation)
    }
    updateSimpleCharacterVelocity(this.camera, this.physics, this.options.movement)
    this.updateTimeline?.(undefined, delta)
    this.model?.mixer.update(delta)
    if (this.model instanceof VRM) {
      this.model.update(delta)
    }
    this.physics.update(this, delta, this.options.physics)
    this.cameraBehavior.update(
      this.camera,
      this,
      delta,
      this.world.raycast.bind(this.world),
      this.options.cameraBehavior,
    )
  }

  dispose(): void {
    this.abortController.abort()
    this.parent?.remove(this)
    this.model?.scene.dispatchEvent({ type: 'dispose' } as any)
    this.cameraBehavior.dispose()
    VRMUtils.deepDispose(this)
  }
}

export * from './update-input-velocity.js'
export * from './update-rotation.js'
export * from './apply-input-options.js'
export * from './types.js'
