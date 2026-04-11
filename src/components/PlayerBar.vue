<template>
  <footer class="player">
    <div class="player__meta">
      <img class="player__cover" src="https://picsum.photos/seed/album/72/72" alt="cover" />
      <div>
        <div class="player__name">Intro AE 86</div>
        <div class="player__artist">陈光荣</div>
      </div>
    </div>

    <div class="player__center">
      <div class="player__controls">
        <button>◀◀</button>
        <button class="player__play">▶</button>
        <button>▶▶</button>
      </div>

      <div class="player__progress">
        <span class="player__time">00:00</span>
        <div class="player__track">
          <span class="player__bar"></span>
        </div>
        <span class="player__time">02:29</span>
      </div>
    </div>

    <div class="player__right">Hi-Fi</div>
  </footer>
</template>

<style scoped lang="scss">
.player {
  position: fixed;
  left: 14px;
  right: 14px;
  bottom: 8px;
  z-index: 5;
  display: grid;
  grid-template-columns: 112px minmax(0, 320px) 26px;
  align-items: center;
  gap: 12px;
  padding: 4px 8px;
  border-radius: 18px;
  background: rgba(8, 10, 16, 0.14);
  backdrop-filter: blur(10px);
  border: 0;
  box-shadow: none;
  max-width: 620px;
  margin: 0 auto;
}

.player__meta {
  display: flex;
  align-items: center;
  gap: 14px;
}

.player__cover {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  object-fit: cover;
}

.player__name {
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.player__artist,
.player__time,
.player__right {
  color: rgba(255, 255, 255, 0.58);
  font-size: 10px;
}

.player__center {
  display: grid;
  gap: 6px;
}

.player__controls {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.player__controls button {
  width: 22px;
  height: 22px;
  border: 0;
  color: #fff;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  font-size: 10px;
}

.player__play {
  width: 28px !important;
  height: 28px !important;
  background: rgba(255, 255, 255, 0.14) !important;
}

.player__progress {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 56px;
  align-items: center;
  gap: 10px;
}

.player__track {
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.player__bar {
  display: block;
  width: 36%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ff5cc8, #ff9c66);
}

.player__right {
  text-align: right;
  font-size: 9px;
}

@media (max-width: 960px) {
  .player {
    left: 10px;
    right: 10px;
    grid-template-columns: 1fr;
    max-width: none;
  }
}
</style>
