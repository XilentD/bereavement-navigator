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
  },
  downloadPDF() {
    wx.showLoading({ title: '生成PDF...' })
    const api = require('../../utils/api.js')
    api.getChecklistPdf(app.globalData.selectedPersona, app.globalData.selectedCity, app.globalData.answers).then(path => {
      wx.hideLoading()
      wx.openDocument({ filePath: path, fileType: 'pdf', showMenu: true })
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '生成失败', icon: 'none' })
    })
  },
  goHome() {
    wx.navigateBack({ delta: 10 })
  }
})
