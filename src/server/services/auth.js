import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ncmEnhanced = require('../../../api-enhanced/main.js')

function getRawCookie(result) {
  const bodyCookie = typeof result?.body?.cookie === 'string' ? result.body.cookie.trim() : ''

  if (bodyCookie) {
    return bodyCookie
  }

  if (Array.isArray(result?.cookie)) {
    return result.cookie.filter(Boolean).join(';')
  }

  return ''
}

function normalizeUserProfile(payload) {
  const profileSource = payload?.profile ?? null
  const accountSource = payload?.account ?? null
  const userId = String(profileSource?.userId ?? accountSource?.id ?? '').trim()

  if (!userId) {
    return null
  }

  return {
    userId,
    nickname: String(profileSource?.nickname ?? accountSource?.userName ?? '').trim() || '网易云用户',
    avatarUrl: String(profileSource?.avatarUrl ?? '').trim(),
    signature: String(profileSource?.signature ?? '').trim(),
    vipType: Number(profileSource?.vipType ?? 0),
    level: Number(payload?.level ?? 0) || 0,
  }
}

function getQrStatusMessage(statusCode, fallbackMessage = '') {
  switch (statusCode) {
    case 800:
      return '二维码已过期，请刷新后重试'
    case 801:
      return '请打开网易云音乐 App 扫码登录'
    case 802:
      return '已扫码，请在手机上确认授权'
    case 803:
      return '登录成功，正在同步账号信息'
    default:
      return fallbackMessage || '登录状态更新中'
  }
}

function normalizeCellphone(value) {
  const digits = String(value ?? '').trim().replace(/\D/g, '')

  if (digits.startsWith('0086') && digits.length > 11) {
    return digits.slice(4)
  }

  if (digits.startsWith('86') && digits.length > 11) {
    return digits.slice(2)
  }

  return digits
}

export async function createLoginQrKey(options = {}) {
  const result = await ncmEnhanced.login_qr_key(options)
  const data = result?.body?.data ?? result?.body ?? {}
  const key = String(data.unikey ?? '').trim()

  if (!key) {
    throw new Error('Failed to create login qr key')
  }

  return {
    key,
    unikey: key,
  }
}

export async function createLoginQrCode(options = {}) {
  const { key, qrimg = true, platform = 'pc' } = options
  const safeKey = String(key ?? '').trim()

  if (!safeKey) {
    throw new Error('key is required')
  }

  const result = await ncmEnhanced.login_qr_create({
    ...options,
    key: safeKey,
    qrimg,
    platform,
  })

  const data = result?.body?.data ?? {}
  const qrUrl = String(data.qrurl ?? '').trim()
  const qrImage = String(data.qrimg ?? '').trim()

  if (!qrUrl && !qrImage) {
    throw new Error('Failed to create login qr code')
  }

  return {
    key: safeKey,
    qrUrl,
    qrImage,
    qrurl: qrUrl,
    qrimg: qrImage,
  }
}

export async function checkLoginQrStatus(options = {}) {
  const safeKey = String(options.key ?? '').trim()

  if (!safeKey) {
    throw new Error('key is required')
  }

  const result = await ncmEnhanced.login_qr_check({
    ...options,
    key: safeKey,
  })

  const body = result?.body ?? {}
  const statusCode = Number(body.code ?? 0) || 0

  return {
    statusCode,
    statusMessage: getQrStatusMessage(statusCode, String(body.message ?? '').trim()),
    authorized: statusCode === 803,
    expired: statusCode === 800,
    cookie: getRawCookie(result),
  }
}

export async function getLoginSession(options = {}) {
  const result = await ncmEnhanced.login_status({
    ...options,
    timestamp: options.timestamp ?? Date.now(),
  })
  const payload = result?.body?.data ?? result?.body ?? {}
  const profile = normalizeUserProfile(payload)

  return {
    loggedIn: Boolean(profile),
    profile,
  }
}

export async function loginWithCellphone(options = {}) {
  const phone = normalizeCellphone(options.phone)
  const captcha = String(options.captcha ?? '').trim()

  if (!phone || !captcha) {
    throw new Error('phone and captcha are required')
  }

  const result = await ncmEnhanced.login_cellphone({
    ...options,
    phone,
    captcha,
  })

  const code = Number(result?.body?.code ?? 0) || 0

  if (code !== 200) {
    throw new Error(String(result?.body?.message ?? '登录失败，请检查手机号和验证码'))
  }

  const cookie = getRawCookie(result)

  if (!cookie) {
    throw new Error('登录成功，但没有拿到有效登录凭证')
  }

  const session = await getLoginSession({
    cookie,
    timestamp: Date.now(),
    ua: options.ua,
  })

  return {
    cookie,
    session,
  }
}

export async function sendCellphoneCaptcha(options = {}) {
  const phone = normalizeCellphone(options.phone)

  if (!phone) {
    throw new Error('phone is required')
  }

  const result = await ncmEnhanced.captcha_sent({
    ...options,
    phone,
  })
  const code = Number(result?.body?.code ?? 0) || 0

  if (code !== 200) {
    throw new Error(String(result?.body?.message ?? '验证码发送失败，请稍后再试'))
  }

  return {
    sent: true,
  }
}

export async function logoutSession(options = {}) {
  try {
    await ncmEnhanced.logout(options)
  } catch {
    // 本地退出时，以清除当前站点 cookie 为主；上游退出失败不阻塞前端流程。
  }

  return {
    loggedIn: false,
    profile: null,
  }
}
