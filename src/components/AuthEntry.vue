<script setup lang="ts">
import { LoaderCircle, LogIn, LogOut } from 'lucide-vue-next'
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const subtitle = computed(() => {
  if (authStore.isSessionLoading && !authStore.initialized) {
    return '正在同步登录态'
  }

  if (authStore.loggedIn) {
    return '网易云账号已连接'
  }

  return '扫码后展示头像和昵称'
})

function handleLogin() {
  authStore.openLoginDialog()
}

function handleLogout() {
  void authStore.logout()
}
</script>

<template>
  <section class="auth-entry" aria-label="登录入口">
    <div class="auth-entry__header">
      <div class="auth-entry__avatar">
        <img v-if="authStore.avatarUrl" :src="authStore.avatarUrl" :alt="`${authStore.displayName} 头像`" />
        <span v-else>{{ authStore.avatarFallback }}</span>
      </div>

      <div class="auth-entry__meta">
        <div class="auth-entry__title-row">
          <p class="auth-entry__title">{{ authStore.displayName }}</p>
          <span v-if="authStore.loggedIn" class="auth-entry__badge">已登录</span>
        </div>
        <p class="auth-entry__subtitle">{{ subtitle }}</p>
      </div>
    </div>

    <p v-if="authStore.sessionError && !authStore.loggedIn" class="auth-entry__error">
      {{ authStore.sessionError }}
    </p>

    <button
      v-if="!authStore.loggedIn"
      type="button"
      class="auth-entry__action"
      :disabled="authStore.isSessionLoading"
      @click="handleLogin"
    >
      <LoaderCircle
        v-if="authStore.isSessionLoading && !authStore.initialized"
        class="auth-entry__action-icon auth-entry__action-icon--spinning"
        :stroke-width="1.9"
      />
      <LogIn v-else class="auth-entry__action-icon" :stroke-width="1.9" />
      <span>{{ authStore.isSessionLoading && !authStore.initialized ? '同步中...' : '登录' }}</span>
    </button>

    <button v-else type="button" class="auth-entry__action auth-entry__action--ghost" @click="handleLogout">
      <LogOut class="auth-entry__action-icon" :stroke-width="1.9" />
      <span>{{ authStore.isSessionLoading ? '退出中...' : '退出' }}</span>
    </button>
  </section>
</template>

<style scoped lang="scss">
.auth-entry {
  margin-top: 16px;
  padding: 14px 12px 12px;
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)),
    rgba(15, 13, 52, 0.46);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 14px 28px rgba(8, 5, 25, 0.22);
}

.auth-entry__header {
  display: flex;
  gap: 10px;
  align-items: center;
}

.auth-entry__avatar {
  width: 42px;
  height: 42px;
  flex: none;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 14px;
  background:
    radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.34), transparent 40%),
    linear-gradient(135deg, rgba(241, 114, 255, 0.72), rgba(83, 137, 255, 0.72));
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.auth-entry__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.auth-entry__meta {
  min-width: 0;
  flex: 1;
}

.auth-entry__title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.auth-entry__title,
.auth-entry__subtitle,
.auth-entry__error {
  margin: 0;
}

.auth-entry__title {
  min-width: 0;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.auth-entry__badge {
  padding: 3px 6px;
  border-radius: 999px;
  background: rgba(112, 255, 195, 0.16);
  color: #9ef7cb;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.auth-entry__subtitle {
  margin-top: 3px;
  color: rgba(232, 236, 255, 0.64);
  font-size: 11px;
  line-height: 1.45;
}

.auth-entry__error {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 114, 149, 0.12);
  color: #ffd0dd;
  font-size: 11px;
  line-height: 1.45;
}

.auth-entry__action {
  width: 100%;
  margin-top: 12px;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(235, 96, 255, 0.92), rgba(91, 136, 255, 0.9));
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
  box-shadow: 0 12px 24px rgba(62, 30, 143, 0.26);
}

.auth-entry__action:hover:not(:disabled) {
  transform: translateY(-1px);
}

.auth-entry__action:disabled {
  cursor: default;
  opacity: 0.72;
}

.auth-entry__action--ghost {
  background: rgba(255, 255, 255, 0.08);
  box-shadow: none;
}

.auth-entry__action-icon {
  width: 14px;
  height: 14px;
  flex: none;
}

.auth-entry__action-icon--spinning {
  animation: auth-entry-spin 0.9s linear infinite;
}

@keyframes auth-entry-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
