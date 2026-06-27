const app = getApp()

Page({
  data: { proc: null, completed: false },
  onLoad(options) {
    const guide = app.globalData.guideResult
    if (!guide) return
    // Find procedure by id
    let proc = null
    for (const phase of guide.timeline) {
      const found = phase.procedures.find(p => p.id === options.pid)
      if (found) { proc = found; break }
    }
    if (proc) {
      const completed = wx.getStorageSync('completed') || {}
      this.setData({ proc, completed: !!completed[proc.id] })
    }
  },
  toggleDone() {
    const completed = wx.getStorageSync('completed') || {}
    if (completed[this.data.proc.id]) {
      delete completed[this.data.proc.id]
    } else {
      completed[this.data.proc.id] = true
    }
    wx.setStorageSync('completed', completed)
    this.setData({ completed: !!completed[this.data.proc.id] })
  },
  goBack() { wx.navigateBack() },
  downloadPDF() {
    wx.showLoading({ title: '生成PDF...' })
    const api = require('../../utils/api.js')
    api.getChecklistPdf(app.globalData.selectedPersona, app.globalData.selectedCity, app.globalData.answers).then(() => {
      wx.hideLoading()
      wx.showModal({ title: 'PDF生成', content: '请在Web端下载PDF：http://localhost:3000/preview', showCancel: false })
    }).catch(() => { wx.hideLoading(); wx.showToast({ title: '生成失败', icon: 'none' }) })
  },
  genLetter() { wx.showModal({ title: '授权委托书', content: '此功能需在Web端使用：http://localhost:3000/preview', showCancel: false }) },
  showFeedback() {
    wx.showModal({
      title: '反馈问题',
      editable: true,
      placeholderText: '请描述问题（如：地址错误、电话不通等）',
      success: (res) => {
        if (res.content) {
          const api = require('../../utils/api.js')
          api.submitFeedback(app.globalData.selectedCity, app.globalData.selectedPersona, res.content).then(() => {
            wx.showToast({ title: '感谢反馈！', icon: 'success' })
          })
        }
      }
    })
  }
})
