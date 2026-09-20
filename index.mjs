// dafy-whale-theme — host half.
//
// Serves the theme's MIT-licensed image assets for the permanent client theme
// bundle at /dafy-assets/<name>. Same route shape the shipped client-modules
// registry uses for /plugins (kind: "prefix").

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const name = 'dafy-whale-theme'

export const inject = ['webServer']

const here = dirname(fileURLToPath(import.meta.url))

const MIME = {
  '.png': 'image/png',
}

const FILES = [
  'whale_front.png',
  'whale_side.png',
  'whale_icon.png',
  'fish_idle.png',
  'fish_happy.png',
]

const ALLOWED = new Set(FILES)

export function apply(ctx) {
  const route = {
    kind: 'prefix',
    path: '/dafy-assets',
    async handler(req, res) {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405)
        res.end()
        return
      }
      const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
      const prefix = '/dafy-assets/'
      const name = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : ''
      if (!ALLOWED.has(name)) {
        res.writeHead(404)
        res.end()
        return
      }
      try {
        const body = await readFile(join(here, 'assets', name))
        const ext = name.slice(name.lastIndexOf('.'))
        res.writeHead(200, {
          'content-type': MIME[ext] ?? 'application/octet-stream',
          'cache-control': 'public, max-age=86400',
        })
        res.end(body)
      } catch {
        res.writeHead(404)
        res.end()
      }
    },
  }
  ctx.effect(() => ctx.webServer.register(route))
}
