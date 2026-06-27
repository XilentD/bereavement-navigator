const app = getApp()

// Flat question bank — all strings, no functions, no nesting issues
const BANK = {
  'retired-worker': [
    { k:'death_location', t:'逝者是在哪里离世的？', o:[{l:'医院',v:'at_hospital'},{l:'家中',v:'at_home'},{l:'意外/其他地点',v:'accident'}] },
    { k:'has_real_estate', t:'逝者名下是否有房产？', o:[{l:'有',v:'yes'},{l:'没有',v:'no'}] },
    { k:'has_commercial_insurance', t:'逝者是否购买了商业保险？', o:[{l:'有',v:'yes'},{l:'没有',v:'no'}] },
    { k:'has_will', t:'逝者是否留有遗嘱？', o:[{l:'有',v:'yes'},{l:'没有',v:'no'}] },
    { k:'has_social_security', t:'逝者是否在缴纳社保？', o:[{l:'是',v:'yes'},{l:'否',v:'no'}] }
  ],
  'active-worker': [
    { k:'death_location', t:'逝者是在哪里离世的？', o:[{l:'医院',v:'at_hospital'},{l:'家中',v:'at_home'},{l:'意外/其他地点',v:'accident'}] },
    { k:'has_work_injury', t:'是否因工作原因导致死亡？', o:[{l:'是(工亡)',v:'yes'},{l:'否',v:'no'}] },
    { k:'has_real_estate', t:'逝者名下是否有房产？', o:[{l:'有',v:'yes'},{l:'没有',v:'no'}] },
    { k:'has_commercial_insurance', t:'逝者是否购买了商业保险？', o:[{l:'有',v:'yes'},{l:'没有',v:'no'}] },
    { k:'has_will', t:'逝者是否留有遗嘱？', o:[{l:'有',v:'yes'},{l:'没有',v:'no'}] }
  ],
  'urban-resident': [
    { k:'death_location', t:'逝者是在哪里离世的？', o:[{l:'医院',v:'at_hospital'},{l:'家中',v:'at_home'},{l:'意外/其他地点',v:'accident'}] },
    { k:'has_rural_house', t:'逝者是否有农村宅基地及房屋？', o:[{l:'有',v:'yes'},{l:'没有',v:'no'}] },
    { k:'has_real_estate', t:'逝者名下是否有城镇房产？', o:[{l:'有',v:'yes'},{l:'没有',v:'no'}] },
    { k:'has_commercial_insurance', t:'逝者是否购买了商业保险？', o:[{l:'有',v:'yes'},{l:'没有',v:'no'}] },
    { k:'has_will', t:'逝者是否留有遗嘱？', o:[{l:'有',v:'yes'},{l:'没有',v:'no'}] }
  ],
  'civil-servant': [
    { k:'death_location', t:'逝者是在哪里离世的？', o:[{l:'医院',v:'at_hospital'},{l:'家中',v:'at_home'},{l:'意外/其他地点',v:'accident'}] },
    { k:'has_real_estate', t:'逝者名下是否有房产？', o:[{l:'有',v:'yes'},{l:'没有',v:'no'}] },
    { k:'has_commercial_insurance', t:'逝者是否购买了商业保险？', o:[{l:'有',v:'yes'},{l:'没有',v:'no'}] },
    { k:'has_will', t:'逝者是否留有遗嘱？', o:[{l:'有',v:'yes'},{l:'没有',v:'no'}] }
  ],
  'military': [
    { k:'death_location', t:'逝者是在哪里离世的？', o:[{l:'医院',v:'at_hospital'},{l:'家中',v:'at_home'},{l:'意外/其他地点',v:'accident'}] },
    { k:'military_type', t:'逝者服役状态？', o:[{l:'现役军人',v:'active_duty'},{l:'退役军人',v:'retired'}] },
    { k:'is_martyr_case', t:'是否涉及烈士评定？', o:[{l:'是',v:'yes'},{l:'否',v:'no'}] },
    { k:'has_real_estate', t:'逝者名下是否有房产？', o:[{l:'有',v:'yes'},{l:'没有',v:'no'}] },
    { k:'has_commercial_insurance', t:'逝者是否购买了商业保险？', o:[{l:'有',v:'yes'},{l:'没有',v:'no'}] },
    { k:'has_will', t:'逝者是否留有遗嘱？', o:[{l:'有',v:'yes'},{l:'没有',v:'no'}] }
  ]
}

Page({
  data: {
    percent: 0, qidx: 0, total: 0, qtext: '', options: [], selVal: undefined, isLast: false,
    answers: {}
  },
  onLoad(opts) {
    const pid = opts.pid || 'retired-worker'
    const qs = BANK[pid] || BANK['retired-worker']
    if (!qs || !qs.length) { wx.showToast({title:'加载失败',icon:'none'}); return }
    const q = qs[0]
    this.qs = qs
    this.pid = pid
    this.setData({
      percent: 1/qs.length*100, qidx: 0, total: qs.length,
      qtext: q.t, options: q.o, selVal: undefined, isLast: qs.length===1
    })
  },
  pick(e) {
    const val = e.currentTarget.dataset.val
    const q = this.qs[this.data.qidx]
    this.data.answers[q.k] = val
    this.setData({ selVal: val })
    // Auto-advance
    const that = this
    setTimeout(function(){ that.next() }, 200)
  },
  prev() {
    if (this.data.qidx <= 0) return
    const qidx = this.data.qidx - 1
    const q = this.qs[qidx]
    this.setData({
      percent: (qidx+1)/this.qs.length*100, qidx, qtext: q.t, options: q.o,
      selVal: this.data.answers[q.k], isLast: qidx===this.qs.length-1
    })
  },
  next() {
    if (this.data.isLast) {
      wx.showLoading({title:'生成清单...'})
      const api = require('../../utils/api.js')
      const ans = {}
      const boolKeys = ['has_real_estate','has_commercial_insurance','has_will','has_social_security','has_work_injury','has_rural_house','is_martyr_case']
      for (const q of this.qs) {
        let v = this.data.answers[q.k]
        if (boolKeys.includes(q.k)) v = (v === 'yes' || v === true)
        ans[q.k] = v
      }
      api.getGuide(this.pid, app.globalData.selectedCity, ans).then(function(res){
        app.globalData.guideResult = res
        app.globalData.answers = ans
        wx.hideLoading()
        wx.navigateTo({url:'/pages/timeline/timeline'})
      }).catch(function(){ wx.hideLoading(); wx.showToast({title:'网络错误',icon:'none'}) })
    } else {
      const qidx = this.data.qidx + 1
      const q = this.qs[qidx]
      this.setData({
        percent: (qidx+1)/this.qs.length*100, qidx, qtext: q.t, options: q.o,
        selVal: this.data.answers[q.k], isLast: qidx===this.qs.length-1
      })
    }
  }
})
