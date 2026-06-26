# 丧亲行政事务导航 — 设计文档

> 日期：2026-06-26
> 状态：待评审

## 一、产品概述

亲人离世后，家属不仅要承受巨大悲痛，还要在短期内处理注销户口、社保、银行卡、房产过户、保险理赔等几十项极度繁琐的行政手续。人在悲痛时认知功能下降，根本无力应对。

**"丧亲行政事务导航"** 是一个告诉你"现在该办什么、要带什么"的向导。输入逝者身份、去世地、主要资产类型，系统自动生成按时间线排列的待办清单，精确到具体办事大厅的地址、电话，以及每一站需要携带的证件原件和复印件清单。

### 核心价值主张

- **减轻认知负担**：不需要自己去搜索、整理、记忆
- **防止遗漏**：系统覆盖完整流程，不会漏掉丧葬金、抚恤金等容易忘记的事项
- **代办友好**：一键生成授权委托书 PDF，亲属可凭委托书代办

---

## 二、目标用户

### Persona 1：中年子女代办

- **姓名**：张女士，42 岁，杭州某公司行政主管
- **场景**：父亲（退休工人）在医院病逝，张女士是独生女，需要独自处理所有后续手续
- **痛点**：不知道办什么事、去哪办、带什么材料，请了一周假但大部分时间浪费在跑错窗口、漏带材料上
- **技术熟练度**：会微信、会看 PDF，但不会用复杂工具

### Persona 2：老年配偶

- **姓名**：李阿姨，68 岁，退休教师
- **场景**：丈夫突然离世，子女在外地，短期内无法赶回
- **痛点**：悲痛中认知能力严重下降，记不住流程，看不懂官方文件的术语
- **技术熟练度**：会用微信基本功能，字要大

---

## 三、整体架构

```
┌─────────────────────────────────────────────────┐
│                  用户端                           │
│  ┌──────────────┐  ┌───────────────────────────┐ │
│  │ 微信小程序     │  │ Web 轻量页面              │ │
│  │ (uni-app/Vue3) │  │ (PDF预览/分享/委托书下载)  │ │
│  └──────┬───────┘  └────────────┬──────────────┘ │
└─────────┼───────────────────────┼────────────────┘
          │  REST API              │
┌─────────┴───────────────────────┴────────────────┐
│                 API 层 (Node.js + Fastify)         │
│  /api/guide    匹配流程 & 生成清单                 │
│  /api/pdf      生成 PDF (委托书/材料清单)          │
│  /api/admin    数据管理 (未来)                     │
└────────┬───────────────────────┬──────────────────┘
         │                       │
┌────────┴──────────┐  ┌────────┴──────────────────┐
│  YAML 流程配置     │  │  SQLite (better-sqlite3)   │
│  (Git 版本管理)    │  │  用户会话 / PDF缓存        │
│  procedures/      │  └────────────────────────────┘
│  ├─ retired/      │
│  ├─ active/       │
│  ├─ resident/     │
│  ├─ civil/        │
│  └─ military/     │
└───────────────────┘
```

### 技术选型

| 层 | 选择 | 理由 |
|-----|------|------|
| 小程序框架 | uni-app (Vue3) | 一份代码可编译到微信/支付宝小程序，未来扩展 |
| API 框架 | Fastify | 轻量、快、TypeScript 原生支持 |
| 模板引擎 | EJS + Puppeteer | PDF 委托书生成 |
| 数据存储 | better-sqlite3 | 同步 API、零配置、单文件、无运维负担 |
| 流程配置 | YAML + JSON Schema | 可读、可校验、Git diff 友好、非技术人员可学 |
| 部署 | 阿里云/腾讯云 1 台 ECS | 单城市 MVP 服务端需求极低 |

---

## 四、数据模型

### 设计原则

- 每个逝者身份类型一个独立 YAML 文件，方便独立编辑和审查
- 流程按时间窗口自然分组（24h / 3 天 / 7 天 / 30 天 / 90 天 / 长期）
- 条件分支用 `when` 字段表达（有无房产、有无商业保险、是否异地死亡等）
- 每个办事项精确到「带什么原件、带几份复印件」

### YAML Schema

