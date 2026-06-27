Page({
  data: { qtext: '这是测试问题', total: 5, options: [{label:'选项A',value:'a'},{label:'选项B',value:'b'}] },
  next() { wx.navigateBack() }
})
