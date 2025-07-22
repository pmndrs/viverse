import { AnimationClip } from 'three'

const changeSymbol = Symbol('was-changed')

function wasAlreadyChanged(value: any, id: number) {
  if (value[changeSymbol] === id) {
    return true
  }
  value[changeSymbol] = id
}

export function trimAnimationClip(
  originalClip: AnimationClip,
  startTime: number = 0,
  endTime: number = originalClip.duration,
) {
  const changeId = Math.random()
  originalClip.duration = endTime - startTime
  originalClip.tracks.forEach((track) => {
    if (wasAlreadyChanged(track.times, changeId)) {
      return
    }
    track.shift(-startTime)
    track.trim(0, originalClip.duration)
  })
}

export function scaleAnimationClipTime(originalClip: AnimationClip, scale: number) {
  const changeId = Math.random()
  originalClip.duration *= scale
  originalClip.tracks.forEach((track) => {
    if (wasAlreadyChanged(track.times, changeId)) {
      return
    }
    track.scale(scale)
  })
}
