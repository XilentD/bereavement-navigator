const app = getApp()

Page({
  data: {
    percent: 0, qidx: 0, total: 0, qtext: '', options: [], selVal: '', isLast: false
  },

  onLoad(opts) {
    const pid = opts.pid || 'retired-worker'
    const qs = this.getQuestions(pid)
    const q = qs[0]
    this.qs = qs
    this.pid = pid
    this.answers = {}
    this.setData({
      percent: Math.round(1/qs.length*100), qidx: 0, total: qs.length,
      qtext: q.t, options: q.o, selVal: '', isLast: qs.length === 1
    })
  },

  getQuestions(pid) {
    const all = {
      'retired-worker': [
        ['death_location','逝者是在哪里离世的？',[['医院','at_hospital'],['家中','at_home'],['意外/其他地点','accident']]],
        ['has_real_estate','逝者名下是否有房产？',[['有','yes'],['没有','no']]],
        ['has_commercial_insurance','逝者是否购买了商业保险？',[['有','yes'],['没有','no']]],
        ['has_will','逝者是否留有遗嘱？',[['有','yes'],['没有','no']]],
        ['has_social_security','逝者是否在缴纳社保？',[['是','yes'],['否','no']]]
      ],
      'active-worker': [
        ['death_location','逝者是在哪里离世的？',[['医院','at_hospital'],['家中','at_home'],['意外/其他地点','accident']]],
        ['has_work_injury','是否因工作原因导致死亡？',[['是(工亡)','yes'],['否','no']]],
        ['has_real_estate','逝者名下是否有房产？',[['有','yes'],['没有','no']]],
        ['has_commercial_insurance','逝者是否购买了商业保险？',[['有','yes'],['没有','no']]],
        ['has_will','逝者是否留有遗嘱？',[['有','yes'],['没有','no']]]
      ],
      'urban-resident': [
        ['death_location','逝者是在哪里离世的？',[['医院','at_hospital'],['家中','at_home'],['意外/其他地点','accident']]],
        ['has_rural_house','逝者是否有农村宅基地及房屋？',[['有','yes'],['没有','no']]],
        ['has_real_estate','逝者名下是否有城镇房产？',[['有','yes'],['没有','no']]],
        ['has_commercial_insurance','逝者是否购买了商业保险？',[['有','yes'],['没有','no']]],
        ['has_will','逝者是否留有遗嘱？',[['有','yes'],['没有','no']]]
      ],
      'civil-servant': [
        ['death_location','逝者是在哪里离世的？',[['医院','at_hospital'],['家中','at_home'],['意外/其他地点','accident']]],
        ['has_real_estate','逝者名下是否有房产？',[['有','yes'],['没有','no']]],
        ['has_commercial_insurance','逝者是否购买了商业保险？',[['有','yes'],['没有','no']]],
        ['has_will','逝者是否留有遗嘱？',[['有','yes'],['没有','no']]]
      ],
      'military': [
        ['death_location','逝者是在哪里离世的？',[['医院','at_hospital'],['家中','at_home'],['意外/其他地点','accident']]],
        ['military_type','逝者服役状态？',[['现役军人','active_duty'],['退役军人','retired']]],
        ['is_martyr_case','是否涉及烈士评定？',[['是','yes'],['否','no']]],
        ['has_real_estate','逝者名下是否有房产？',[['有','yes'],['没有','no']]],
        ['has_commercial_insurance','逝者是否购买了商业保险？',[['有','yes'],['没有','no']]],
        ['has_will','逝者是否留有遗嘱？',[['有','yes'],['没有','no']]]
      ]
    }
    const raw = all[pid] || all['retired-worker']
    return raw.map(function(r){ return {k:r[0], t:r[1], o:r[2].map(function(o){ return {l:o[0], v:o[1]} }) } })
  },

  pick(e) {
    const q = this.qs[this.data.qidx]
    this.answers[q.k] = e.currentTarget.dataset.val
    this.setData({ selVal: e.currentTarget.dataset.val })
    var that = this
    setTimeout(function(){ that.next() }, 200)
  },

  prev() {
    if (this.data.qidx <= 0) return
    var qidx = this.data.qidx - 1
    var q = this.qs[qidx]
    this.setData({
      percent: Math.round((qidx+1)/this.qs.length*100), qidx: qidx,
      qtext: q.t, options: q.o, selVal: this.answers[q.k] || '',
      isLast: false
    })
  },

  next() {
    if (this.data.isLast) {
      wx.showLoading({ title: '生成清单...' })
      var api = require('../../utils/api.js')
      var ans = {}
      var bools = ['has_real_estate','has_commercial_insurance','has_will','has_social_security','has_work_injury','has_rural_house','is_martyr_case']
      for (var i = 0; i < this.qs.length; i++) {
        var k = this.qs[i].k, v = this.answers[k]
        if (bools.indexOf(k) >= 0) v = (v === 'yes')
        ans[k] = v
      }
      var that = this
      api.getGuide(this.pid, app.globalData.selectedCity, ans).then(function(res) {
        app.globalData.guideResult = res
        wx.hideLoading()
        wx.navigateTo({ url: '/pages/timeline/timeline' })
      }).catch(function(e) { wx.hideLoading(); wx.showModal({ title: '请求失败', content: (e&&e.errMsg||'未知错误')+'\nURL: '+require('../../utils/api.js').BASE, showCancel:false }) })
    } else {
      var qidx = this.data.qidx + 1
      var q = this.qs[qidx]
      this.setData({
        percent: Math.round((qidx+1)/this.qs.length*100), qidx: qidx,
        qtext: q.t, options: q.o, selVal: this.answers[q.k] || '',
        isLast: qidx === this.qs.length - 1
      })
    }
  }
})
