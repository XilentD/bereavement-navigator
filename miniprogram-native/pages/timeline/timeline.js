const app = getApp()

Page({
  data: {
    guide: null,
    icons: {'24h':'⚠️','3d':'🕯️','7d':'📋','30d':'💰','90d':'🏠','long':'📝'},
    labels: {'24h':'24小时内','3d':'1-3天','7d':'3-7天','30d':'7-30天','90d':'30-90天','long':'长期'},
    completed: {}
  },
  onLoad() {
    this.setData({ guide: app.globalData.guideResult })
  },
  onShow() {
    // Refresh completed state
    const completed = wx.getStorageSync('completed') || {}
    this.setData({ completed })
  },
  openDetail(e) {
    const pid = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?pid=' + pid })
  }
})