```yaml
persona:
  id: string           # 唯一标识，如 retired_worker
  name: string         # 显示名称，如"退休企业职工"
  description: string  # 适用条件说明
  assumptions:         # 默认假设列表
    - string

timeline:
  - phase: string      # 时间窗口标识: 24h | 3d | 7d | 30d | 90d | long
    title: string      # 显示标题
    procedures:
      - id: string              # 唯一标识
        name: string            # 事项名称
        urgency: critical|high|normal
        where:
          type: fixed|depends   # fixed: 固定网点 / depends: 依情况
          # type=fixed 时：
          name: string
          address: string
          phone: string
          # type=depends 时：
          branches:
            - when: string      # 条件值
              name: string
              address: string?  # 可选（如"接诊医院"地址不固定）
              phone: string?
        need:
          originals: [string]   # 需要携带的原件列表
          copies:               # 需要准备的复印件列表
            - doc: string
              count: number
        output: string          # 办完后会得到的文件
        notes: string           # 补充说明
        when:                   # 条件过滤（可选）
          key: any              # 如 has_real_estate: true
```

### 示例：退休企业职工

```yaml
persona:
  id: retired_worker
  name: 退休企业职工
  description: 在杭州市参加城镇职工养老保险并办理退休的企业退休人员
  assumptions:
    - 逝者在杭州缴纳社保满15年
    - 逝者有配偶或一名成年子女可代办

timeline:
  - phase: 24h
    title: 立即办理（24小时内）
    procedures:
      - id: death_cert
        name: 开具《死亡医学证明》
        urgency: critical
        where:
          type: depends
          branches:
            - when: at_home
              name: 社区卫生服务中心
            - when: at_hospital
              name: 接诊医院
            - when: accident
              name: 公安派出所 + 120急救中心
        need:
          originals: [逝者身份证, 代办人身份证]
          copies: []
        output: 死亡医学证明（三联单）
        notes: 如为意外死亡需先报警，公安出具《非正常死亡证明》后医院才可开具

      - id: funeral_home
        name: 联系殡仪馆
        urgency: critical
        where:
          type: fixed
          name: 杭州市殡仪馆
          address: 杭州市西湖区西溪路731号
          phone: "0571-85220000"
        need:
          originals: [死亡医学证明, 逝者身份证, 代办人身份证]
          copies: [{doc: 死亡医学证明, count: 2}]
        output: 火化预约确认单

  - phase: 7d
    title: 户籍注销（3-7天内）
    procedures:
      - id: hukou_cancel
        name: 注销户口
        urgency: high
        where:
          type: fixed
          name: 逝者户籍所在地派出所
          note: 需提前电话确认办公时间
        need:
          originals: [死亡医学证明, 火化证明, 逝者户口本, 逝者身份证, 代办人身份证]
          copies:
            - {doc: 死亡医学证明, count: 2}
            - {doc: 火化证明, count: 2}
            - {doc: 代办人身份证, count: 1}
        output: 户口注销证明
        notes: 户口注销后身份证会被收回，建议提前复印多份备用
```

---

## 五、API 设计

### 路由

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/personas` | 返回所有身份类型列表 |
| POST | `/api/guide` | 根据用户输入生成待办清单 |
| POST | `/api/pdf/delegation-letter` | 生成《代办授权委托书》PDF |
| POST | `/api/pdf/checklist` | 生成《材料准备清单》PDF |
| GET | `/api/venue/:id` | 查询办事网点详情 |

### 核心接口：POST /api/guide

**入参：**
```json
{
  "persona_id": "retired_worker",
  "city": "hangzhou",
  "answers": {
    "death_location": "at_hospital",
    "has_real_estate": true,
    "has_commercial_insurance": false,
    "has_will": false,
    "has_social_security": true
  }
}
```

**出参：**
```json
{
  "persona": { "name": "退休企业职工", "assumptions": ["..."] },
  "timeline": [
    {
      "phase": "24h",
      "title": "立即办理",
      "procedures": [
        {
          "id": "death_cert",
          "name": "开具《死亡医学证明》",
          "urgency": "critical",
          "status": "pending",
          "where": { "type": "depends", "resolved": "接诊医院" },
          "need": {
            "originals": ["逝者身份证", "代办人身份证"],
            "copies": []
          },
          "output": "死亡医学证明（三联单）",
          "notes": "..."
        }
      ]
    }
  ],
  "summary": {
    "total_procedures": 18,
    "critical_count": 3,
    "high_count": 5,
    "estimated_days_min": 90
  }
}
```

### 组件职责

| 组件 | 路径 | 职责 |
|------|------|------|
| ConfigLoader | `src/config/loader.ts` | 加载 YAML → Schema 校验 → 内存缓存 |
| GuideEngine | `src/engine/guide.ts` | 根据 persona_id + answers 匹配流程、解析分支、过滤不适用的 procedure |
| PDFGenerator | `src/pdf/generator.ts` | Puppeteer 渲染 EJS 模板 → PDF Buffer |
| VenueService | `src/services/venue.ts` | 管理办事网点数据 |

### 分支解析逻辑

1. 加载 persona 对应的 YAML 配置
2. 遍历所有 timeline → procedures
3. 对每个 procedure：
   - 如果 `where.type === "depends"`，根据 answers 中对应字段解析具体 branch
   - 如果 `procedure.when` 存在，根据 answers 判断是否保留此 procedure
4. 按 timeline 原始顺序输出，标记总数和紧急度统计

---

## 六、用户流程

### 小程序端核心路径

```
首页引导 → 身份确认 → 逐题问答(5-8题) → 时间线清单 → 事项详情
                                              ├→ 生成PDF委托书
                                              ├→ 分享清单给亲属
                                              └→ 标记已完成事项
