export function validateStartAt(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 8.64e15) throw new Error('Invalid scheduled start time')
  return value
}
export function isDue(task: { status: string; startAt?: number }, now = Date.now()): boolean {
  return task.status === 'queued' && (!task.startAt || task.startAt <= now)
}
