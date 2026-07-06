const BASE = 'https://express-lprk-275723-8-1448202195.sh.run.tcloudbase.com'

function request(url, method, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE + url,
      method: method || 'GET',
      data: data || {},
      header: { 'Content-Type': 'application/json' },
      success(res) { resolve(res.data) },
      fail(err) { reject(err) }
    })
  })
}

module.exports = {
  BASE: BASE,
  getPersonas(city) { return request('/api/personas?city=' + (city || 'hangzhou')) },
  getGuide(persona_id, city, answers) { return request('/api/guide', 'POST', { persona_id, city, answers }) },
  getChecklistPdf(persona_id, city, answers) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: BASE + '/api/pdf/checklist',
        method: 'POST',
        data: { persona_id, city, answers },
        responseType: 'arraybuffer',
        success(res) {
          if (res.statusCode === 200) {
            const fs = wx.getFileSystemManager()
            const path = wx.env.USER_DATA_PATH + '/checklist.pdf'
            fs.writeFile({ filePath: path, data: res.data, success() { resolve(path) }, fail: reject })
          } else { reject(res) }
        },
        fail: reject
      })
    })
  },
  submitFeedback(city, persona, msg) { return request('/api/feedback', 'POST', { city, persona, message: msg, time: new Date().toISOString() }) }
}
