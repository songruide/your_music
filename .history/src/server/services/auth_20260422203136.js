import {createRequire} from 'node:module'

const require=createRequire(import.meta.url)

const ncmEnhanced=require('../../../api-enhanced/main.js')

export async function createLoginQrKey(options = {}) {
     const result = await ncmEnhanced.login_qr_key(options)
      const data = result?.body?.data ?? {}
  const key = String(data.unikey ?? '').trim()
    if (!key) {
    throw new Error('Failed to create login qr key')
  }
   return {
    key,
    unikey: key,
  }
}