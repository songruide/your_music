export interface ParsedLyricLine {
  time: number
  text: string
  translation?: string
}

interface TimestampedLine {
  time: number
  text: string
}

const TIMESTAMP_PATTERN = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?]/g
const OFFSET_PATTERN = /\[offset:([+-]?\d+)]/i
const TRANSLATION_MATCH_THRESHOLD_SECONDS = 0.6

function parseFractionToSeconds(rawFraction?: string) {
  if (!rawFraction) {
    return 0
  }

  const milliseconds = Number(rawFraction.padEnd(3, '0').slice(0, 3))

  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return 0
  }

  return milliseconds / 1000
}

function normalizeLyricText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function readOffsetSeconds(rawText: string) {
  const match = rawText.match(OFFSET_PATTERN)

  if (!match) {
    return 0
  }

  const offsetMilliseconds = Number(match[1])

  if (!Number.isFinite(offsetMilliseconds) || offsetMilliseconds === 0) {
    return 0
  }

  return offsetMilliseconds / 1000
}

export function parseLyricText(rawText?: string) {
  if (!rawText?.trim()) {
    return [] as TimestampedLine[]
  }

  const lines: TimestampedLine[] = []
  const offsetSeconds = readOffsetSeconds(rawText)

  for (const rawLine of rawText.split(/\r?\n/)) {
    const matches = Array.from(rawLine.matchAll(TIMESTAMP_PATTERN))

    if (matches.length === 0) {
      continue
    }

    const text = normalizeLyricText(rawLine.replace(TIMESTAMP_PATTERN, ''))

    if (!text) {
      continue
    }

    for (const match of matches) {
      const minutes = Number(match[1] ?? 0)
      const seconds = Number(match[2] ?? 0)
      const fractionSeconds = parseFractionToSeconds(match[3])
      const time = minutes * 60 + seconds + fractionSeconds + offsetSeconds

      if (!Number.isFinite(time) || time < 0) {
        continue
      }

      lines.push({
        time,
        text,
      })
    }
  }

  return lines.sort((left, right) => left.time - right.time)
}

function findNearestTranslation(
  translations: TimestampedLine[],
  lyricTime: number,
  startIndex: number,
) {
  let index = startIndex

  while (index < translations.length && translations[index].time < lyricTime - TRANSLATION_MATCH_THRESHOLD_SECONDS) {
    index += 1
  }

  const candidates = [translations[index - 1], translations[index]].filter(Boolean) as TimestampedLine[]
  let bestMatch: TimestampedLine | undefined
  let smallestDelta = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    const delta = Math.abs(candidate.time - lyricTime)

    if (delta > TRANSLATION_MATCH_THRESHOLD_SECONDS || delta >= smallestDelta) {
      continue
    }

    bestMatch = candidate
    smallestDelta = delta
  }

  return {
    nextIndex: index,
    translation: bestMatch,
  }
}

export function mergeLyrics(rawLyric?: string, rawTranslatedLyric?: string) {
  const lyricLines = parseLyricText(rawLyric)
  const translationLines = parseLyricText(rawTranslatedLyric)

  if (lyricLines.length === 0) {
    return translationLines.map((line) => ({
      time: line.time,
      text: line.text,
    }))
  }

  let translationIndex = 0

  return lyricLines.map((line) => {
    const match = findNearestTranslation(translationLines, line.time, translationIndex)

    translationIndex = match.nextIndex

    return {
      time: line.time,
      text: line.text,
      translation:
        match.translation && match.translation.text !== line.text ? match.translation.text : undefined,
    }
  })
}
