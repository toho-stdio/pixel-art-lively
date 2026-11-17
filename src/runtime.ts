export function advanceTime(time: number, deltaSeconds: number, speed: number, paused: boolean): number {
  if (paused || !Number.isFinite(deltaSeconds)) return time;
  return time + Math.min(0.05, Math.max(0, deltaSeconds)) * Math.max(0, speed);
}
export function toScenePoint(clientX: number, clientY: number, rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>, width: number, height: number) {
  return { x: Math.floor((clientX - rect.left) * width / rect.width), y: Math.floor((clientY - rect.top) * height / rect.height) };
}
