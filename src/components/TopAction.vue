<template>
  <div class="top-action">
    <button class="top-action__btn">Repository</button>
    <button class="top-action__btn">About me</button>
  </div>
</template>

<style scoped lang="scss">
.top-action {
  display: flex;
  justify-content: flex-start;
  gap: 10px;
}

.top-action__btn {
  height: 28px;
  padding: 0 11px;
  color: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 11px;
  background: rgba(12, 15, 24, 0.42);
  backdrop-filter: blur(14px);
  cursor: pointer;
  transition: 0.25s ease;
  font-size: 10px;
}

.top-action__btn:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.1);
}
</style>
