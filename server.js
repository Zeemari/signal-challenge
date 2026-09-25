// Production server for non-Vercel hosts (e.g. Railway): serves the built
// frontend from dist/ and routes /api/* to the serverless-style handlers.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(root, 'dist')
const port = process.env.PORT || 3000

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf-8')
  if (!raw) return null
  const type = req.headers['content-type'] || ''
  if (type.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(raw))
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

async function handleApi(req, res, url) {
  const name = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '')
  const file = path.join(root, 'api', `${name}.js`)
  if (name.startsWith('_lib') || !file.startsWith(path.join(root, 'api')) || !fs.existsSync(file)) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ error: 'Not found' }))
  }
  try {
    const mod = await import(pathToFileURL(file).href)
    req.query = Object.fromEntries(url.searchParams.entries())
    req.body = req.method === 'GET' || req.method === 'HEAD' ? null : await readBody(req)
    res.status = (code) => {
      res.statusCode = code
      return res
    }
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(data))
      return res
    }
    await mod.default(req, res)
  } catch (err) {
    console.error('[API Error]', err)
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: err.message || 'Server error' }))
    }
  }
}

function serveStatic(req, res, url) {
  let file = path.join(dist, decodeURIComponent(url.pathname))
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(dist, 'index.html') // SPA fallback
  }
  res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream')
  if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  fs.createReadStream(file).pipe(res)
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    if (url.pathname.startsWith('/api/')) return handleApi(req, res, url)
    serveStatic(req, res, url)
  })
  .listen(port, () => console.log(`SIGNAL listening on :${port}`))
