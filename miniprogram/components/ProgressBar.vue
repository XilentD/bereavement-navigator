<template>
  <view class="progress-bar">
    <view class="progress-fill" :style="{ width: percent + '%' }"></view>
  </view>
  <view class="progress-text">第 {{ current }} / {{ total }} 题</view>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps<{ current: number; total: number }>();
const percent = computed(() => Math.round((props.current / props.total) * 100));
</script>

<style scoped>
.progress-bar {
  height: 8rpx;
  background: #e0d8cc;
  border-radius: 4rpx;
  margin-bottom: 8rpx;
}
.progress-fill {
  height: 100%;
  background: #8b7e6a;
  border-radius: 4rpx;
  transition: width 0.3s ease;
}
.progress-text {
  font-size: 24rpx;
  color: #999;
  text-align: center;
}
</style>
