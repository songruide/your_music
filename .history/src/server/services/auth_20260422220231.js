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
export async function createLoginQrCode(option={}){
    const { key, qrimg = true, platform = 'pc' } = options

  if (!String(key ?? '').trim()) {
    throw new Error('key is required')
  }
  const result = await ncmEnhanced.login_qr_create({
    key,
    qrimg,
    platform,
  })

  const data = result?.body?.data ?? {}
  const qrUrl = String(data.qrurl ?? '').trim()
  const qrImage = String(data.qrimg ?? '').trim()

  if (!qrUrl) {
    throw new Error('Failed to create login qr code')
  }

  // 这里继续做一层项目自己的字段收口，
  // 前端以后只依赖我们自己的字段命名。
  return {
    key: String(key).trim(),
    qrUrl,
    qrImage,
    qrurl: qrUrl,
    qrimg: qrImage,
  }
}
src/server/routes/auth.js 里追加：