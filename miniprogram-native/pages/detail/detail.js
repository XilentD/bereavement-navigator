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
    api.getChecklistPdf(app.globalData.selectedPersona, app.globalData.selectedCity, app.globalData.answers).then(path => {
      wx.hideLoading()
      wx.openDocument({ filePath: path, fileType: 'pdf', showMenu: true })
    }).catch(() => { wx.hideLoading(); wx.showToast({ title: '生成失败', icon: 'none' }) })
  },
  genLetter() {
    var that = this
    wx.showModal({ title: '代办人信息', editable: true, placeholderText: '请输入代办人姓名', success: function(r1) {
      if (!r1.confirm || !r1.content) return
      var name = r1.content
      wx.showModal({ title: '代办人身份证号', editable: true, placeholderText: '请输入身份证号', success: function(r2) {
        if (!r2.confirm || !r2.content) return
        var id = r2.content
        wx.showModal({ title: '与逝者关系', editable: true, placeholderText: '如：子女、配偶', success: function(r3) {
          if (!r3.confirm || !r3.content) return
          wx.showLoading({ title: '生成中...' })
          wx.request({
            url: require('../../utils/api.js').BASE + '/api/pdf/delegation-letter',
            method: 'POST', responseType: 'arraybuffer',
            data: { principalName: name, principalId: id, agentName: name, agentId: id, relationship: r3.content, deceasedName: '逝者', deceasedId: '', deathDate: '', persona_id: app.globalData.selectedPersona, city: app.globalData.selectedCity, answers: app.globalData.answers },
            success: function(res) {
              wx.hideLoading()
              if (res.statusCode === 200) {
                var fs = wx.getFileSystemManager()
                var path = wx.env.USER_DATA_PATH + '/delegation-letter.pdf'
                fs.writeFile({ filePath: path, data: res.data, success: function() { wx.openDocument({ filePath: path, fileType: 'pdf', showMenu: true }) }, fail: function() { wx.showToast({ title: '保存失败', icon: 'none' }) } })
              } else { wx.showToast({ title: '生成失败', icon: 'none' }) }
            },
            fail: function() { wx.hideLoading(); wx.showToast({ title: '生成失败', icon: 'none' }) }
          })
        }})
      }})
    }})
  },
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
