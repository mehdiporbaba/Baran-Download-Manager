import type { CSSProperties, ReactNode } from 'react'
import {
  AppWindow,
  FileArchive,
  FileText,
  Film,
  Globe,
  Image as ImageIcon,
  Magnet,
  Music,
  Video as Youtube
} from 'lucide-react'
import type { DownloadTask, TaskStatus } from '@shared/types'
import { TONE_CLASS, STATUS_TONE, cn, percentOf } from '../lib/format'

export function Logo({ size = 30, glow = true }: { size?: number; glow?: boolean }): React.JSX.Element {
  return (
    <div
      className="relative grid place-items-center rounded-[0.85rem]"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(145deg, var(--c-brand), #0284c7 55%, var(--c-brand2))',
        boxShadow: glow ? '0 10px 26px -12px var(--c-brand)' : 'none'
      }}
    >
      <svg
        viewBox="0 0 32 32"
        width={size * 0.66}
        height={size * 0.66}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 18a6 6 0 0 1-1-11 8 8 0 0 1 15 1 5 5 0 0 1 2 10M16 13v14m-5-5 5 5 5-5"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

export function KindIcon({ task, size = 42 }: { task: DownloadTask; size?: number }): React.JSX.Element {
  const iconSize = Math.round(size * 0.44)
  const base = {
    width: size,
    height: size,
    borderRadius: Math.max(10, Math.round(size * 0.3))
  } as CSSProperties

  let Icon: typeof Globe = Globe
  let gradient = 'linear-gradient(145deg, #2563eb, #38bdf8)'
  let isImage = false

  if (task.kind === 'youtube') {
    Icon = Youtube
    gradient = 'linear-gradient(145deg, #ef4444, #f97316)'
  } else if (task.kind === 'torrent') {
    Icon = Magnet
    gradient = 'linear-gradient(145deg, #0ea5e9, #22d3ee)'
  } else {
    switch (task.category) {
      case 'video':
        Icon = Film
        gradient = 'linear-gradient(145deg, #38bdf8, #2563eb)'
        break
      case 'audio':
        Icon = Music
        gradient = 'linear-gradient(145deg, #ec4899, #f43f5e)'
        break
      case 'image':
        Icon = ImageIcon
        gradient = 'linear-gradient(145deg, #3b82f6, #22d3ee)'
        isImage = true
        break
      case 'archive':
        Icon = FileArchive
        gradient = 'linear-gradient(145deg, #f59e0b, #f97316)'
        break
      case 'document':
        Icon = FileText
        gradient = 'linear-gradient(145deg, #3b82f6, #2563eb)'
        break
      case 'app':
        Icon = AppWindow
        gradient = 'linear-gradient(145deg, #10b981, #3b82f6)'
        break
      default:
        Icon = Globe
        break
    }
  }

  return (
    <div
      className="relative grid shrink-0 place-items-center overflow-hidden text-white shadow-lg shadow-black/20"
      style={base}
    >
      {isImage && task.thumbnail ? (
        <img src={task.thumbnail} alt="" className="h-full w-full object-cover" />
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: gradient }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
          <Icon size={iconSize} strokeWidth={2.1} className="relative" />
        </>
      )}
    </div>
  )
}

export function StatusPill({ status, label }: { status: TaskStatus; label: string }): React.JSX.Element {
  const tone = STATUS_TONE[status]
  const live = status === 'downloading' || status === 'connecting' || status === 'verifying'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-[2px] text-[10.5px] font-semibold',
        TONE_CLASS[tone]
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          live && 'live-dot',
          tone === 'brand' && 'bg-brand',
          tone === 'ok' && 'bg-ok',
          tone === 'warn' && 'bg-warn',
          tone === 'bad' && 'bg-bad',
          tone === 'muted' && 'bg-faint'
        )}
      />
      {label}
    </span>
  )
}

