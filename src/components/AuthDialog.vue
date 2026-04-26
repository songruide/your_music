<script setup lang="ts">
import {
  LoaderCircle,
  LockKeyhole,
  QrCode,
  RefreshCw,
  ScanLine,
  UserRound,
  X,
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const phone = ref('')
const password = ref('')
const formError = ref('')

const isPasswordLogin = computed(() => authStore.loginMethod === 'password')
const qrNotice = computed(() => {
  if (authStore.qrError) {
    return authStore.qrError
  }

  return authStore.qrStatusCode ? authStore.qrStatusText : ''
})

let previousBodyOverflow = ''

function closeDialog() {
  authStore.closeLoginDialog()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && authStore.isLoginDialogOpen) {
    closeDialog()
  }
}

function selectMethod(method: 'password' | 'qr') {
  formError.value = ''
  void authStore.setLoginMethod(method)
}

async function submitPasswordLogin() {
  formError.value = ''

  if (!phone.value.trim()) {
    formError.value = '请输入手机号'
    return
  }

  if (!password.value) {
    formError.value = '请输入密码'
    return
  }

  await authStore.loginWithCellphone(phone.value, password.value)

  if (authStore.loggedIn) {
    phone.value = ''
    password.value = ''
  }
}

watch(
  () => authStore.isLoginDialogOpen,
  (isOpen) => {
    if (typeof document !== 'undefined') {
      if (isOpen) {
        previousBodyOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = previousBodyOverflow
      }
    }

    if (!isOpen) {
      phone.value = ''
      password.value = ''
      formError.value = ''
    }
  },
)

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleKeydown)
}

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
  }

  if (typeof document !== 'undefined') {
    document.body.style.overflow = previousBodyOverflow
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="authStore.isLoginDialogOpen" class="auth-dialog">
      <div class="auth-dialog__backdrop" @click="closeDialog"></div>

      <section class="auth-dialog__panel" role="dialog" aria-modal="true" aria-label="登录网易云音乐">
        <button class="auth-dialog__close" type="button" aria-label="关闭登录弹窗" @click="closeDialog">
          <X class="auth-dialog__close-icon" :stroke-width="2" />
        </button>

        <header class="auth-dialog__header">
          <div class="auth-dialog__badge">
            <UserRound class="auth-dialog__badge-icon" :stroke-width="1.9" />
          </div>

          <div class="auth-dialog__header-copy">
            <h2 class="auth-dialog__title">登录</h2>
            <p class="auth-dialog__subtitle">请选择登录方式以继续</p>
          </div>
        </header>

        <div class="auth-dialog__switch">
          <button
            type="button"
            class="auth-dialog__switch-item"
            :class="{ 'is-active': isPasswordLogin }"
            @click="selectMethod('password')"
          >
            <LockKeyhole class="auth-dialog__switch-icon" :stroke-width="1.8" />
            <span>密码登录</span>
          </button>

          <button
            type="button"
            class="auth-dialog__switch-item"
            :class="{ 'is-active': !isPasswordLogin }"
            @click="selectMethod('qr')"
          >
            <QrCode class="auth-dialog__switch-icon" :stroke-width="1.8" />
            <span>二维码登录</span>
          </button>
        </div>

        <div v-if="isPasswordLogin" class="auth-dialog__body">
          <label class="auth-dialog__field">
            <span class="auth-dialog__field-label">手机号</span>
            <input
              v-model="phone"
              class="auth-dialog__input"
              type="tel"
              placeholder="请输入手机号"
              autocomplete="tel"
            />
          </label>

          <label class="auth-dialog__field">
            <span class="auth-dialog__field-label">密码</span>
            <input
              v-model="password"
              class="auth-dialog__input"
              type="password"
              placeholder="请输入密码"
              autocomplete="current-password"
              @keydown.enter.prevent="submitPasswordLogin"
            />
          </label>

          <p v-if="formError || authStore.credentialError" class="auth-dialog__error">
            {{ formError || authStore.credentialError }}
          </p>

          <button
            type="button"
            class="auth-dialog__primary"
            :disabled="authStore.isCredentialLoading"
            @click="submitPasswordLogin"
          >
            <LoaderCircle
              v-if="authStore.isCredentialLoading"
              class="auth-dialog__primary-icon auth-dialog__primary-icon--spinning"
              :stroke-width="1.9"
            />
            <span>{{ authStore.isCredentialLoading ? '登录中...' : '登录' }}</span>
          </button>
        </div>

        <div v-else class="auth-dialog__body auth-dialog__body--qr">
          <div class="auth-dialog__qr-shell">
            <div class="auth-dialog__qr-card">
              <img
                v-if="authStore.qrImage"
                :key="authStore.qrKey || authStore.qrImage"
                class="auth-dialog__qr-image"
                :src="authStore.qrImage"
                alt="网易云音乐登录二维码"
              />

              <div v-else class="auth-dialog__qr-placeholder">
                <LoaderCircle
                  v-if="authStore.isQrLoading"
                  class="auth-dialog__qr-placeholder-icon auth-dialog__qr-placeholder-icon--spinning"
                  :stroke-width="1.9"
                />
                <ScanLine v-else class="auth-dialog__qr-placeholder-icon" :stroke-width="1.9" />
              </div>
            </div>
          </div>

          <p class="auth-dialog__hint">请使用网易云音乐 App 扫码</p>
          <p
            v-if="qrNotice"
            class="auth-dialog__notice"
            :class="{ 'is-error': Boolean(authStore.qrError) }"
          >
            {{ qrNotice }}
          </p>

          <button
            type="button"
            class="auth-dialog__secondary"
            :disabled="authStore.isQrLoading"
            @click="authStore.refreshQrCode"
          >
            <RefreshCw
              class="auth-dialog__secondary-icon"
              :class="{ 'auth-dialog__secondary-icon--spinning': authStore.isQrLoading }"
              :stroke-width="1.9"
            />
            <span>刷新二维码</span>
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.auth-dialog {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 20px;
}

.auth-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.66);
  backdrop-filter: blur(14px);
}

