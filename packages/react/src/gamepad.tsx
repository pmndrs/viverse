import {
  JumpAction,
  MoveBackwardAction,
  MoveForwardAction,
  MoveLeftAction,
  MoveRightAction,
  StateActionWriter,
} from '@pmndrs/viverse'
import { useFrame } from '@react-three/fiber'
import { useXRControllerButtonEvent, useXRInputSourceState } from '@react-three/xr'
import { useEffect, useRef } from 'react'

export function useXRControllerLocomotionActionBindings() {
  const leftController = useXRInputSourceState('controller', 'left')
  const rightController = useXRInputSourceState('controller', 'right')
  useXRControllerButtonEvent(rightController, 'a-button', (state) => state === 'pressed' && JumpAction.emit(undefined))
  const forwardWriterRef = useRef<StateActionWriter<number>>(undefined)
  const backwardWriterRef = useRef<StateActionWriter<number>>(undefined)
  const leftWriterRef = useRef<StateActionWriter<number>>(undefined)
  const rightWriterRef = useRef<StateActionWriter<number>>(undefined)
  useEffect(() => {
    const abortController = new AbortController()
    forwardWriterRef.current = MoveForwardAction.createWriter(abortController.signal)
    backwardWriterRef.current = MoveBackwardAction.createWriter(abortController.signal)
    leftWriterRef.current = MoveLeftAction.createWriter(abortController.signal)
    rightWriterRef.current = MoveRightAction.createWriter(abortController.signal)
    return () => abortController.abort()
  }, [leftController])
  useFrame(() => {
    forwardWriterRef.current?.write(-Math.min(0, leftController?.gamepad?.['xr-standard-thumbstick']?.yAxis ?? 0))
    backwardWriterRef.current?.write(Math.max(0, leftController?.gamepad?.['xr-standard-thumbstick']?.yAxis ?? 0))
    leftWriterRef.current?.write(-Math.min(0, leftController?.gamepad?.['xr-standard-thumbstick']?.xAxis ?? 0))
    rightWriterRef.current?.write(Math.max(0, leftController?.gamepad?.['xr-standard-thumbstick']?.xAxis ?? 0))
  })
}
