export function initialWindow(work: { x: number; y: number; width: number; height: number }): { width: number; height: number; minWidth: number; minHeight: number; x: number; y: number } {
  const width = Math.min(work.width, Math.max(640, Math.min(1000, Math.round(work.width * 0.8))))
  const height = Math.min(work.height, Math.max(440, Math.min(680, Math.round(work.height * 0.82))))
  return { width, height, minWidth: Math.min(720, width), minHeight: Math.min(480, height), x: work.x + Math.round((work.width - width) / 2), y: work.y + Math.round((work.height - height) / 2) }
}