```

### 页面说明

**① 首页 — 情感化引导（1 屏）**
- 共情文案 + 一个按钮「开始办理」
- 素色背景、大字号、无广告、无其他入口
- 丧亲场景不适宜任何商业气息

**② 身份确认（1 屏）**
- 卡片式选择逝者身份类型
- 每张卡片写清楚适用条件

**③ 情况问答（5-8 题）**
- 每次只显示一个选择题，减少认知负担
- 底部显示进度条
- 根据身份类型动态出题

**④ 时间线清单（核心页面）**
- 按时间窗口分组（24h / 1-3 天 / 3-7 天 / ...）
- 每项可展开查看详情
- 支持勾选已完成，进度持久化到 localStorage
- 已完成事项折叠到底部，可随时展开撤销

**⑤ 事项详情**
- 办事地址、电话、所需材料清单（原件+复印件）、输出文件
- 底部按钮：生成授权委托书 / 标记为已完成
- 底部固定文案：「以上信息仅供参考，建议办理前致电确认」
- 反馈入口：「信息有误？」

**⑥ 委托书生成**
- 填写代办人信息 → 服务端渲染 PDF → 预览 → 下载/转发

### Web 端页面

| 页面 | 用途 |
|------|------|
| `/s/:shareId` | 分享链接预览（只读清单，无需登录） |
| `/pdf/:type/:id` | PDF 在线预览和下载 |

---

## 七、错误处理与边界情况

### 数据层防御

- API 启动时校验所有 YAML → 必填字段缺失 → **拒绝启动**，输出具体错误信息
- `where.type: fixed` 必须有 address 和 phone
- `where.type: depends` 每个 branch 必须可解析
- `need.originals` 数组不能为空

### 运行时容错

| 场景 | 策略 |
|------|------|
| 身份类型无匹配 YAML | 返回「该类型正在建设中」+ 推荐最接近的已支持类型 |
| when 条件未覆盖的 answer | 按最保守路径处理（显示），日志告警 |
| 网点地址/电话缺失 | 展示「建议致电 12345 市民热线查询」 |
| PDF 生成超时 | 降级为纯文本清单 |
| API 不可用 | 小程序展示上次缓存数据 + 错误提示 |

### 用户输入保护

| 场景 | 策略 |
|------|------|
| 中途退出 | localStorage 缓存 answers，下次打开提示「继续上次？」 |
| 误标记已完成 | 已完成事项可随时展开并撤销 |
| 多人代办 | 分享链接中的清单是只读快照 |

### 数据准确性保障

- 每条数据标注 `last_verified` 字段，超过 90 天未核验返回 `stale_warning: true`
- 清单底部固定提示文案
- 每个事项详情页底部有「信息有误？」反馈入口 → 收集修正建议 → Git Issue

### 隐私保护

- 逝者信息仅用于匹配流程，不存储到服务端
- PDF 服务端缓存 24 小时后自动删除
- 分享链接 7 天后过期
- 不接入任何第三方统计/埋点 SDK

---

## 八、测试策略

### 测试金字塔

```
E2E:       10% — 核心用户路径
集成测试:  40% — YAML 配置 + API 场景组合
单元测试:  50% — GuideEngine / PDF / 校验逻辑
```

### 各层重点

**单元测试**
- GuideEngine: 所有 answer 组合下的 branch 解析和 when 过滤正确性
- ConfigLoader: 非法 YAML 抛错、必填字段缺失抛错
- PDFGenerator: 委托书模板字段替换正确、排版不截断
- Schema Validator: 每个 persona YAML 通过校验

**集成测试**
- 每种 persona × 典型 answer 组合 → 返回正确数量的 procedure
- 所有 5 种身份 × POST /api/guide → 200，返回结构符合 JSON Schema
- PDF 生成返回有效文件

**E2E**
- 首页 → 选择身份 → 答题 → 查看清单 → 查看详情（全流程无报错）
- 生成委托书 PDF → 预览内容正确
- 标记完成 → 退出 → 重新进入 → 状态保持

**数据 CI 校验**
```bash
npm run validate:data   # 所有 YAML Schema + 电话格式 + 地址完整性
npm run test:data       # 每个 identity × answer 组合至少命中 1 个 procedure
npm run test:coverage   # 所有 procedure 至少被一种 answer 组合覆盖
```

---

## 九、MVP 范围

### 必做

- 5 种逝者身份类型（退休职工、在职职工、城乡居民、公务员、军人）
- 杭州 1 城
- 每类身份覆盖核心事项（户籍注销、社保、火化、殡葬、丧葬金、房产、银行存款），边缘事项标注"建设中"
- 小程序核心 5 页面 + Web 分享/PDF 页面
- 授权委托书 PDF 生成
- 分享链接（只读清单）
- 反馈入口

### 不做（MVP 后）

- Web 管理后台（MVP 直接编辑 YAML）
- 多城市支持
- 用户系统/登录
- 微信支付/收费
- 消息推送/提醒
- 语音输入
- 一键代办对接

### 预估时间（独立开发者）

| 阶段 | 预估 |
|------|------|
| YAML Schema + 5 份流程数据录入 | 2 周 |
| API 开发 | 2 周 |
| 小程序 5 页面 | 1.5 周 |
| Web 分享 + PDF 预览 | 0.5 周 |
| 测试 + 数据校正 | 1 周 |
| **合计** | **约 7 周** |

---

## 十、项目结构

```
bereavement-navigator/
├── data/                      # 流程配置（Git 管理核心）
│   ├── schema.yaml           # JSON Schema 定义
│   └── procedures/
│       ├── retired-worker.yaml
│       ├── active-worker.yaml
│       ├── urban-resident.yaml
│       ├── civil-servant.yaml
│       └── military.yaml
├── api/                       # Node.js + Fastify
│   ├── src/
│   │   ├── config/loader.ts
│   │   ├── engine/guide.ts
│   │   ├── pdf/generator.ts
│   │   ├── services/venue.ts
│   │   └── routes/
│   │       ├── guide.ts
│   │       ├── pdf.ts
│   │       └── venue.ts
│   ├── tests/
│   └── package.json
├── miniprogram/               # uni-app / Vue3
│   ├── pages/
│   │   ├── index/            # 首页
│   │   ├── persona/          # 身份选择
│   │   ├── quiz/             # 逐题问答
│   │   ├── timeline/         # 时间线清单
│   │   └── detail/           # 事项详情
│   ├── components/
│   └── utils/
├── web/                       # Web 分享 + PDF 预览
│   ├── pages/
│   │   ├── share/[id].html
│   │   └── pdf/[type]/[id].html
│   └── public/
└── docs/
    └── superpowers/specs/
        └── 2026-06-26-bereavement-navigator-design.md
```

---

## 十一、需求汇总

| 维度 | 决定 |
|------|------|
| 产品形态 | 微信小程序 + Web 轻量端 |
| 架构 | YAML 配置驱动 + SQLite + Fastify |
| MVP 城市 | 杭州 |
| MVP 身份类型 | 5 类（退休职工/在职职工/城乡居民/公务员/军人） |
| 数据策略 | 公开数据 + AI 整理 + 人工校验 |
| 盈利模式 | MVP 免费，后续再定 |
| MVP 交付 | 约 7 周 |