export function ProgressBar({
  task,
  height = 6
}: {
  task: DownloadTask
  height?: number
}): React.JSX.Element {
  const percent = percentOf(task)
  const indeterminate =
    (task.status === 'connecting' || task.status === 'verifying') && task.size === 0
  const active = task.status === 'downloading'
  const done = task.status === 'completed'
  const paused = task.status === 'paused' || task.status === 'queued'
  const error = task.status === 'error'
  return (
    <div className="progress-track w-full" style={{ height }}>
      {indeterminate ? (
        <div className="indeterminate h-full rounded-full" />
      ) : (
        <div
          className={cn(
            'progress-fill',
            active && 'is-active',
            done && 'is-done',
            paused && 'is-paused',
            error && 'is-error'
          )}
          style={{ width: `${Math.max(done ? 100 : percent, percent > 0 ? 1.5 : 0)}%` }}
        />
      )}
    </div>
  )
}

export function Ring({
  percent,
  size = 128,
  stroke = 9,
  children,
  tone = 'brand'
}: {
  percent: number
  size?: number
  stroke?: number
  children?: ReactNode
  tone?: 'brand' | 'ok' | 'warn' | 'bad'
}): React.JSX.Element {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, percent))
  const colors: Record<string, string> = {
    brand: 'var(--c-brand)',
    ok: 'var(--c-ok)',
    warn: 'var(--c-warn)',
    bad: 'var(--c-bad)'
  }
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="color-mix(in srgb, var(--c-line2) 75%, transparent)"
          strokeWidth={stroke}
        />
        <defs>
          <linearGradient id={`ring-${tone}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors[tone]} />
            <stop offset="100%" stopColor="var(--c-brand2)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#ring-${tone})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (clamped / 100) * circumference}
          style={{ transition: 'stroke-dashoffset .5s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

export function Sparkline({
  values,
  height = 44,
  color = 'var(--c-brand2)',
  className
}: {
  values: number[]
  height?: number
  color?: string
  className?: string
}): React.JSX.Element {
  const data = values.length > 1 ? values : [0, 0]
  const width = 220
  const max = Math.max(...data, 1)
  const step = width / (data.length - 1)
  const points = data.map((v, i) => {
    const x = i * step
    const y = height - 4 - (v / max) * (height - 10)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const area = `0,${height} ${points.join(' ')} ${width},${height}`
  const id = `spark-${Math.round(max)}-${data.length}`
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={{ height, width: '100%' }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function EmptyArt(): React.JSX.Element {
  return (
    <div className="relative grid h-36 w-36 place-items-center">
      <svg viewBox="0 0 160 160" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="empty-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--c-brand)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--c-brand2)" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r="64" fill="none" stroke="url(#empty-g)" strokeWidth="1.5" strokeDasharray="4 6" />
        <circle cx="80" cy="80" r="46" fill="var(--c-elev)" stroke="var(--c-line2)" />
        <path
          d="M80 56v44m0 0-15-15m15 15 15-15"
          stroke="url(#empty-g)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="absolute -right-1 top-6 h-2 w-2 rounded-full bg-brand2/70 live-dot" />
      <div className="absolute left-2 bottom-8 h-1.5 w-1.5 rounded-full bg-brand/70 live-dot" />
    </div>
  )
}

export function Stat({
  icon,
  label,
  value,
  hint,
  accent
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  hint?: ReactNode
  accent?: string
}): React.JSX.Element {
  return (
    <div className="panel relative flex items-center gap-3 overflow-hidden rounded-xl2 px-4 py-3 shadow-[var(--shadow-panel)]">
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
        style={{ background: accent ?? 'color-mix(in srgb, var(--c-brand) 14%, transparent)' }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted">{label}</div>
        <div className="mt-0.5 truncate text-[17px] font-bold leading-tight tabular">{value}</div>
        {hint ? <div className="mt-0.5 text-[10.5px] text-faint">{hint}</div> : null}
      </div>
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label?: string
  disabled?: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
        checked
          ? 'border-brand/40 bg-brand/80'
          : 'border-line2 bg-elev2',
        disabled && 'cursor-not-allowed opacity-40'
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-all',
          checked ? 'start-[calc(100%-1.15rem)]' : 'start-[3px]'
        )}
      />
    </button>
  )
}
