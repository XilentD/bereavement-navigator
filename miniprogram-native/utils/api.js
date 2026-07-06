const BASE = 'https://txkpnzzr.express-lprk.ektdecao.3kwdsc3h.com'

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
            // Check if it's a real PDF or text fallback
            const arr = new Uint8Array(res.data)
            const isPdf = arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46 // %PDF
            if (isPdf) {
              const fs = wx.getFileSystemManager()
              const path = wx.env.USER_DATA_PATH + '/checklist.pdf'
              fs.writeFile({ filePath: path, data: res.data, success() { resolve(path) }, fail: reject })
            } else {
              // Text fallback — decode UTF-8 manually since wx doesn't have TextDecoder
              var text = ''
              var i = 0
              while (i < arr.length) {
                var b = arr[i]
                var cp
                if (b < 0x80) { cp = b; i += 1 }
                else if (b < 0xE0) { cp = ((b & 0x1F) << 6) | (arr[i+1] & 0x3F); i += 2 }
                else if (b < 0xF0) { cp = ((b & 0x0F) << 12) | ((arr[i+1] & 0x3F) << 6) | (arr[i+2] & 0x3F); i += 3 }
                else { cp = ((b & 0x07) << 18) | ((arr[i+1] & 0x3F) << 12) | ((arr[i+2] & 0x3F) << 6) | (arr[i+3] & 0x3F); i += 4 }
                text += String.fromCodePoint(cp)
              }
              resolve({ isText: true, text: text })
            }
          } else { reject(res) }
        },
        fail: reject
      })
    })
  },
  submitFeedback(city, persona, msg) { return request('/api/feedback', 'POST', { city, persona, message: msg, time: new Date().toISOString() }) }
}
