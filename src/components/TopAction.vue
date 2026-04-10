<template>
  <div class="top-action">
    <button class="top-action__btn">Repository</button>
    <button class="top-action__btn">About me</button>
  </div>
</template>

<style scoped lang="scss">
.top-action {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.top-action__btn {
  padding: 10px 18px;
  color: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(12, 15, 24, 0.58);
  backdrop-filter: blur(18px);
  cursor: pointer;
  transition: 0.25s ease;
}

.top-action__btn:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.1);
}
</style>
