import type { ArtistRef } from '@/types/music'

export type AssistantIntent = 'reply_only' | 'search_song' | 'play_song' | 'enqueue_song' | 'play_next'

export interface AssistantRouteContext {
  name?: string
  path?: string
  title?: string
}

export interface AssistantTrackContext {
  id?: string
  title: string
  artist?: string
  album?: string
  duration?: string
}

export interface AssistantQueueTrackContext {
  id?: string
  title: string
  artist?: string
}

export interface AssistantConversationContext {
  route?: AssistantRouteContext | null
  currentTrack?: AssistantTrackContext | null
  queue?: AssistantQueueTrackContext[]
}

export interface AssistantTransportMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AssistantSongResult {
  id: string
  name: string
  artists: ArtistRef[]
  artistNames: string[]
  albumId?: string
  albumName: string
  coverUrl: string
  duration?: number
  playable?: boolean
}

export interface AssistantActionPayload {
  intent: AssistantIntent
  query?: string
  selectedIndex?: number
  songs: AssistantSongResult[]
}

export interface AssistantResponsePayload {
  reply: string
  action: AssistantActionPayload
  source: 'model' | 'fallback'
  usedModel: boolean
}

export interface AssistantRequestPayload {
  messages: AssistantTransportMessage[]
  context: AssistantConversationContext
}
