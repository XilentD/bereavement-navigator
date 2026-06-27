const BASE = 'http://localhost:3000'

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
  getPersonas(city) { return request('/api/personas?city=' + (city || 'hangzhou')) },
  getGuide(persona_id, city, answers) { return request('/api/guide', 'POST', { persona_id, city, answers }) },
  getChecklistPdf(persona_id, city, answers) { return request('/api/pdf/checklist', 'POST', { persona_id, city, answers }) },
  submitFeedback(city, persona, msg) { return request('/api/feedback', 'POST', { city, persona, message: msg, time: new Date().toISOString() }) }
}
