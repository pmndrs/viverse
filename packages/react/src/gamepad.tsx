import {
  MoveForwardField,
  Input,
  InputField,
  LastTimeJumpPressedField,
  MoveLeftField,
  MoveRightField,
  MoveBackwardField,
  RunField,
} from '@pmndrs/viverse'
import { useXRControllerButtonEvent, useXRInputSourceState } from '@react-three/xr'
import { useMemo, useRef } from 'react'

export function useXRControllerInput() {
  const leftController = useXRInputSourceState('controller', 'left')
  const lastAPressed = useRef<number | null>(null)
  const rightController = useXRInputSourceState('controller', 'right')
  useXRControllerButtonEvent(
    rightController,
    'a-button',
    (state) => state === 'pressed' && (lastAPressed.current = performance.now() / 1000),
  )
  return useMemo<Input>(
    () => ({
      get<T>(field: InputField<T>) {
        switch (field) {
          case MoveForwardField:
          case MoveBackwardField: {
            const thumbstickYAxis = leftController?.gamepad?.['xr-standard-thumbstick']?.yAxis
            if (thumbstickYAxis == null) {
              return undefined
            }
            return field === MoveBackwardField
              ? (Math.max(0, thumbstickYAxis) as T)
              : (Math.max(0, -thumbstickYAxis) as T)
          }
          case MoveLeftField:
          case MoveRightField: {
            const thumbstickXAxis = leftController?.gamepad?.['xr-standard-thumbstick']?.xAxis
            if (thumbstickXAxis == null) {
              return undefined
            }
            return field === MoveLeftField ? (Math.max(0, -thumbstickXAxis) as T) : (Math.max(0, thumbstickXAxis) as T)
          }
          case LastTimeJumpPressedField:
            return lastAPressed.current as T
          case RunField:
            return (leftController?.gamepad?.['xr-standard-trigger']?.state === 'pressed') as T
        }

        return undefined
      },
    }),
    [leftController],
  )
}
