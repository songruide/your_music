<template>
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="ai-spark-primary" x1="5" y1="5" x2="27" y2="27" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#67E8F9" />
        <stop offset="0.52" stop-color="#7C5CFF" />
        <stop offset="1" stop-color="#FF62D0" />
      </linearGradient>
      <linearGradient id="ai-spark-secondary" x1="10" y1="3" x2="22" y2="29" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="rgba(255,255,255,0.96)" />
        <stop offset="1" stop-color="rgba(255,255,255,0.58)" />
      </linearGradient>
      <filter id="ai-spark-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.8" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <circle cx="16" cy="16" r="14" fill="rgba(255,255,255,0.06)" />
    <circle cx="16" cy="16" r="12.5" stroke="url(#ai-spark-primary)" stroke-opacity="0.42" />

    <path
      d="M16 7.5L18.54 13.46L24.5 16L18.54 18.54L16 24.5L13.46 18.54L7.5 16L13.46 13.46L16 7.5Z"
      fill="url(#ai-spark-primary)"
      filter="url(#ai-spark-glow)"
    />
    <path
      d="M23.5 6L24.33 7.67L26 8.5L24.33 9.33L23.5 11L22.67 9.33L21 8.5L22.67 7.67L23.5 6Z"
      fill="url(#ai-spark-secondary)"
    />
    <path
      d="M9 21L10 23L12 24L10 25L9 27L8 25L6 24L8 23L9 21Z"
      fill="url(#ai-spark-secondary)"
      opacity="0.92"
    />
  </svg>
</template>
