const app = getApp()
const CITY_LABELS = require('../../utils/city-labels.js')

Page({
  data: { query: '', cities: [], filtered: [], labels: CITY_LABELS, hot: ['beijing','shanghai','guangzhou','shenzhen','chengdu','hangzhou','wuhan','chongqing','nanjing','tianjin'] },
  onLoad() {
    this.setData({ cities: Object.keys(CITY_LABELS) })
  },
  onSearch(e) {
    const q = e.detail.value.toLowerCase().trim()
    const filtered = q ? this.data.cities.filter(c => c.includes(q)) : []
    this.setData({ query: q, filtered })
  },
  pickCity(e) {
    const city = e.currentTarget.dataset.city
    app.globalData.selectedCity = city
    wx.navigateTo({ url: '/pages/persona/persona' })
  }
})
