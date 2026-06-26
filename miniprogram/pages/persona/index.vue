<template>
  <view class="persona-page">
    <text class="page-title">请选择逝者身份类型</text>
    <text class="page-subtitle">选错没关系，可以重新选择</text>

    <view class="card-list">
      <view
        v-for="p in personas"
        :key="p.id"
        class="persona-card"
        @click="selectPersona(p.id)"
      >
        <text class="card-name">{{ p.name }}</text>
        <text class="card-desc">{{ p.description }}</text>
      </view>
    </view>

    <view v-if="loading" class="loading">加载中...</view>
    <view v-if="error" class="error">加载失败，请下拉重试</view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { fetchPersonas } from '../../api/client.js';

const personas = ref([]);
const loading = ref(true);
const error = ref(false);

onMounted(async () => {
  try {
    personas.value = await fetchPersonas();
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
});

function selectPersona(id) {
  uni.setStorageSync('bn_persona_id', id);
  uni.navigateTo({ url: `/pages/quiz/index` });
}
</script>

<style scoped>
.persona-page { padding: 40rpx; }
.page-title { font-size: 38rpx; font-weight: bold; display: block; margin-bottom: 10rpx; }
.page-subtitle { font-size: 28rpx; color: #999; display: block; margin-bottom: 40rpx; }
.card-list { display: flex; flex-direction: column; gap: 20rpx; }
.persona-card {
  background: #fff; border-radius: 16rpx; padding: 30rpx;
  border: 2rpx solid #e8e0d5;
}
.card-name { font-size: 34rpx; font-weight: bold; display: block; }
.card-desc { font-size: 28rpx; color: #888; margin-top: 8rpx; display: block; }
</style>
