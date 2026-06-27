const app = getApp()

Page({
  data: {
    city: '',
    personas: [
      {id:'retired-worker', name:'退休企业职工', desc:'参加城镇职工养老保险并已办理退休的企业人员'},
      {id:'active-worker', name:'在职企业职工', desc:'参加城镇职工养老保险的在职职工'},
      {id:'urban-resident', name:'城乡居民(含农民)', desc:'未参加职工养老保险的城乡居民、农民、务农人员'},
      {id:'civil-servant', name:'公务员', desc:'在编公务员、事业单位人员'},
      {id:'military', name:'军人', desc:'现役军人、退役军人、军队离退休人员'}
    ]
  },
  onLoad() {
    this.setData({ city: app.globalData.selectedCity || 'hangzhou' })
  },
  startQuiz(e) {
    const id = e.currentTarget.dataset.id
    app.globalData.selectedPersona = id
    app.globalData.answers = {}
    wx.navigateTo({ url: '/pages/quiz/quiz?pid=' + id })
  }
})
