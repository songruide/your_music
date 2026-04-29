<script setup lang="ts">
import { storeToRefs } from 'pinia'
import AiSparkIcon from '@/components/assistant/AiSparkIcon.vue'
import { useAssistantStore } from '@/stores/assistant'

const assistantStore = useAssistantStore()
const { isPanelOpen, isSending } = storeToRefs(assistantStore)

function handleOpen() {
  assistantStore.openPanel()
}
</script>

<template>
  <button
    class="assistant-entry"
    :class="{
      'assistant-entry--active': isPanelOpen,
      'assistant-entry--sending': isSending,
    }"
    type="button"
    aria-label="AI 点歌"
    title="AI 点歌"
    @click="handleOpen"
  >
    <AiSparkIcon class="assistant-entry__icon" />
    <span class="assistant-entry__tooltip" role="tooltip">AI 点歌</span>
  </button>
</template>

<style scoped lang="scss">
.assistant-entry {
  position: relative;
  width: 34px;
  height: 34px;
  padding: 0;
  display: inline-grid;
  place-items: center;
  border: 0;
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)),
    rgba(13, 17, 43, 0.72);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 12px 26px rgba(8, 10, 28, 0.24);
  cursor: pointer;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    background 180ms ease;
}

.assistant-entry:hover,
.assistant-entry:focus-visible,
.assistant-entry--active {
  outline: none;
  transform: translateY(-1px);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.05)),
    rgba(17, 22, 58, 0.84);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 16px 30px rgba(8, 10, 28, 0.28);
}

.assistant-entry--sending .assistant-entry__icon {
  animation: assistant-entry-pulse 1s ease-in-out infinite;
}

.assistant-entry__icon {
  width: 18px;
  height: 18px;
}

.assistant-entry__tooltip {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-height: 26px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(8, 12, 32, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(241, 245, 255, 0.88);
  font-size: 11px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-3px);
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.assistant-entry:hover .assistant-entry__tooltip,
.assistant-entry:focus-visible .assistant-entry__tooltip {
  opacity: 1;
  transform: translateY(0);
}

@keyframes assistant-entry-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.08);
    opacity: 0.82;
  }
}
</style>
