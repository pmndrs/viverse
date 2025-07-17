import { AnimationClip } from 'three'

export function trimAnimationClip(
  originalClip: AnimationClip,
  startTime: number = 0,
  endTime: number = originalClip.duration,
) {
  originalClip.duration = endTime - startTime
  originalClip.tracks.forEach((track) => {
    track.shift(-startTime)
    track.trim(0, originalClip.duration)
  })
}

export function scaleAnimationClipTime(originalClip: AnimationClip, scale: number) {
  originalClip.tracks.forEach((track) => track.scale(scale))
  originalClip.duration *= scale
}
