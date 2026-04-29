import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

function injectEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return
  }

  const content = readFileSync(filePath, 'utf8')

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')

    if (separatorIndex <= 0) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()

    if (!key || process.env[key] !== undefined) {
      continue
    }

    const rawValue = line.slice(separatorIndex + 1).trim()
    const unquotedValue =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue

    process.env[key] = unquotedValue
  }
}

injectEnvFile(path.resolve(process.cwd(), '.env.local'))
injectEnvFile(path.resolve(process.cwd(), '.env'))

export const PORT = 3001

export const NCM_BASE_URL = process.env.NCM_API_BASE_URL ?? 'http://127.0.0.1:3000'
export const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY ?? ''
export const AI_BASE_URL = process.env.AI_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1'
export const AI_MODEL = process.env.AI_MODEL ?? 'deepseek-v4-pro'
export const AI_ENABLE_THINKING = String(process.env.AI_ENABLE_THINKING ?? '').trim().toLowerCase() === 'true'

export const DEFAULT_SONG_LEVEL = process.env.NCM_SONG_LEVEL ?? 'standard'
export const DEFAULT_BROWSER_BR = Number(process.env.NCM_BROWSER_BR ?? 320000)

export const AUDIO_RESPONSE_HEADERS = [
  'accept-ranges',
  'cache-control',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
]

export const VIDEO_RESPONSE_HEADERS = [
  'accept-ranges',
  'cache-control',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
]
