import { Maximize2, Minus, X } from 'lucide-react'
import { useApp } from '../state'
import { Logo } from './primitives'

export function TitleBar(): React.JSX.Element {
  const { maximized, settings, stats, system, t } = useApp()
  return (
    <header className="drag relative z-30 flex h-11 shrink-0 items-center justify-between border-b border-line/70 bg-panel/45 px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <Logo size={24} glow={false} />
        <span className="truncate text-[12.5px] font-bold tracking-tight">Baran Download Manager</span>
        <span className="chip py-0! text-[9.5px]!">v{system?.appVersion ?? '1.0.0'}</span>
        {stats?.torrentEngine === 'ready' ? (
          <span className="ms-2 hidden items-center gap-1.5 text-[10px] text-faint 2xl:flex">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-ok" />
            {t.stats.enginesOnline}
          </span>
        ) : null}
      </div>
      <div dir="ltr" className="no-drag flex items-center gap-0.5">
        <button
          type="button"
          className="grid h-8 w-10 place-items-center rounded-md text-muted transition hover:bg-elev2 hover:text-ink"
          onClick={() => void window.pulse.windowControl('minimize')}
          aria-label="Minimize"
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          className="grid h-8 w-10 place-items-center rounded-md text-muted transition hover:bg-elev2 hover:text-ink"
          onClick={() => void window.pulse.windowControl('maximize')}
          aria-label={maximized ? 'Restore' : 'Maximize'}
        >
          {maximized ? <RestoreIcon /> : <Maximize2 size={13} />}
        </button>
        <button
          type="button"
          className="grid h-8 w-10 place-items-center rounded-md text-muted transition hover:bg-bad hover:text-white"
          onClick={() => void window.pulse.windowControl('close')}
          aria-label="Close"
        >
          <X size={15} />
        </button>
        <span className="sr-only">{settings.theme}</span>
      </div>
    </header>
  )
}

function RestoreIcon(): React.JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="3" y="1" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 4v7a1 1 0 0 0 1 1h7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
