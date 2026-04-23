<script setup lang="ts">
import { computed } from 'vue'
import { Heart, MapPin, MessageSquareMore } from 'lucide-vue-next'
import type { CommentItem } from '@/api/comment'

const props = withDefaults(
  defineProps<{
    comments: CommentItem[]
    emptyText?: string
    error?: string
    hasMore?: boolean
    hotComments?: CommentItem[]
    loading?: boolean
    loadingMore?: boolean
  }>(),
  {
    emptyText: '暂时还没有评论。',
    error: '',
    hasMore: false,
    hotComments: () => [],
    loading: false,
    loadingMore: false,
  },
)

const emit = defineEmits<{
  (event: 'load-more'): void
  (event: 'retry'): void
}>()

function formatCount(value?: number) {
  if (!Number.isFinite(value) || value === undefined || value <= 0) {
    return '0'
  }

  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(1).replace(/\.0$/, '')}亿`
  }

  if (value >= 10_000) {
    return `${(value / 10_000).toFixed(1).replace(/\.0$/, '')}万`
  }

  return String(Math.round(value))
}

const hasAnyComments = computed(() => props.hotComments.length > 0 || props.comments.length > 0)
</script>

<template>
  <div class="comments-panel">
    <div v-if="loading && !hasAnyComments" class="comments-panel__state">评论加载中...</div>
    <div v-else-if="error && !hasAnyComments" class="comments-panel__state comments-panel__state--error">
      <span>{{ error }}</span>
      <button class="comments-panel__retry" type="button" @click="emit('retry')">重新加载</button>
    </div>
    <div v-else-if="!hasAnyComments" class="comments-panel__state">
      {{ emptyText }}
    </div>
    <template v-else>
      <section v-if="hotComments.length > 0" class="comments-panel__section">
        <div class="comments-panel__heading">精彩评论</div>
        <article v-for="comment in hotComments" :key="`hot-${comment.id}`" class="comment-card">
          <img
            class="comment-card__avatar"
            :src="comment.user.avatarUrl"
            :alt="comment.user.nickname"
            referrerpolicy="no-referrer"
          />
          <div class="comment-card__body">
            <div class="comment-card__meta">
              <strong class="comment-card__nickname">{{ comment.user.nickname }}</strong>
              <span v-if="comment.location" class="comment-card__hint">
                <MapPin :size="12" :stroke-width="2" />
                <span>{{ comment.location }}</span>
              </span>
              <span class="comment-card__hint">{{ comment.timeLabel || '最近' }}</span>
            </div>
            <p class="comment-card__content">{{ comment.content }}</p>
            <div v-if="comment.reply" class="comment-card__reply">
              <span class="comment-card__reply-user">@{{ comment.reply.userNickname }}</span>
              <span>{{ comment.reply.content }}</span>
            </div>
            <div class="comment-card__foot">
              <span class="comment-card__like">
                <Heart :size="12" :stroke-width="2" />
                <span>{{ formatCount(comment.likedCount) }}</span>
              </span>
            </div>
          </div>
        </article>
      </section>

      <section class="comments-panel__section">
        <div class="comments-panel__heading">最新评论</div>
        <article v-for="comment in comments" :key="comment.id" class="comment-card">
          <img
            class="comment-card__avatar"
            :src="comment.user.avatarUrl"
            :alt="comment.user.nickname"
            referrerpolicy="no-referrer"
          />
          <div class="comment-card__body">
            <div class="comment-card__meta">
              <strong class="comment-card__nickname">{{ comment.user.nickname }}</strong>
              <span v-if="comment.location" class="comment-card__hint">
                <MapPin :size="12" :stroke-width="2" />
                <span>{{ comment.location }}</span>
              </span>
              <span class="comment-card__hint">{{ comment.timeLabel || '最近' }}</span>
            </div>
            <p class="comment-card__content">{{ comment.content }}</p>
            <div v-if="comment.reply" class="comment-card__reply">
              <span class="comment-card__reply-user">@{{ comment.reply.userNickname }}</span>
              <span>{{ comment.reply.content }}</span>
            </div>
            <div class="comment-card__foot">
              <span class="comment-card__like">
                <Heart :size="12" :stroke-width="2" />
                <span>{{ formatCount(comment.likedCount) }}</span>
              </span>
            </div>
          </div>
        </article>
      </section>

      <div v-if="error && hasAnyComments" class="comments-panel__inline-error">
        <MessageSquareMore :size="14" :stroke-width="2.1" />
        <span>{{ error }}</span>
      </div>

      <button
        v-if="hasMore"
        class="comments-panel__more"
        type="button"
        :disabled="loadingMore"
        @click="emit('load-more')"
      >
        {{ loadingMore ? '正在加载更多评论...' : '加载更多评论' }}
      </button>
    </template>
  </div>
</template>

<style scoped lang="scss">
.comments-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.comments-panel__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comments-panel__heading {
  color: rgba(247, 250, 255, 0.94);
  font-size: 15px;
  font-weight: 700;
}

.comments-panel__state,
.comments-panel__inline-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 120px;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(234, 239, 255, 0.62);
  text-align: center;
}

.comments-panel__state--error,
.comments-panel__inline-error {
  color: #ffd7e4;
}

.comments-panel__inline-error {
  min-height: 0;
  justify-content: flex-start;
}

.comments-panel__retry,
.comments-panel__more {
  height: 38px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(249, 251, 255, 0.92);
  cursor: pointer;
  transition:
    transform 180ms ease,
    background 180ms ease;
}

.comments-panel__retry:hover,
.comments-panel__more:hover:not(:disabled) {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.14);
}

.comments-panel__more:disabled {
  cursor: wait;
  opacity: 0.72;
}

.comment-card {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.03)),
    rgba(10, 12, 30, 0.5);
}

.comment-card__avatar {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
}

.comment-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.comment-card__meta,
.comment-card__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.comment-card__nickname {
  color: rgba(250, 252, 255, 0.96);
  font-size: 13px;
}

.comment-card__hint,
.comment-card__like {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: rgba(223, 229, 255, 0.54);
  font-size: 12px;
}

.comment-card__content {
  margin: 0;
  color: rgba(245, 247, 255, 0.9);
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-card__reply {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(226, 233, 255, 0.74);
  font-size: 12px;
  line-height: 1.7;
  word-break: break-word;
}

.comment-card__reply-user {
  color: rgba(255, 195, 223, 0.92);
}

@media (max-width: 640px) {
  .comment-card {
    grid-template-columns: 36px minmax(0, 1fr);
    gap: 10px;
    padding: 12px;
    border-radius: 18px;
  }

  .comment-card__avatar {
    width: 36px;
    height: 36px;
  }
}
</style>
