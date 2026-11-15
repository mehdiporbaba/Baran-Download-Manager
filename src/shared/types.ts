/**
 * Shared contracts between the Electron main process, the preload bridge and the
 * React renderer. Keep this file free of Node / DOM specific imports.
 */

export type TaskKind = 'http' | 'youtube' | 'torrent'

export type TaskStatus =
  | 'queued'
  | 'connecting'
  | 'downloading'
  | 'paused'
  | 'verifying'
  | 'completed'
  | 'error'
  | 'canceled'

export type Language = 'fa' | 'en' | 'ja' | 'ru'
export type Theme = 'dark' | 'light'
export type CookiesBrowser =
  | ''
  | 'chrome'
  | 'edge'
  | 'firefox'
  | 'brave'
  | 'opera'
  | 'vivaldi'
  | 'chromium'

export interface Settings {
  downloadDir: string
  maxConcurrent: number
  connections: number
  globalSpeedLimit: number
  torrentDownloadLimit: number
  torrentUploadLimit: number
  proxyMode: 'direct' | 'system' | 'manual'
  minimizeToTray: boolean
  sidebarAlwaysOpen: boolean
  language: Language
  theme: Theme
  clipboardWatch: boolean
  notifyOnComplete: boolean
  ytDlpPath: string
  ffmpegPath: string
  torrentPort: number
  seedAfterComplete: boolean
  proxy: string
  userAgent: string
  autoResume: boolean
  /** Register Pulse to start automatically after the user signs in. */
  launchAtStartup: boolean
  /** Read YouTube (and other sites') cookies directly from a browser profile. */
  cookiesBrowser: CookiesBrowser
  /** Path to an exported cookies.txt file (takes precedence over the browser). */
  cookiesFile: string
  /** Optional GitHub personal access token used by the repository search. */
  githubToken: string
}

export interface SegmentState {
  /** inclusive start byte */
  start: number
  /** exclusive end byte */
  end: number
  /** next byte to write */
  position: number
}

export interface YoutubeMeta {
  title: string
  uploader?: string
  duration?: number
  thumbnail?: string
  extractor?: string
  quality?: string
  formatId?: string
  audioOnly?: boolean
  audioFormat?: 'm4a' | 'mp3'
  subtitles?: boolean
  embedThumbnail?: boolean
  videoId?: string
  playlist?: boolean
  playlistIndex?: number
  playlistCount?: number
  viewCount?: number
  uploadDate?: string
}

export interface YoutubeFormatOption {
  id: string
  /** video height (0 for audio only) */
  height: number
  ext: string
  fps?: number
  vcodec?: string
  acodec?: string
  filesize?: number
  tbr?: number
  audioOnly?: boolean
  note?: string
  /** exact yt-dlp format selector */
  selector: string
  label: string
}

export interface YoutubeProbe {
  url: string
  title: string
  uploader?: string
  duration?: number
  thumbnail?: string
  extractor?: string
  viewCount?: number
  uploadDate?: string
  isPlaylist: boolean
  playlistCount?: number
  entries?: Array<{ url: string; title: string; duration?: number; thumbnail?: string; index: number }>
  formats: YoutubeFormatOption[]
}

export interface TorrentFileEntry {
  name: string
  path: string
  length: number
  downloaded: number
  selected: boolean
}

export interface TorrentMeta {
  infoHash: string
  magnet?: string
  torrentFile?: string
  peers: number
  seeds: number
  uploadSpeed: number
  uploaded: number
  ratio: number
  files: TorrentFileEntry[]
  sequential: boolean
  seeding: boolean
}

export interface DownloadTask {
  startAt?: number
  id: string
  kind: TaskKind
  url: string
  name: string
  fileName: string
  dir: string
  filePath?: string
  status: TaskStatus
  size: number
  downloaded: number
  speed: number
  eta: number
  connections: number
  createdAt: number
  updatedAt: number
  completedAt?: number
  error?: string
  resumable?: boolean
  segments?: SegmentState[]
  maxConnections?: number
  headers?: Record<string, string>
  thumbnail?: string
  category?: string
  youtube?: YoutubeMeta
  torrent?: TorrentMeta
  checksum?: string
  order: number
}

export interface SpeedSample {
  t: number
  down: number
  up: number
}

export interface GlobalStats {
  downSpeed: number
  upSpeed: number
  activeCount: number
  queuedCount: number
  completedCount: number
  totalDownloaded: number
  history: SpeedSample[]
  torrentEngine: 'idle' | 'ready' | 'starting' | 'unavailable'
  ytdlp: { available: boolean; version?: string; path?: string }
  ffmpeg: { available: boolean; path?: string }
}

export interface ProbeResult {
  url: string
  finalUrl: string
  fileName: string
  size: number
  resumable: boolean
  contentType?: string
  headers?: Record<string, string>
}

export interface AddDownloadInput {
  startAt?: number
  url: string
  kind?: 'auto' | 'http' | 'youtube'
  fileName?: string
  dir?: string
  connections?: number
  headers?: Record<string, string>
  title?: string
  thumbnail?: string
  youtube?: {
    /** yt-dlp format selector, e.g. "137+140" or "bestaudio/best" */
    selector?: string
    quality?: string
    audioOnly?: boolean
    audioFormat?: 'm4a' | 'mp3'
    subtitles?: boolean
    thumbnail?: boolean
    videoId?: string
    duration?: number
    playlistIndex?: number
    playlistCount?: number
    uploader?: string
  }
}

