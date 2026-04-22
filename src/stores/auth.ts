import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  cellphoneLoginAuth,
  checkLoginQrStatus,
  createLoginQrCode,
  getAuthSession,
  getLoginQrKey,
  logoutAuth,
  type AuthUserProfile,
} from '@/api/auth'

const QR_POLL_INTERVAL_MS = 2500

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<AuthUserProfile | null>(null)
  const loggedIn = ref(false)
  const initialized = ref(false)
  const isSessionLoading = ref(false)
  const sessionError = ref('')

  const isLoginDialogOpen = ref(false)
  const loginMethod = ref<'password' | 'qr'>('password')
  const isCredentialLoading = ref(false)
  const credentialError = ref('')

  const isQrLoading = ref(false)
  const qrError = ref('')
  const qrKey = ref('')
  const qrImage = ref('')
  const qrUrl = ref('')
  const qrStatusCode = ref(0)
  const qrStatusText = ref('请打开网易云音乐 App 扫码登录')

  let initializePromise: Promise<void> | null = null
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let pollToken = 0

  const displayName = computed(() => profile.value?.nickname || '未登录')
  const avatarUrl = computed(() => profile.value?.avatarUrl || '')
  const avatarFallback = computed(() => {
    const source = displayName.value.trim()

    return source ? source.slice(0, 1).toUpperCase() : '云'
  })
  const statusTone = computed(() => {
    if (qrError.value || qrStatusCode.value === 800) {
      return 'danger'
    }

    if (qrStatusCode.value === 803) {
      return 'success'
    }

    if (qrStatusCode.value === 802) {
      return 'active'
    }

    return 'default'
  })

  function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback
  }

  function resetQrState() {
    qrKey.value = ''
    qrImage.value = ''
    qrUrl.value = ''
    qrError.value = ''
    qrStatusCode.value = 0
    qrStatusText.value = '请打开网易云音乐 App 扫码登录'
  }

  function resetCredentialState() {
    credentialError.value = ''
    isCredentialLoading.value = false
  }

  function stopPolling() {
    pollToken += 1

    if (pollTimer !== null) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  async function fetchSession() {
    isSessionLoading.value = true
    sessionError.value = ''

    try {
      const session = await getAuthSession()

      loggedIn.value = session.loggedIn
      profile.value = session.profile
    } catch (error) {
      loggedIn.value = false
      profile.value = null
      sessionError.value = getErrorMessage(error, '登录态同步失败')
    } finally {
      initialized.value = true
      isSessionLoading.value = false
    }
  }

  async function initialize(force = false) {
    if (initialized.value && !force) {
      return
    }

    if (initializePromise) {
      return initializePromise
    }

    initializePromise = fetchSession().finally(() => {
      initializePromise = null
    })

    return initializePromise
  }

  async function pollQrStatus(token: number) {
    if (token !== pollToken || !isLoginDialogOpen.value || loginMethod.value !== 'qr' || !qrKey.value) {
      return
    }

    try {
      const result = await checkLoginQrStatus(qrKey.value)

      if (token !== pollToken) {
        return
      }

      qrStatusCode.value = result.statusCode
      qrStatusText.value = result.statusMessage
      qrError.value = ''

      if (result.authorized) {
        stopPolling()
        await initialize(true)

        if (token !== pollToken) {
          return
        }

        if (loggedIn.value) {
          isLoginDialogOpen.value = false
          resetQrState()
          return
        }

        qrError.value = sessionError.value || '登录成功，但账号信息还没同步出来'
        return
      }

      if (result.expired) {
        stopPolling()
        return
      }
    } catch (error) {
      if (token !== pollToken) {
        return
      }

      qrError.value = getErrorMessage(error, '登录状态检查失败')
      qrStatusText.value = '登录状态检查失败，请稍后重试'
    } finally {
      if (
        token !== pollToken ||
        !isLoginDialogOpen.value ||
        loginMethod.value !== 'qr' ||
        !qrKey.value
      ) {
        return
      }

      if (qrStatusCode.value === 800 || qrStatusCode.value === 803) {
        return
      }

      pollTimer = setTimeout(() => {
        void pollQrStatus(token)
      }, QR_POLL_INTERVAL_MS)
    }
  }

  function startPolling() {
    stopPolling()
    const token = pollToken

    void pollQrStatus(token)
  }

  async function refreshQrCode() {
    stopPolling()
    isQrLoading.value = true
    qrKey.value = ''
    qrImage.value = ''
    qrUrl.value = ''
    qrError.value = ''
    qrStatusCode.value = 0
    qrStatusText.value = '正在生成登录二维码'

    try {
      const keyData = await getLoginQrKey()
      const qrData = await createLoginQrCode(keyData.key)

      qrKey.value = qrData.key
      qrImage.value = qrData.qrImage || qrData.qrimg
      qrUrl.value = qrData.qrUrl || qrData.qrurl
      qrStatusCode.value = 801
      qrStatusText.value = '请打开网易云音乐 App 扫码登录'

      if (isLoginDialogOpen.value && loginMethod.value === 'qr') {
        startPolling()
      }
    } catch (error) {
      qrError.value = getErrorMessage(error, '二维码生成失败')
      qrStatusText.value = '二维码生成失败，请重试'
    } finally {
      isQrLoading.value = false
    }
  }

  async function setLoginMethod(nextMethod: 'password' | 'qr') {
    loginMethod.value = nextMethod
    credentialError.value = ''

    if (nextMethod === 'qr') {
      if (!qrKey.value || qrStatusCode.value === 800 || qrError.value) {
        await refreshQrCode()
        return
      }

      startPolling()
      return
    }

    stopPolling()
  }

  function openLoginDialog(method: 'password' | 'qr' = 'password') {
    if (loggedIn.value) {
      return
    }

    isLoginDialogOpen.value = true
    credentialError.value = ''
    sessionError.value = ''
    void setLoginMethod(method)
  }

  function closeLoginDialog() {
    isLoginDialogOpen.value = false
    resetCredentialState()
    stopPolling()
  }

  async function loginWithCellphone(phone: string, password: string) {
    isCredentialLoading.value = true
    credentialError.value = ''
    sessionError.value = ''

    try {
      const session = await cellphoneLoginAuth({
        phone: phone.trim(),
        password,
      })

      loggedIn.value = session.loggedIn
      profile.value = session.profile
      initialized.value = true
      isLoginDialogOpen.value = false
      resetQrState()
      stopPolling()
    } catch (error) {
      credentialError.value = getErrorMessage(error, '登录失败，请稍后再试')
    } finally {
      isCredentialLoading.value = false
    }
  }

  async function logout() {
    isSessionLoading.value = true
    sessionError.value = ''

    try {
      await logoutAuth()
    } catch (error) {
      sessionError.value = getErrorMessage(error, '退出登录失败')
    } finally {
      loggedIn.value = false
      profile.value = null
      initialized.value = true
      isSessionLoading.value = false
      isLoginDialogOpen.value = false
      resetCredentialState()
      stopPolling()
      resetQrState()
    }
  }

  return {
    avatarFallback,
    avatarUrl,
    closeLoginDialog,
    credentialError,
    displayName,
    initialize,
    initialized,
    isCredentialLoading,
    isLoginDialogOpen,
    isQrLoading,
    isSessionLoading,
    loggedIn,
    loginMethod,
    loginWithCellphone,
    openLoginDialog,
    profile,
    qrError,
    qrImage,
    qrKey,
    qrStatusCode,
    qrStatusText,
    qrUrl,
    refreshQrCode,
    logout,
    sessionError,
    setLoginMethod,
    statusTone,
  }
})
