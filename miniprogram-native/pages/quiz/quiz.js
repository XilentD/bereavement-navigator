const api = require('../../utils/api.js')
const app = getApp()

const QS = {
  'retired-worker': [
    {key:'death_location',text:'逝者是在哪里离世的？',options:[{label:'医院',value:'at_hospital'},{label:'家中',value:'at_home'},{label:'意外/其他地点',value:'accident'}]},
    {key:'has_real_estate',text:'逝者名下是否有房产？',options:[{label:'有',value:true},{label:'没有',value:false}]},
    {key:'has_commercial_insurance',text:'逝者是否购买了商业保险？',options:[{label:'有',value:true},{label:'没有',value:false}]},
    {key:'has_will',text:'逝者是否留有遗嘱？',options:[{label:'有',value:true},{label:'没有',value:false}]},
    {key:'has_social_security',text:'逝者是否缴纳社保？',options:[{label:'是',value:true},{label:'否',value:false}]}
  ],
  'active-worker': [
    {key:'death_location',text:'逝者是在哪里离世的？',options:[{label:'医院',value:'at_hospital'},{label:'家中',value:'at_home'},{label:'意外/其他地点',value:'accident'}]},
    {key:'has_work_injury',text:'是否因工作原因导致死亡？',options:[{label:'是(工亡)',value:true},{label:'否',value:false}]},
    {key:'has_real_estate',text:'逝者名下是否有房产？',options:[{label:'有',value:true},{label:'没有',value:false}]},
    {key:'has_commercial_insurance',text:'逝者是否购买了商业保险？',options:[{label:'有',value:true},{label:'没有',value:false}]},
    {key:'has_will',text:'逝者是否留有遗嘱？',options:[{label:'有',value:true},{label:'没有',value:false}]}
  ],
  'urban-resident': [
    {key:'death_location',text:'逝者是在哪里离世的？',options:[{label:'医院',value:'at_hospital'},{label:'家中',value:'at_home'},{label:'意外/其他地点',value:'accident'}]},
    {key:'has_rural_house',text:'逝者是否有农村宅基地及房屋？',options:[{label:'有',value:true},{label:'没有',value:false}]},
    {key:'has_real_estate',text:'逝者名下是否有城镇房产？',options:[{label:'有',value:true},{label:'没有',value:false}]},
    {key:'has_commercial_insurance',text:'逝者是否购买了商业保险？',options:[{label:'有',value:true},{label:'没有',value:false}]},
    {key:'has_will',text:'逝者是否留有遗嘱？',options:[{label:'有',value:true},{label:'没有',value:false}]}
  ],
  'civil-servant': [
    {key:'death_location',text:'逝者是在哪里离世的？',options:[{label:'医院',value:'at_hospital'},{label:'家中',value:'at_home'},{label:'意外/其他地点',value:'accident'}]},
    {key:'has_real_estate',text:'逝者名下是否有房产？',options:[{label:'有',value:true},{label:'没有',value:false}]},
    {key:'has_commercial_insurance',text:'逝者是否购买了商业保险？',options:[{label:'有',value:true},{label:'没有',value:false}]},
    {key:'has_will',text:'逝者是否留有遗嘱？',options:[{label:'有',value:true},{label:'没有',value:false}]}
  ],
  'military': [
    {key:'death_location',text:'逝者是在哪里离世的？',options:[{label:'医院',value:'at_hospital'},{label:'家中',value:'at_home'},{label:'意外/其他地点',value:'accident'}]},
    {key:'military_type',text:'逝者服役状态？',options:[{label:'现役军人',value:'active_duty'},{label:'退役军人',value:'retired'}]},
    {key:'is_martyr_case',text:'是否涉及烈士评定？',options:[{label:'是',value:true},{label:'否',value:false}]},
    {key:'has_real_estate',text:'逝者名下是否有房产？',options:[{label:'有',value:true},{label:'没有',value:false}]},
    {key:'has_commercial_insurance',text:'逝者是否购买了商业保险？',options:[{label:'有',value:true},{label:'没有',value:false}]},
    {key:'has_will',text:'逝者是否留有遗嘱？',options:[{label:'有',value:true},{label:'没有',value:false}]}
  ]
}

Page({
  data: { questions: [], qidx: 0, question: {}, answers: {}, isLast: false },
  onLoad() {
    const pid = app.globalData.selectedPersona || 'retired-worker'
    const questions = QS[pid] || QS['retired-worker']
    this.setData({ questions, qidx: 0, question: questions[0], isLast: questions.length === 1, answers: {} })
  },
  pick(e) {
    const key = e.currentTarget.dataset.key
    const val = e.currentTarget.dataset.val
    const answers = { ...this.data.answers, [key]: val }
    this.setData({ answers })
    // Auto-advance after short delay
    setTimeout(() => {
      if (this.data.isLast) { this.next() } else {
        const qidx = this.data.qidx + 1
        this.setData({ qidx, question: this.data.questions[qidx], isLast: qidx === this.data.questions.length - 1 })
      }
    }, 250)
  },
  prev() {
    if (this.data.qidx > 0) {
      const qidx = this.data.qidx - 1
      this.setData({ qidx, question: this.data.questions[qidx], isLast: qidx === this.data.questions.length - 1 })
    }
  },
  next() {
    if (this.data.isLast) {
      app.globalData.answers = this.data.answers
      wx.showLoading({ title: '生成清单...' })
      api.getGuide(app.globalData.selectedPersona, app.globalData.selectedCity, this.data.answers).then(res => {
        app.globalData.guideResult = res
        wx.hideLoading()
        wx.navigateTo({ url: '/pages/timeline/timeline' })
      }).catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      })
    } else {
      const qidx = this.data.qidx + 1
      this.setData({ qidx, question: this.data.questions[qidx], isLast: qidx === this.data.questions.length - 1 })
    }
  }
})