.auth-dialog__panel {
  position: relative;
  z-index: 1;
  width: min(492px, 100%);
  padding: 18px 16px 20px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    radial-gradient(circle at 6% 8%, rgba(255, 0, 132, 0.12), transparent 14%),
    radial-gradient(circle at 90% 100%, rgba(91, 136, 255, 0.08), transparent 24%),
    linear-gradient(180deg, rgba(8, 8, 10, 0.98), rgba(6, 6, 8, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 34px 90px rgba(0, 0, 0, 0.56);
}

.auth-dialog__close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.09);
  color: rgba(255, 255, 255, 0.62);
  cursor: pointer;
}

.auth-dialog__close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
}

.auth-dialog__close-icon {
  width: 14px;
  height: 14px;
}

.auth-dialog__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-right: 44px;
}

.auth-dialog__badge {
  width: 42px;
  height: 42px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(180deg, #f04ad6, #b437ff);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.24),
    0 10px 24px rgba(201, 65, 255, 0.28);
}

.auth-dialog__badge-icon {
  width: 20px;
  height: 20px;
  color: #fff;
}

.auth-dialog__title,
.auth-dialog__subtitle,
.auth-dialog__hint,
.auth-dialog__notice,
.auth-dialog__field-label,
.auth-dialog__error {
  margin: 0;
}

.auth-dialog__title {
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
}

.auth-dialog__subtitle {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.42);
  font-size: 12px;
  font-weight: 600;
}

.auth-dialog__switch {
  margin-top: 20px;
  padding: 3px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.auth-dialog__switch-item {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.52);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.auth-dialog__switch-item.is-active {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.auth-dialog__switch-icon {
  width: 14px;
  height: 14px;
}

.auth-dialog__body {
  margin-top: 22px;
}

.auth-dialog__body--qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 284px;
}

.auth-dialog__field {
  display: grid;
  gap: 8px;
}

.auth-dialog__field + .auth-dialog__field {
  margin-top: 12px;
}

.auth-dialog__field-label {
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
}

.auth-dialog__input {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  outline: none;
}

.auth-dialog__input::placeholder {
  color: rgba(255, 255, 255, 0.28);
}

.auth-dialog__input:focus {
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
}

.auth-dialog__error,
.auth-dialog__notice.is-error {
  color: #ff7d9d;
}

.auth-dialog__error {
  margin-top: 12px;
  font-size: 12px;
}

.auth-dialog__primary,
.auth-dialog__secondary {
  min-width: 148px;
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.auth-dialog__primary {
  width: 100%;
  margin-top: 14px;
  background: linear-gradient(180deg, #f04ad6, #b437ff);
  color: #fff;
}

.auth-dialog__primary:disabled,
.auth-dialog__secondary:disabled {
  opacity: 0.72;
  cursor: default;
}

.auth-dialog__primary-icon,
.auth-dialog__secondary-icon {
  width: 14px;
  height: 14px;
}

.auth-dialog__primary-icon--spinning,
.auth-dialog__secondary-icon--spinning,
.auth-dialog__qr-placeholder-icon--spinning {
  animation: auth-dialog-spin 0.9s linear infinite;
}

.auth-dialog__qr-shell {
  width: 100%;
  display: flex;
  justify-content: center;
}

.auth-dialog__qr-card {
  width: 176px;
  height: 176px;
  padding: 12px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.18);
}

.auth-dialog__qr-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.auth-dialog__qr-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #f7f7f7;
  color: #333;
}

.auth-dialog__qr-placeholder-icon {
  width: 24px;
  height: 24px;
}

.auth-dialog__hint {
  margin-top: 16px;
  color: rgba(255, 255, 255, 0.74);
  font-size: 13px;
  font-weight: 600;
}

.auth-dialog__notice {
  margin-top: 8px;
  min-height: 18px;
  color: rgba(255, 255, 255, 0.42);
  font-size: 12px;
  text-align: center;
}

.auth-dialog__secondary {
  margin-top: 16px;
  padding: 0 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.86);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

@keyframes auth-dialog-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 520px) {
  .auth-dialog {
    padding: 14px;
  }

  .auth-dialog__panel {
    padding: 16px;
  }

  .auth-dialog__switch {
    grid-template-columns: 1fr;
  }
}
</style>
