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
        <span class="player__time">00:40</span>
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
  left: 32px;
  right: 32px;
  bottom: 24px;
  z-index: 5;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 80px;
  align-items: center;
  gap: 20px;
  padding: 12px 16px;
  border-radius: 26px;
  background: rgba(8, 10, 16, 0.8);
  backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
  max-width: 920px;
  margin: 0 auto;
}

.player__meta {
  display: flex;
  align-items: center;
  gap: 14px;
}

.player__cover {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  object-fit: cover;
}

.player__name {
  font-weight: 700;
}

.player__artist,
.player__time,
.player__right {
  color: rgba(255, 255, 255, 0.58);
}

.player__center {
  display: grid;
  gap: 10px;
}

.player__controls {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.player__controls button {
  width: 38px;
  height: 38px;
  border: 0;
  color: #fff;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
}

.player__play {
  background: linear-gradient(135deg, #ff5cc8, #ff8a5c) !important;
}

.player__progress {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 56px;
  align-items: center;
  gap: 10px;
}

.player__track {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
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
}

@media (max-width: 960px) {
  .player {
    left: 16px;
    right: 16px;
    grid-template-columns: 1fr;
  }
}
</style>
