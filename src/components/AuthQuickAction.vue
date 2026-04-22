<script setup lang="ts">
import { ChevronDown, LogOut } from 'lucide-vue-next'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const rootRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)

const buttonLabel = computed(() => (authStore.loggedIn ? authStore.displayName : '登录'))

function closeMenu() {
  menuOpen.value = false
}

function handlePrimaryAction() {
  if (!authStore.loggedIn) {
    authStore.openLoginDialog('qr')
    return
  }

  menuOpen.value = !menuOpen.value
}

function handleDocumentPointerDown(event: MouseEvent) {
  if (!menuOpen.value || !rootRef.value) {
    return
  }

  const target = event.target as Node | null

  if (target && rootRef.value.contains(target)) {
    return
  }

  closeMenu()
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMenu()
  }
}

async function handleLogout() {
  closeMenu()
  await authStore.logout()
}

watch(
  () => authStore.loggedIn,
  (loggedIn) => {
    if (!loggedIn) {
      closeMenu()
    }
  },
)

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleWindowKeydown)
}

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', handleDocumentPointerDown)
  }

  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleWindowKeydown)
  }
})
</script>

<template>
  <div ref="rootRef" class="auth-quick">
    <button type="button" class="auth-quick__button" @click="handlePrimaryAction">
      <div v-if="authStore.loggedIn" class="auth-quick__avatar">
        <img
          v-if="authStore.avatarUrl"
          :src="authStore.avatarUrl"
          :alt="`${authStore.displayName} 头像`"
          referrerpolicy="no-referrer"
        />
        <span v-else>{{ authStore.avatarFallback }}</span>
      </div>

      <span class="auth-quick__label" :class="{ 'auth-quick__label--muted': !authStore.loggedIn }">
        {{ buttonLabel }}
      </span>

      <ChevronDown
        v-if="authStore.loggedIn"
        class="auth-quick__suffix"
        :class="{ 'auth-quick__suffix--open': menuOpen }"
        :stroke-width="2"
      />
    </button>

    <transition name="auth-quick-menu">
      <div v-if="menuOpen && authStore.loggedIn" class="auth-quick__menu">
        <div class="auth-quick__menu-head">
          <div class="auth-quick__menu-avatar">
            <img
              v-if="authStore.avatarUrl"
              :src="authStore.avatarUrl"
              :alt="`${authStore.displayName} 头像`"
              referrerpolicy="no-referrer"
            />
            <span v-else>{{ authStore.avatarFallback }}</span>
          </div>

          <div class="auth-quick__menu-copy">
            <p class="auth-quick__menu-name">{{ authStore.displayName }}</p>
            <p class="auth-quick__menu-subtitle">
              {{ authStore.profile?.signature || '当前网易云账号已登录' }}
            </p>
          </div>
        </div>

        <button type="button" class="auth-quick__menu-action" @click="handleLogout">
          <LogOut class="auth-quick__menu-action-icon" :stroke-width="1.9" />
          <span>{{ authStore.isSessionLoading ? '退出中...' : '退出登录' }}</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped lang="scss">
.auth-quick {
  position: relative;
  flex: 0 0 auto;
}

.auth-quick__button {
  min-width: 66px;
  max-width: min(152px, 100vw - 40px);
  width: auto;
  height: 30px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(17, 11, 45, 0.34);
  color: #fff;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.auth-quick__button:hover {
  transform: translateY(-1px);
  background: rgba(24, 16, 59, 0.48);
  border-color: rgba(255, 255, 255, 0.12);
}

.auth-quick__avatar,
.auth-quick__menu-avatar {
  overflow: hidden;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  background:
    radial-gradient(circle at 28% 22%, rgba(255, 255, 255, 0.28), transparent 36%),
    linear-gradient(135deg, rgba(244, 109, 255, 0.82), rgba(91, 136, 255, 0.78));
}

.auth-quick__avatar {
  width: 18px;
  height: 18px;
  flex: none;
  border-radius: 999px;
  font-size: 10px;
}

.auth-quick__avatar img,
.auth-quick__menu-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.auth-quick__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  line-height: 1;
  font-weight: 600;
}

.auth-quick__label--muted {
  color: rgba(216, 219, 226, 0.68);
}

.auth-quick__suffix {
  width: 12px;
  height: 12px;
  flex: none;
  color: rgba(239, 243, 255, 0.76);
  transition: transform 0.2s ease;
}

.auth-quick__suffix--open {
  transform: rotate(180deg);
}

.auth-quick__menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 250px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(circle at top right, rgba(96, 147, 255, 0.16), transparent 32%),
    linear-gradient(180deg, rgba(14, 16, 48, 0.98), rgba(10, 12, 34, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 24px 48px rgba(0, 0, 0, 0.34);
}

.auth-quick__menu-head {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.auth-quick__menu-avatar {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  font-size: 14px;
}

.auth-quick__menu-copy {
  min-width: 0;
}

.auth-quick__menu-name,
.auth-quick__menu-subtitle {
  margin: 0;
}

.auth-quick__menu-name {
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.auth-quick__menu-subtitle {
  margin-top: 4px;
  color: rgba(233, 237, 255, 0.66);
  font-size: 12px;
  line-height: 1.45;
  white-space: normal;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.auth-quick__menu-action {
  width: 100%;
  margin-top: 14px;
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
}

.auth-quick__menu-action:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.14);
}

.auth-quick__menu-action-icon {
  width: 14px;
  height: 14px;
}

.auth-quick-menu-enter-active,
.auth-quick-menu-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.auth-quick-menu-enter-from,
.auth-quick-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 640px) {
  .auth-quick__button {
    min-width: 66px;
  }

  .auth-quick__menu {
    width: min(250px, calc(100vw - 32px));
  }
}
</style>
