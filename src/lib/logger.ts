// Lightweight logger that avoids console noise in production and redacts sensitive data
// Works with both Vite (import.meta.env.PROD) and NODE_ENV fallbacks

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const isProd = (() => {
  try {
    // Vite exposes import.meta.env.PROD
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viteProd = (import.meta as any)?.env?.PROD === true
    const nodeProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'
    return Boolean(viteProd || nodeProd)
  } catch {
    return false
  }
})()

// Redact common sensitive keys shallowly
const redact = (val: unknown): unknown => {
  if (!val || typeof val !== 'object') return val
  const sensitiveKeys = new Set([
    'token', 'access_token', 'refresh_token', 'provider_token', 'session', 'jwt', 'authorization', 'auth', 'password'
  ])
  const src = val as Record<string, unknown>
  const out: Record<string, unknown> = Array.isArray(val) ? [] as unknown as Record<string, unknown> : {}
  for (const [k, v] of Object.entries(src)) {
    if (sensitiveKeys.has(k.toLowerCase())) {
      out[k] = '[REDACTED]'
    } else {
      out[k] = v
    }
  }
  return out
}

const log = (level: LogLevel, message: string, meta?: unknown) => {
  if (isProd) return
  const safeMeta = redact(meta)
  // eslint-disable-next-line no-console
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'info' ? console.info : console.debug
  if (typeof safeMeta === 'undefined') {
    fn(message)
  } else {
    fn(message, safeMeta)
  }
}

export const logger = {
  debug: (msg: string, meta?: unknown) => log('debug', msg, meta),
  info: (msg: string, meta?: unknown) => log('info', msg, meta),
  warn: (msg: string, meta?: unknown) => log('warn', msg, meta),
  error: (msg: string, meta?: unknown) => log('error', msg, meta),
  isProd
}
