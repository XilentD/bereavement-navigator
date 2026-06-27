App({
  globalData: {
    apiBase: 'http://localhost:3000',
    selectedCity: 'hangzhou',
    selectedPersona: '',
    answers: {},
    guideResult: null,
    cityLabel: {}
  },
  onLaunch() {
    // Load city labels
    const that = this
    wx.request({
      url: this.globalData.apiBase + '/api/personas',
      success(res) {
        if (res.data && res.data.personas) {
          // Build city list from the API
          const cities = res.data.cities || []
          that.globalData.allCities = cities
        }
      }
    })
  }
})
