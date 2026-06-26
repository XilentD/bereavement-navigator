<template>
  <view class="timeline-page">
    <view class="header">
      <text class="persona-name">{{ guide?.persona.name }}</text>
      <text class="summary">
        共 {{ guide?.summary.total_procedures }} 项 ·
        {{ guide?.summary.critical_count }} 项紧急
      </text>
    </view>

    <view v-for="phase in guide?.timeline" :key="phase.phase" class="phase-group">
      <view class="phase-header">
        <text class="phase-icon">{{ phaseIcon(phase.phase) }}</text>
        <view>
          <text class="phase-title">{{ phase.title }}</text>
          <text class="phase-time">{{ phaseLabel(phase.phase) }}</text>
        </view>
      </view>

      <ProcedureCard
        v-for="proc in phase.procedures"
        :key="proc.id"
        :id="proc.id"
        :name="proc.name"
        :urgency="proc.urgency"
        :where="proc.where"
        @click="openDetail(proc)"
      />
    </view>

    <view class="actions">
      <button class="action-btn" @click="generateChecklistPdf">下载材料清单 PDF</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import ProcedureCard from '../../components/ProcedureCard.vue';

const guide = ref(null);

onMounted(() => {
  const raw = uni.getStorageSync('bn_guide_result');
  if (raw) guide.value = JSON.parse(raw);
});

const phaseLabels = { '24h': '24小时内', '3d': '1-3天', '7d': '3-7天', '30d': '7-30天', '90d': '30-90天', long: '长期' };
const phaseIcons = { '24h': '⚠️', '3d': '🕯️', '7d': '📋', '30d': '💰', '90d': '🏠', long: '📝' };

function phaseIcon(phase) { return phaseIcons[phase] || '📌'; }
function phaseLabel(phase) { return phaseLabels[phase] || phase; }

function openDetail(proc) {
  uni.setStorageSync('bn_current_proc', JSON.stringify(proc));
  uni.navigateTo({ url: '/pages/detail/index' });
}

function generateChecklistPdf() {
  uni.showToast({ title: '请在详情页生成PDF', icon: 'none' });
}
</script>

<style scoped>
.timeline-page { padding: 20rpx; }
.header { padding: 30rpx 20rpx; }
.persona-name { font-size: 36rpx; font-weight: bold; display: block; }
.summary { font-size: 28rpx; color: #888; display: block; margin-top: 8rpx; }
.phase-group { margin-bottom: 24rpx; }
.phase-header { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 8rpx; }
.phase-icon { font-size: 40rpx; }
.phase-title { font-size: 32rpx; font-weight: bold; display: block; }
.phase-time { font-size: 24rpx; color: #999; display: block; }
.actions { padding: 40rpx 20rpx; }
.action-btn { background: #fff; border: 2rpx solid #8b7e6a; color: #8b7e6a; border-radius: 44rpx; font-size: 30rpx; margin-bottom: 20rpx; }
</style>
