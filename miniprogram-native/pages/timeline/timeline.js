const app = getApp()

Page({
  data: {
    guide: null,
    icons: {'24h':'⚠️','3d':'🕯️','7d':'📋','30d':'💰','90d':'🏠','long':'📝'},
    labels: {'24h':'24小时内','3d':'1-3天','7d':'3-7天','30d':'7-30天','90d':'30-90天','long':'长期'},
    completed: {}
  },
  onLoad() {
    var guide = app.globalData.guideResult
    if (guide && guide.summary) {
      this.setData({ guide: guide })
    } else {
      // Retry load from API if globalData is missing
      wx.showLoading({ title: '加载中...' })
      var api = require('../../utils/api.js')
      var that = this
      api.getGuide(app.globalData.selectedPersona, app.globalData.selectedCity, app.globalData.answers || {}).then(function(res) {
        app.globalData.guideResult = res
        that.setData({ guide: res })
        wx.hideLoading()
      }).catch(function() { wx.hideLoading(); wx.showToast({ title: '加载失败', icon: 'none' }) })
    }
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
    wx.showLoading({ title: '生成中...' })
    const api = require('../../utils/api.js')
    api.getChecklistPdf(app.globalData.selectedPersona, app.globalData.selectedCity, app.globalData.answers).then(result => {
      wx.hideLoading()
      if (result.isText) {
        // Text fallback — show in modal
        wx.showModal({ title: '材料清单', content: result.text.slice(0, 2000), showCancel: false, confirmText: '关闭' })
      } else {
        wx.openDocument({ filePath: result, fileType: 'pdf', showMenu: true })
      }
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '生成失败', icon: 'none' })
    })
  },
  goHome() {
    wx.navigateBack({ delta: 10 })
  }
})
