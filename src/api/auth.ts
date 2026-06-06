import { request } from '@/utils/request'

export interface AuthQrKey {
  key: string
  unikey: string
}

export interface AuthQrCode {
  key: string
  qrUrl: string
  qrImage: string
  qrurl: string
  qrimg: string
}

export interface AuthQrCheckResult {
  statusCode: number
  statusMessage: string
  authorized: boolean
  expired: boolean
}

export interface AuthUserProfile {
  userId: string
  nickname: string
  avatarUrl: string
  signature: string
  vipType: number
  level: number
}

export interface AuthSession {
  loggedIn: boolean
  profile: AuthUserProfile | null
}

export interface CellphoneLoginPayload extends Record<string, unknown> {
  phone: string
  captcha: string
}

export function getLoginQrKey() {
  return request<AuthQrKey>('/api/auth/qr-key', {
    params: {
      timestamp: Date.now(),
    },
  })
}

export function createLoginQrCode(key: string, platform = 'pc') {
  return request<AuthQrCode>('/api/auth/qr-create', {
    params: {
      key,
      platform,
      qrimg: true,
      timestamp: Date.now(),
    },
  })
}

export function checkLoginQrStatus(key: string) {
  return request<AuthQrCheckResult>('/api/auth/qr-check', {
    params: {
      key,
      timestamp: Date.now(),
    },
  })
}

export function getAuthSession() {
  return request<AuthSession>('/api/auth/status', {
    params: {
      timestamp: Date.now(),
    },
  })
}

export function cellphoneLoginAuth(payload: CellphoneLoginPayload) {
  return request<AuthSession>('/api/auth/cellphone-login', {
    method: 'POST',
    body: payload,
  })
}

export function sendCellphoneCaptcha(phone: string) {
  return request<{ sent: boolean }>('/api/auth/captcha/send', {
    method: 'POST',
    body: {
      phone,
    },
  })
}

export function logoutAuth() {
  return request<AuthSession>('/api/auth/logout', {
    method: 'POST',
  })
}
