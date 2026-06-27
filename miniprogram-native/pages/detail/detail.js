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
  goBack() { wx.navigateBack() }
})
