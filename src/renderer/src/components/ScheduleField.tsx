export function scheduledTime(value: string): number | undefined {
  if (!value) return undefined
  const time = new Date(value).getTime()
  if (!Number.isFinite(time) || time <= Date.now()) throw new Error('Choose a future start time / زمان شروع باید در آینده باشد')
  return time
}
export function localDateTime(time?: number): string {
  if (!time) return ''
  const date = new Date(time)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
export function ScheduleField({ value, onChange, fa }: { value: string; onChange: (value: string) => void; fa: boolean }): React.JSX.Element {
  return <label className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
    <span>{fa ? 'زمان شروع (اختیاری)' : 'Start time (optional)'}</span>
    <input aria-label={fa ? 'زمان شروع دانلود' : 'Download start time'} className="field h-9 px-2" type="datetime-local" value={value} onChange={event => onChange(event.target.value)} dir="ltr" />
    {value && <button type="button" className="btn btn-ghost" onClick={() => onChange('')}>{fa ? 'پاک کردن' : 'Clear'}</button>}
    <span className="text-[10px]">{fa ? 'زمان محلی؛ برنامه باید باز باشد.' : 'Local time; keep the app running.'}</span>
  </label>
}
