<template>
  <view class="proc-card" :class="{ completed: isCompleted }" @click="$emit('click')">
    <view class="proc-left">
      <view class="urgency-dot" :class="urgency"></view>
      <view class="proc-info">
        <text class="proc-name">{{ name }}</text>
        <text class="proc-where">{{ whereText }}</text>
      </view>
    </view>
    <view class="proc-right">
      <text class="check-icon">{{ isCompleted ? '✅' : '○' }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue';
import { getCompletedSet } from '../../utils/storage.js';

const props = defineProps<{
  id: string;
  name: string;
  urgency: string;
  where: any;
}>();
defineEmits(['click']);

const isCompleted = computed(() => getCompletedSet().has(props.id));
const whereText = computed(() => {
  return props.where.type === 'fixed' ? props.where.name : props.where.resolved;
});
</script>

<style scoped>
.proc-card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24rpx; background: #fff; border-radius: 12rpx; margin-bottom: 12rpx;
  border-left: 6rpx solid #ccc;
}
.proc-card.completed { opacity: 0.5; }
.proc-left { display: flex; align-items: center; gap: 16rpx; flex: 1; }
.urgency-dot { width: 12rpx; height: 12rpx; border-radius: 50%; }
.urgency-dot.critical { background: #e74c3c; }
.urgency-dot.high { background: #f39c12; }
.urgency-dot.normal { background: #95a5a6; }
.proc-name { font-size: 30rpx; display: block; }
.proc-where { font-size: 24rpx; color: #999; display: block; margin-top: 4rpx; }
.proc-right { font-size: 36rpx; }
</style>
