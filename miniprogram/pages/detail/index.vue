<template>
  <view class="detail-page" v-if="proc">
    <view class="section">
      <text class="proc-name">{{ proc.name }}</text>
      <text class="urgency-badge" :class="proc.urgency">
        {{ proc.urgency === 'critical' ? '紧急' : proc.urgency === 'high' ? '重要' : '正常' }}
      </text>
    </view>

    <view class="section">
      <text class="section-title">📍 办理地点</text>
      <text class="section-text">{{ whereName }}</text>
      <text class="section-sub" v-if="whereAddr">{{ whereAddr }}</text>
      <text class="section-sub" v-if="wherePhone">📞 {{ wherePhone }}</text>
    </view>

    <view class="section">
      <text class="section-title">📋 需要携带的材料</text>
      <view class="material-list">
        <view v-for="o in proc.need.originals" :key="o" class="material-item original">
          <text>□ {{ o }}（原件）</text>
        </view>
        <view v-for="c in proc.need.copies" :key="c.doc" class="material-item copy">
          <text>□ {{ c.doc }} 复印件×{{ c.count }}</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="proc.output">
      <text class="section-title">📤 办完后会得到</text>
      <text class="section-text output-text">{{ proc.output }}</text>
    </view>

    <view class="section" v-if="proc.notes">
      <text class="section-title">⚠️ 注意事项</text>
      <text class="section-text notes-text">{{ proc.notes }}</text>
    </view>

    <view class="actions">
      <button class="action-btn primary" @click="generateDelegationPdf">生成授权委托书</button>
      <button class="action-btn" :class="{ done: isCompleted }" @click="toggleDone">
        {{ isCompleted ? '撤销完成' : '标记为已完成' }}
      </button>
    </view>

    <view class="feedback">
      <text>信息有误？<text class="link" @click="reportError">反馈给我们</text></text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getCompletedSet, toggleCompleted } from '../../utils/storage.js';
import { fetchDelegationPdf } from '../../api/client.js';

const proc = ref(null);
const isCompleted = ref(false);

onMounted(() => {
  const raw = uni.getStorageSync('bn_current_proc');
  if (raw) {
    proc.value = JSON.parse(raw);
    isCompleted.value = getCompletedSet().has(proc.value.id);
  }
});

const whereName = computed(() =>
  proc.value?.where.type === 'fixed' ? proc.value.where.name : proc.value.where.resolved
);
const whereAddr = computed(() => proc.value?.where.address);
const wherePhone = computed(() => proc.value?.where.phone);

function toggleDone() {
  if (proc.value) {
    isCompleted.value = toggleCompleted(proc.value.id);
  }
}

async function generateDelegationPdf() {
  try {
    const pdfPath = await fetchDelegationPdf({
      principalName: '',
      principalId: '',
      agentName: '',
      agentId: '',
      relationship: '',
      deceasedName: '',
      deceasedId: '',
      deathDate: '',
      persona_id: uni.getStorageSync('bn_persona_id'),
      answers: JSON.parse(uni.getStorageSync('bn_answers') || '{}'),
    });
    uni.openDocument({ filePath: pdfPath, fileType: 'pdf' });
  } catch (e) {
    uni.showToast({ title: '生成失败，请稍后重试', icon: 'none' });
  }
}

function reportError() {
  uni.showToast({ title: '感谢反馈，我们会尽快核实', icon: 'none' });
}
</script>

<style scoped>
.detail-page { padding: 30rpx; }
.section { margin-bottom: 32rpx; }
.proc-name { font-size: 38rpx; font-weight: bold; display: block; }
.urgency-badge { font-size: 24rpx; padding: 4rpx 16rpx; border-radius: 20rpx; }
.urgency-badge.critical { background: #fde8e8; color: #e74c3c; }
.urgency-badge.high { background: #fef3e2; color: #f39c12; }
.section-title { font-size: 30rpx; font-weight: bold; display: block; margin-bottom: 12rpx; }
.section-text { font-size: 30rpx; display: block; line-height: 1.8; }
.section-sub { font-size: 26rpx; color: #888; display: block; margin-top: 4rpx; }
.material-item { font-size: 28rpx; padding: 8rpx 0; }
.material-item.original { font-weight: bold; }
.output-text { color: #27ae60; }
.notes-text { color: #e67e22; }
.actions { margin-top: 40rpx; display: flex; flex-direction: column; gap: 16rpx; }
.action-btn { border-radius: 44rpx; font-size: 30rpx; height: 88rpx; line-height: 88rpx; }
.action-btn.primary { background: #8b7e6a; color: #fff; border: none; }
.action-btn.done { background: #27ae60; color: #fff; border: none; }
.feedback { margin-top: 40rpx; text-align: center; }
.link { color: #8b7e6a; text-decoration: underline; }
</style>
