你是一个政府办事信息提取器。请从以下 北京（beijing）政府网站抓取内容中提取关键信息。

## 需要提取的信息

### 1. 办事机构 (venues)
对每个机构提取：
- type: funeral_home（殡仪馆）/ social_insurance（社保中心）/ notary（公证处）/ property_center（不动产登记中心）/ veterans_affairs（退役军人事务局）
- name: 机构全称
- address: 详细地址
- phone: 联系电话
- bizHours: 办公时间（如有）
- confidence: high（明确写出）/ medium（推断）/ low（不确定）

### 2. 丧葬补助标准 (allowances)
对每项补助提取：
- personaType: retired_worker / active_worker / urban_resident / civil_servant / military
- name: 补助项目名称
- amountRange: 金额范围（如 "7000-14000元"）
- conditions: 申领条件
- confidence: high / medium / low

## 抓取内容

(无有效内容 — 所有 URL 均抓取失败或内容为空)

## 输出格式

请严格按以下 JSON 格式输出（不要包含其他文字）：

```json
{
  "venues": [
    {
      "city": "beijing",
      "type": "funeral_home",
      "name": "...",
      "address": "...",
      "phone": "...",
      "bizHours": "...",
      "sourceUrl": "...",
      "confidence": "high"
    }
  ],
  "allowances": [
    {
      "city": "beijing",
      "personaType": "retired_worker",
      "name": "...",
      "amountRange": "...",
      "conditions": "...",
      "sourceUrl": "...",
      "confidence": "medium"
    }
  ]
}
```

如果某个类别完全没有信息，返回空数组 []。