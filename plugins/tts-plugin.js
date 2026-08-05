import WebSocket from 'ws'
import crypto from 'crypto'

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
const CHROMIUM_MAJOR = '143'
const SEC_MS_GEC_VERSION = '1-143.0.3650.75'
const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3'
const TIMEOUT_MS = 25000

const WSS_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    `Chrome/${CHROMIUM_MAJOR}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR}.0.0.0`,
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Accept-Language': 'en-US,en;q=0.9',
  Pragma: 'no-cache',
  'Cache-Control': 'no-cache',
  Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
  'Sec-WebSocket-Version': '13',
}

export const EDGE_VOICES = [
  { id: 'ja-JP-NanamiNeural', label: 'Nanami（女・标准）' },
  { id: 'ja-JP-AoiNeural', label: 'Aoi（女・柔和）' },
  { id: 'ja-JP-ShioriNeural', label: 'Shiori（女）' },
  { id: 'ja-JP-MayuNeural', label: 'Mayu（女）' },
  { id: 'ja-JP-KeitaNeural', label: 'Keita（男）' },
  { id: 'ja-JP-DaichiNeural', label: 'Daichi（男）' },
  { id: 'ja-JP-TakumiNeural', label: 'Takumi（男）' },
]

function connectId() {
  return crypto.randomUUID().replace(/-/g, '')
}

function muid() {
  return crypto.randomBytes(16).toString('hex').toUpperCase()
}

function buildUrl() {
  return (
    'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1' +
    `?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
    `&ConnectionId=${connectId()}` +
    `&Sec-MS-GEC=${generateSecMsGec()}` +
    `&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`
  )
}

function configFrame(timestamp) {
  return (
    `X-Timestamp:${timestamp}\r\n` +
    'Content-Type:application/json; charset=utf-8\r\n' +
    'Path:speech.config\r\n\r\n' +
    JSON.stringify({
      context: {
        synthesis: {
          audio: {
            metadataoptions: {
              sentenceBoundaryEnabled: 'false',
              wordBoundaryEnabled: 'true',
            },
            outputFormat: OUTPUT_FORMAT,
          },
        },
      },
    }) +
    '\r\n'
  )
}

function probe() {
  return new Promise((resolve) => {
    let ws
    let settled = false
    const timer = setTimeout(() => finish(false), 8000)
    function finish(ok) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        ws?.close()
      } catch {
        // ignore
      }
      resolve(ok)
    }
    try {
      ws = new WebSocket(buildUrl(), {
        headers: { ...WSS_HEADERS, Cookie: `muid=${muid()};` },
      })
      ws.on('open', () => {
        const timestamp = dateToString()
        ws.send(configFrame(timestamp))
        const mssml =
          `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ja-JP'>` +
          `<voice name='ja-JP-NanamiNeural'>` +
          `<prosody pitch='+0Hz' rate='0%' volume='+0%'>あ</prosody></voice></speak>`
        ws.send(
          `X-RequestId:${connectId()}\r\n` +
            'Content-Type:application/ssml+xml\r\n' +
            `X-Timestamp:${timestamp}Z\r\n` +
            'Path:ssml\r\n\r\n' +
            mssml,
        )
      })
      ws.on('message', (_data, isBinary) => {
        if (isBinary) finish(true)
      })
      ws.on('error', () => finish(false))
      ws.on('close', () => finish(false))
    } catch {
      finish(false)
    }
  })
}

function generateSecMsGec() {
  const ticks = Math.floor(Date.now() / 1000) + 11644473600
  const rounded = ticks - (ticks % 300)
  const windowsTicks = rounded * 10000000
  return crypto
    .createHash('sha256')
    .update(`${windowsTicks}${TRUSTED_CLIENT_TOKEN}`)
    .digest('hex')
    .toUpperCase()
}

function dateToString() {
  const d = new Date()
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  return `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${dd} ${d.getUTCFullYear()} ${hh}:${mm}:${ss} GMT+0000 (Coordinated Universal Time)`
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function synthesize({ text, voice, ratePct }) {
  const xmlLang = /^en-/.test(voice) ? 'en-US' : 'ja-JP'
  return new Promise((resolve, reject) => {
    let ws
    let settled = false
    const chunks = []

    const timer = setTimeout(() => done(new Error('tts timeout')), TIMEOUT_MS)

    function done(err) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        ws?.close()
      } catch {
        // ignore
      }
      if (err) reject(err)
      else resolve(Buffer.concat(chunks))
    }

    try {
      const url = buildUrl()

      ws = new WebSocket(url, {
        headers: { ...WSS_HEADERS, Cookie: `muid=${muid()};` },
      })

      ws.on('open', () => {
        const timestamp = dateToString()
        ws.send(configFrame(timestamp))

        const mssml =
          `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${xmlLang}'>` +
          `<voice name='${voice}'>` +
          `<prosody pitch='+0Hz' rate='${ratePct}%' volume='+0%'>` +
          `${escapeXml(text)}</prosody></voice></speak>`
        const ssmlFrame =
          `X-RequestId:${connectId()}\r\n` +
          'Content-Type:application/ssml+xml\r\n' +
          `X-Timestamp:${timestamp}Z\r\n` +
          'Path:ssml\r\n\r\n' +
          mssml
        ws.send(ssmlFrame)
      })

      ws.on('message', (data, isBinary) => {
        if (!isBinary) {
          if (data.toString().includes('Path:turn.end')) done()
          return
        }
        if (data.length < 2) return
        const headerLen = data.readUInt16BE(0)
        if (data.length < 2 + headerLen) return
        chunks.push(data.subarray(2 + headerLen))
      })

      ws.on('error', (e) => done(e))
      ws.on('close', () => done())
    } catch (e) {
      done(e)
    }
  })
}

function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost')
    const probeReq = url.searchParams.get('probe') === '1'
    const text = (url.searchParams.get('text') ?? '').slice(0, 3000)
    const voice = url.searchParams.get('voice') ?? 'ja-JP-NanamiNeural'
    const ratePct = Math.max(-70, Math.min(90, Number(url.searchParams.get('rate') ?? 0)))
    if (!probeReq && !text) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'missing text' }))
      return
    }
    const task = probeReq ? probe().then((ok) => ({ probe: ok })) : synthesize({ text, voice, ratePct })
    task
      .then((result) => {
        if (result.probe !== undefined) {
          res.writeHead(result.probe ? 200 : 503, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          })
          res.end(JSON.stringify({ ok: result.probe }))
          return
        }
        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Content-Length': result.length,
          'Cache-Control': 'no-store',
        })
        res.end(result)
      })
      .catch((e) => {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: String(e?.message ?? e) }))
      })
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: String(e?.message ?? e) }))
  }
}

export default function edgeTtsPlugin() {
  return {
    name: 'edge-tts',
    configureServer(server) {
      server.middlewares.use('/api/tts', handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/tts', handler)
    },
  }
}
