import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const viteBin = fileURLToPath(new URL('../node_modules/.bin/vite', import.meta.url))
const PORT = 5173

let child = null
let stopping = false
let timer = null
let opened = false

function start() {
  if (stopping || (child && child.exitCode === null)) return
  console.log('\n[dev-safe] ▶ 启动 dev server（localhost:' + PORT + '，异常退出会自动重启）')
  const args = opened ? [] : ['--open']
  opened = true
  child = spawn(viteBin, args, { stdio: 'inherit' })
  child.on('exit', (code, signal) => {
    child = null
    if (stopping) {
      console.log('[dev-safe] dev server 已停止')
      process.exit(0)
      return
    }
    console.log(
      `[dev-safe] dev server 意外退出 (code=${code}, signal=${signal})，1 秒后自动重启…`,
    )
    timer = setTimeout(start, 1000)
  })
  child.on('error', (e) => {
    console.error('[dev-safe] 启动失败：', e.message)
    process.exit(1)
  })
}

function shutdown(signal) {
  stopping = true
  if (timer) clearTimeout(timer)
  if (child && child.exitCode === null) {
    child.kill(signal)
    setTimeout(() => process.exit(0), 2000)
  } else {
    process.exit(0)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

start()