export interface GithubRepo {
  id: number
  fullName: string
  name: string
  owner: string
  ownerAvatar?: string
  description?: string
  htmlUrl: string
  stars: number
  forks: number
  openIssues: number
  language?: string
  license?: string
  updatedAt: string
  defaultBranch: string
  topics: string[]
  archived: boolean
  private: boolean
  /** Direct ZIP archive of the default branch. */
  zipUrl: string
}

export interface GithubAsset {
  id: number
  name: string
  size: number
  contentType?: string
  downloadCount: number
  /** Public browser download URL. */
  url: string
  /** API URL (used with a token for private repositories). */
  apiUrl: string
}

export interface GithubRelease {
  id: number
  tagName: string
  name: string
  publishedAt: string
  prerelease: boolean
  draft: boolean
  htmlUrl: string
  zipUrl: string
  tarballUrl: string
  assets: GithubAsset[]
}

export interface GithubRepoDetails extends GithubRepo {
  releases: GithubRelease[]
}

export interface GithubSearchResult {
  total: number
  items: GithubRepo[]
  rateRemaining?: number
}

export interface AddTorrentInput {
  startAt?: number
  /** magnet uri, http(s) .torrent url, or an absolute path to a .torrent file */
  uri?: string
  /** base64 encoded contents of a dropped .torrent file */
  data?: string
  name?: string
  dir?: string
  sequential?: boolean
  fileIndices?: number[]
}

export interface AppSnapshot {
  tasks: DownloadTask[]
  settings: Settings
  stats: GlobalStats
  system: {
    platform: string
    version: string
    appVersion: string
    freeDisk: number
    downloadDir: string
    defaultDir: string
    runtime: { electron: string; chrome: string; node: string }
    maximized: boolean
    autoStartSupported: boolean
  }
}

export type MainEvent =
  | { type: 'links:changed' }
  | { type: 'task:update'; task: DownloadTask }
  | { type: 'task:remove'; id: string }
  | { type: 'task:add'; task: DownloadTask }
  | { type: 'stats'; stats: GlobalStats }
  | { type: 'toast'; level: 'info' | 'success' | 'error'; message: string }
  | { type: 'clipboard:url'; url: string }
  | { type: 'open-add'; url?: string }
  | { type: 'navigate'; view: string }
  | { type: 'window:state'; maximized: boolean }
  | { type: 'settings'; settings: Settings }

export interface PulseAPI {
  installFirefoxExtension?(): Promise<{ opened: boolean }>
  /** Native-only, explicitly scoped connected-service actions. */
  connected?(action: string, input?: unknown): Promise<unknown>
  registerBrowserHost(browser: 'chrome' | 'edge' | 'firefox', extensionId?: string): Promise<void>
  replaceUrl(id: string, url: string): Promise<void>
  instagramCollect(url: string): Promise<number>
  installGallery(): Promise<void>
  linksList(): Promise<CollectedLink[]>
  linksImport(text: string): Promise<number>
  linksRemove(ids: string[]): Promise<void>
  linksProbe(ids: string[]): Promise<void>
  linksDownload(ids: string[], dir: string, startAt?: number): Promise<{ added: number; errors: string[] }>
  scheduleTask(id: string, startAt?: number): Promise<void>
  scanStart(input: ScanInput): Promise<ScanSummary>
  scanCancel(): Promise<void>
  snapshot(): Promise<AppSnapshot>
  probe(url: string, headers?: Record<string, string>): Promise<ProbeResult>
  probeYoutube(url: string): Promise<YoutubeProbe>
  addDownload(input: AddDownloadInput): Promise<DownloadTask>
  addTorrent(input: AddTorrentInput): Promise<DownloadTask>
  pauseTask(id: string): Promise<void>
  resumeTask(id: string): Promise<void>
  cancelTask(id: string): Promise<void>
  removeTask(id: string, deleteFile: boolean): Promise<void>
  retryTask(id: string): Promise<void>
  revealTask(id: string): Promise<void>
  openTask(id: string): Promise<void>
  clearCompleted(): Promise<void>
  updateSettings(patch: Partial<Settings>): Promise<Settings>
  chooseDir(current?: string): Promise<string | null>
  chooseTorrentFile(): Promise<string | null>
  chooseCookiesFile(): Promise<string | null>
  setSpeedLimit(bytesPerSecond: number): Promise<void>
  installYtDlp(): Promise<{ ok: boolean; message: string }>
  rescanTools(): Promise<void>
  githubSearch(query: string, page?: number): Promise<GithubSearchResult>
  githubRepo(fullName: string): Promise<GithubRepoDetails>
  openExternal(url: string): Promise<void>
  revealDir(dir: string): Promise<void>
  windowControl(action: 'minimize' | 'maximize' | 'close'): Promise<void>
  readClipboard(): Promise<string>
  subscribe(cb: (event: MainEvent) => void): () => void
}

declare global {
  interface Window {
    pulse: PulseAPI
  }
}

export interface CollectedLink {
  headers?: Record<string, string>
  id: string
  url: string
  fileName: string
  source?: string
  size?: number
  contentType?: string
  resumable?: boolean
  status: 'new' | 'checking' | 'ready' | 'error'
  error?: string
}

export interface ScanInput { url: string; depth: number; maxPages: number }
export interface ScanSummary { pages: number; found: number; canceled: boolean; limited: boolean; errors: string[] }
