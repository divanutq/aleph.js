import { colors, createHash, path } from '../deps.ts'
import { existsDirSync } from '../shared/fs.ts'
import { moduleExts } from '../shared/constants.ts'
import util from '../shared/util.ts'
import type { Plugin, LoaderPlugin } from '../types.ts'
import { VERSION } from '../version.ts'

export const reLocaleID = /^[a-z]{2}(-[a-zA-Z0-9]+)?$/
export const reFullVersion = /@v?\d+\.\d+\.\d+/i

// inject browser navigator polyfill
Object.assign(globalThis.navigator, {
  connection: {
    downlink: 10,
    effectiveType: "4g",
    onchange: null,
    rtt: 50,
    saveData: false,
  },
  cookieEnabled: false,
  language: 'en',
  languages: ['en'],
  onLine: true,
  platform: Deno.build.os,
  userAgent: `Deno/${Deno.version.deno}`,
  vendor: 'Deno Land'
})

/** check the plugin whether is a loader plugin. */
export function isLoaderPlugin(plugin: Plugin): plugin is LoaderPlugin {
  return plugin.type === 'loader'
}

/** get deno dir. */
let __denoDir: string | null = null
export async function getDenoDir() {
  if (__denoDir !== null) {
    return __denoDir
  }

  const p = Deno.run({
    cmd: [Deno.execPath(), 'info', '--json', '--unstable'],
    stdout: 'piped',
    stderr: 'null'
  })
  const output = (new TextDecoder).decode(await p.output())
  const { denoDir } = JSON.parse(output)
  p.close()
  if (denoDir === undefined || !existsDirSync(denoDir)) {
    throw new Error(`can't find the deno dir`)
  }
  __denoDir = denoDir
  return denoDir
}

/** get aleph pkg uri. */
export function getAlephPkgUri() {
  const DEV_PORT = Deno.env.get('ALEPH_DEV_PORT')
  if (DEV_PORT) {
    return `http://localhost:${DEV_PORT}`
  }
  return `https://deno.land/x/aleph@v${VERSION}`
}

/** get relative the path of `to` to `from`. */
export function getRelativePath(from: string, to: string): string {
  const r = path.relative(from, to).split('\\').join('/')
  if (!r.startsWith('.') && !r.startsWith('/')) {
    return './' + r
  }
  return r
}

export function trimModuleExt(url: string) {
  for (const ext of moduleExts) {
    if (url.endsWith('.' + ext)) {
      return url.slice(0, -(ext.length + 1))
    }
  }
  return url
}

/** fix remote import url to local */
export function toLocalUrl(url: string): string {
  if (util.isLikelyHttpURL(url)) {
    let { hostname, pathname, port, protocol, search } = new URL(url)
    const isHttp = protocol === 'http:'
    if ((isHttp && port === '80') || (protocol === 'https:' && port === '443')) {
      port = ''
    }
    if (search !== '') {
      const a = util.splitPath(pathname)
      const searchKey = btoa(search.slice(1)).replace(/[+/=]/g, '')
      const basename = `[${searchKey}]${a.pop()}`
      a.push(basename)
      pathname = '/' + a.join('/')
    }
    return [
      '/-/',
      (isHttp ? 'http_' : ''),
      hostname,
      (port ? '_' + port : ''),
      pathname
    ].join('')
  }
  return util.trimPrefix(url, 'file://')
}

/** compute hash of the content */
export function computeHash(content: string | Uint8Array): string {
  return createHash('sha1').update(content).toString()
}

/** clear the previous compilation cache */
export async function clearCompilation(jsFile: string) {

}

/** parse port number */
export function parsePortNumber(v: string): number {
  const num = parseInt(v)
  if (isNaN(num) || !Number.isInteger(num) || num <= 0 || num >= 1 << 16) {
    throw new Error(`invalid port '${v}'`)
  }
  return num
}

/** get flag value by given keys. */
export function getFlag(flags: Record<string, any>, keys: string[]): string | undefined
export function getFlag(flags: Record<string, any>, keys: string[], defaultValue: string): string
export function getFlag(flags: Record<string, any>, keys: string[], defaultValue?: string): string | undefined {
  let value = defaultValue
  for (const key of keys) {
    if (key in flags) {
      value = String(flags[key])
      break
    }
  }
  return value
}

/**
 * colorful the bytes string
 * - dim: 0 - 1MB
 * - yellow: 1MB - 10MB
 * - red: > 10MB
 */
export function formatBytesWithColor(bytes: number) {
  let cf = colors.dim
  if (bytes > 10 << 20) { // 10MB
    cf = colors.red
  } else if (bytes > 1 << 20) { // 1MB
    cf = colors.yellow
  }
  return cf(util.formatBytes(bytes))
}
