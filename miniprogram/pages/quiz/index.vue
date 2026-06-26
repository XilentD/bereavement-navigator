<template>
  <view class="quiz-page">
    <ProgressBar :current="currentIndex + 1" :total="questions.length" />

    <view class="question-card" v-if="currentQuestion">
      <text class="question-text">{{ currentQuestion.text }}</text>

      <view class="options">
        <view
          v-for="opt in currentQuestion.options"
          :key="opt.value"
          class="option-btn"
          :class="{ selected: selectedAnswer === opt.value }"
          @click="selectAnswer(opt.value)"
        >
          {{ opt.label }}
        </view>
      </view>
    </view>

    <button
      class="next-btn"
      :disabled="!selectedAnswer"
      @click="nextQuestion"
    >
      {{ isLast ? '生成清单' : '下一题' }}
    </button>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import ProgressBar from '../../components/ProgressBar.vue';
import { fetchGuide } from '../../api/client.js';
import { saveAnswers } from '../../utils/storage.js';

const personaId = ref(uni.getStorageSync('bn_persona_id') || 'retired_worker');
const answers = ref({});
const currentIndex = ref(0);
const selectedAnswer = ref('');

// Question definitions per persona
const questionSets = {
  retired_worker: [
    { key: 'death_location', text: '逝者是在哪里离世的？', options: [
      { label: '医院', value: 'at_hospital' },
      { label: '家中', value: 'at_home' },
      { label: '意外/其他地点', value: 'accident' },
    ]},
    { key: 'has_real_estate', text: '逝者名下是否有房产？', options: [
      { label: '有', value: true },
      { label: '没有', value: false },
    ]},
    { key: 'has_commercial_insurance', text: '逝者是否购买了商业保险？', options: [
      { label: '有', value: true },
      { label: '没有', value: false },
    ]},
    { key: 'has_will', text: '逝者是否留有遗嘱？', options: [
      { label: '有', value: true },
      { label: '没有', value: false },
    ]},
    { key: 'has_social_security', text: '逝者是否在杭州缴纳社保？', options: [
      { label: '是', value: true },
      { label: '否', value: false },
    ]},
  ],
  // Other personas share similar structure with slightly different questions
  active_worker: [
    { key: 'death_location', text: '逝者是在哪里离世的？', options: [
      { label: '医院', value: 'at_hospital' },
      { label: '家中', value: 'at_home' },
      { label: '意外/其他地点', value: 'accident' },
    ]},
    { key: 'has_work_injury', text: '是否因工作原因导致死亡？', options: [
      { label: '是（工亡）', value: true },
      { label: '否', value: false },
    ]},
    { key: 'has_real_estate', text: '逝者名下是否有房产？', options: [
      { label: '有', value: true },
      { label: '没有', value: false },
    ]},
    { key: 'has_commercial_insurance', text: '逝者是否购买了商业保险？', options: [
      { label: '有', value: true },
      { label: '没有', value: false },
    ]},
    { key: 'has_will', text: '逝者是否留有遗嘱？', options: [
      { label: '有', value: true },
      { label: '没有', value: false },
    ]},
  ],
};

const questions = computed(() => questionSets[personaId.value] || questionSets.retired_worker);
const isLast = computed(() => currentIndex.value >= questions.value.length - 1);
const currentQuestion = computed(() => questions.value[currentIndex.value]);

function selectAnswer(value) {
  selectedAnswer.value = value;
}

async function nextQuestion() {
  const key = currentQuestion.value.key;
  answers.value[key] = selectedAnswer.value;

  if (isLast.value) {
    // All questions answered — call API
    saveAnswers(personaId.value, answers.value);
    try {
      const result = await fetchGuide({
        persona_id: personaId.value,
        city: 'hangzhou',
        answers: answers.value,
      });
      uni.setStorageSync('bn_guide_result', JSON.stringify(result));
      uni.navigateTo({ url: '/pages/timeline/index' });
    } catch (e) {
      uni.showToast({ title: '网络错误，请重试', icon: 'none' });
    }
  } else {
    currentIndex.value++;
    selectedAnswer.value = '';
  }
}
</script>

<style scoped>
.quiz-page { padding: 40rpx; display: flex; flex-direction: column; min-height: 90vh; }
.question-card { margin: 60rpx 0; }
.question-text { font-size: 36rpx; line-height: 1.8; display: block; margin-bottom: 40rpx; }
.options { display: flex; flex-direction: column; gap: 20rpx; }
.option-btn {
  background: #fff; border: 2rpx solid #ddd; border-radius: 12rpx;
  padding: 28rpx; font-size: 32rpx; text-align: center;
}
.option-btn.selected { border-color: #8b7e6a; background: #f5f0eb; color: #8b7e6a; }
.next-btn {
  margin-top: auto; width: 100%; height: 88rpx; line-height: 88rpx;
  background: #8b7e6a; color: #fff; border-radius: 44rpx; font-size: 32rpx; border: none;
}
.next-btn[disabled] { background: #ccc; }
</style>
