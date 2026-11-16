import { networkFetch as fetch } from './network'
import type {
  GithubAsset,
  GithubRelease,
  GithubRepo,
  GithubRepoDetails,
  GithubSearchResult
} from '@shared/types'

const API = 'https://api.github.com'

interface RawOwner {
  login?: string
  avatar_url?: string
}

interface RawRepo {
  id: number
  full_name: string
  name: string
  owner?: RawOwner
  description?: string | null
  html_url: string
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  language?: string | null
  license?: { spdx_id?: string | null; name?: string | null } | null
  updated_at: string
  default_branch?: string
  topics?: string[]
  archived?: boolean
  private?: boolean
}

interface RawAsset {
  id: number
  name: string
  size: number
  content_type?: string
  download_count?: number
  browser_download_url: string
  url: string
}

interface RawRelease {
  id: number
  tag_name: string
  name?: string | null
  published_at?: string | null
  prerelease?: boolean
  draft?: boolean
  html_url: string
  zipball_url?: string
  tarball_url?: string
  assets?: RawAsset[]
}

interface RawSearch {
  total_count: number
  items: RawRepo[]
}

function headers(token: string, accept = 'application/vnd.github+json'): Record<string, string> {
  const result: Record<string, string> = {
    Accept: accept,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Baran-Download-Manager'
  }
  if (token) result.Authorization = `Bearer ${token}`
  return result
}

async function ghFetch<T>(url: string, token: string, attempt = 0): Promise<T> {
  let res: Response
  try { res = await fetch(url, {
    headers: headers(token),
    signal: AbortSignal.timeout(25_000),
    redirect: 'follow'
  }) } catch (error) {
    if (attempt < 2) {
      await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)))
      return ghFetch<T>(url, token, attempt + 1)
    }
    throw new Error(`Could not reach GitHub: ${(error as Error).message || 'network error'}`)
  }
  if (!res.ok) {
    let message = ''
    try {
      const body = (await res.json()) as { message?: string }
      message = body?.message || ''
    } catch {
      /* ignore */
    }
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get('x-ratelimit-remaining')
      if (remaining === '0') {
        const reset = Number(res.headers.get('x-ratelimit-reset') || 0)
        const when = reset ? new Date(reset * 1000).toLocaleTimeString() : ''
        throw new Error(
          `GitHub API rate limit reached${when ? ` (resets at ${when})` : ''}. ` +
            'Add a personal access token in Settings → Tools to raise the limit.'
        )
      }
    }
    if (res.status === 404) throw new Error('Repository not found or not public.')
    throw new Error(message || `GitHub API error ${res.status}`)
  }
  return (await res.json()) as T
}

function mapRepo(r: RawRepo): GithubRepo {
  const branch = r.default_branch || 'main'
  const license =
    r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION'
      ? r.license.spdx_id
      : r.license?.name || undefined
  return {
    id: r.id,
    fullName: r.full_name,
    name: r.name,
    owner: r.owner?.login || r.full_name.split('/')[0],
    ownerAvatar: r.owner?.avatar_url,
    description: r.description || undefined,
    htmlUrl: r.html_url,
    stars: r.stargazers_count || 0,
    forks: r.forks_count || 0,
    openIssues: r.open_issues_count || 0,
    language: r.language || undefined,
    license,
    updatedAt: r.updated_at,
    defaultBranch: branch,
    topics: Array.isArray(r.topics) ? r.topics.slice(0, 8) : [],
    archived: !!r.archived,
    private: !!r.private,
    zipUrl: `https://github.com/${r.full_name}/archive/refs/heads/${encodeURIComponent(branch)}.zip`
  }
}

function mapAsset(a: RawAsset): GithubAsset {
  return {
    id: a.id,
    name: a.name,
    size: a.size || 0,
    contentType: a.content_type || undefined,
    downloadCount: a.download_count || 0,
    url: a.browser_download_url,
    apiUrl: a.url
  }
}

function mapRelease(fullName: string, r: RawRelease): GithubRelease {
  const tag = r.tag_name || 'release'
  return {
    id: r.id,
    tagName: tag,
    name: r.name || tag,
    publishedAt: r.published_at || '',
    prerelease: !!r.prerelease,
    draft: !!r.draft,
    htmlUrl: r.html_url,
    zipUrl:
      r.zipball_url ||
      `https://github.com/${fullName}/archive/refs/tags/${encodeURIComponent(tag)}.zip`,
    tarballUrl: r.tarball_url || '',
    assets: (r.assets || []).map(mapAsset)
  }
}

export async function searchGithubRepos(
  token: string,
  query: string,
  page = 1
): Promise<GithubSearchResult> {
  const q = query.trim()
  if (!q) return { total: 0, items: [] }
  const url = `${API}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=30&page=${Math.max(1, page)}`
  const data = await ghFetch<RawSearch>(url, token)
  return {
    total: data.total_count || 0,
    items: (data.items || []).map(mapRepo)
  }
}

export async function getGithubRepo(token: string, fullName: string): Promise<GithubRepoDetails> {
  const clean = fullName.trim().replace(/^\/+|\/+$/g, '')
  if (!/^[\w.-]+\/[\w.-]+$/.test(clean)) throw new Error('Invalid repository name.')
  const [repo, releases] = await Promise.all([
    ghFetch<RawRepo>(`${API}/repos/${clean}`, token),
    ghFetch<RawRelease[]>(`${API}/repos/${clean}/releases?per_page=30`, token).catch(() => [])
  ])
  return {
    ...mapRepo(repo),
    releases: (releases || []).filter((r) => !r.draft).map((r) => mapRelease(clean, r))
  }
}
