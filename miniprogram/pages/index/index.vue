<template>
  <view class="home">
    <view class="hero">
      <text class="hero-emoji">🕯️</text>
      <text class="hero-text">
        我们知道这会是一段艰难的时光。\n接下来你需要跑很多手续，\n我们来帮你逐个理清。
      </text>
    </view>

    <button class="start-btn" @click="startGuide">开始办理</button>

    <view class="resume-hint" v-if="hasSession" @click="resumeGuide">
      你有一个未完成的流程，点击继续
    </view>

    <view class="footer-note">
      本服务完全免费。信息仅供参考，建议办理前致电确认。
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { loadAnswers } from '../../utils/storage.js';

const hasSession = ref(!!loadAnswers());

function startGuide() {
  uni.navigateTo({ url: '/pages/persona/index' });
}

function resumeGuide() {
  uni.navigateTo({ url: '/pages/quiz/index?resume=1' });
}
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 60rpx 40rpx;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
}

.hero-emoji {
  font-size: 80rpx;
  margin-bottom: 40rpx;
}

.hero-text {
  font-size: 36rpx;
  line-height: 2;
  text-align: center;
  color: #555;
  white-space: pre-line;
}

.start-btn {
  width: 400rpx;
  height: 88rpx;
  line-height: 88rpx;
  background-color: #8b7e6a;
  color: #fff;
  border-radius: 44rpx;
  font-size: 34rpx;
  border: none;
}

.resume-hint {
  margin-top: 30rpx;
  color: #8b7e6a;
  font-size: 28rpx;
  text-decoration: underline;
}

.footer-note {
  position: fixed;
  bottom: 40rpx;
  color: #bbb;
  font-size: 24rpx;
  text-align: center;
  padding: 0 40rpx;
}
</style>
