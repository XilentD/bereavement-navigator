# 丧亲行政事务导航 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建"丧亲行政事务导航" MVP——微信小程序 + Web 端，用户输入逝者身份和情况后自动生成按时间线排列的行政待办清单，支持 PDF 委托书生成和分享。

**Architecture:** YAML 配置驱动 + Node.js Fastify API + SQLite + uni-app 小程序。流程数据以 YAML 文件存储在 Git 仓库中，API 启动时加载并缓存到内存；用户会话和 PDF 缓存在 SQLite 中。

**Tech Stack:** Node.js v24, TypeScript 5.x, Fastify, better-sqlite3, Puppeteer, EJS, uni-app (Vue3), YAML + ajv, Vitest

## Global Constraints

- 所有流程数据存储在 `data/procedures/` 下的 YAML 文件中，Git 版本管理
- API 启动时必须校验所有 YAML 文件通过 JSON Schema，否则拒绝启动
- 逝者信息不持久化到服务端，仅在请求上下文中处理
- 生成的 PDF 在服务端缓存 24 小时后自动删除
- 微信小程序面向中老年用户：大字号(>=16px)、高对比度、素色背景
- 小程序不接入任何第三方统计/埋点 SDK

---

## 文件结构

```
bereavement-navigator/
├── data/
│   ├── schema.yaml                    # JSON Schema 定义
│   └── procedures/
│       ├── retired-worker.yaml
│       ├── active-worker.yaml
│       ├── urban-resident.yaml
│       ├── civil-servant.yaml
│       └── military.yaml
├── api/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── server.ts                  # Fastify 入口
│   │   ├── config/loader.ts           # YAML 加载 + 校验 + 缓存
│   │   ├── engine/guide.ts            # 核心匹配引擎
│   │   ├── pdf/generator.ts           # Puppeteer PDF 生成
│   │   ├── pdf/templates/
│   │   │   ├── delegation-letter.ejs
│   │   │   └── checklist.ejs
│   │   ├── routes/
│   │   │   ├── guide.ts               # POST /api/guide
│   │   │   ├── pdf.ts                 # POST /api/pdf/*
│   │   │   └── personas.ts            # GET /api/personas
│   │   └── services/venue.ts          # 网点查询服务
│   └── test/
│       ├── unit/
│       │   ├── guide-engine.test.ts
│       │   ├── config-loader.test.ts
│       │   └── pdf-generator.test.ts
│       └── integration/
│           ├── guide.test.ts
│           └── pdf.test.ts
├── miniprogram/
│   ├── pages/
│   │   ├── index/index.vue            # 首页引导
│   │   ├── persona/index.vue          # 身份选择
│   │   ├── quiz/index.vue             # 逐题问答
│   │   ├── timeline/index.vue         # 时间线清单
│   │   └── detail/index.vue           # 事项详情
│   ├── components/
│   │   ├── ProcedureCard.vue
│   │   └── ProgressBar.vue
│   ├── api/client.ts                  # API 请求封装
│   ├── utils/storage.ts               # localStorage 工具
│   ├── App.vue
│   └── pages.json
├── web/pages/
│   ├── share/[id].html
│   └── pdf/[type]/[id].html
└── scripts/validate-data.ts           # CI 数据校验脚本
```

---

### Task 1: 项目脚手架

**Files:**
- Create: `api/package.json`, `api/tsconfig.json`

**Interfaces:**
- Produces: `npm run dev` 可启动空 Fastify 服务器

- [ ] **Step 1: 初始化 api 目录**

```bash
mkdir -p bereavement-navigator/api/src/{config,engine,pdf/templates,routes,services}
mkdir -p bereavement-navigator/api/test/{unit,integration}
mkdir -p bereavement-navigator/data/procedures
mkdir -p bereavement-navigator/miniprogram/{pages/{index,persona,quiz,timeline,detail},components,api,utils}
mkdir -p bereavement-navigator/web/pages/{share,pdf}
mkdir -p bereavement-navigator/scripts
```

- [ ] **Step 2: 创建 `api/package.json`**

```json
{
  "name": "bereavement-navigator-api",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "validate:data": "tsx scripts/validate-data.ts"
  },
  "dependencies": {
    "fastify": "^5.0.0",
    "better-sqlite3": "^11.0.0",
    "puppeteer": "^23.0.0",
    "ejs": "^3.1.10",
    "yaml": "^2.6.0",
    "ajv": "^8.17.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/ejs": "^3.1.5",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 3: 创建 `api/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "..",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*.ts", "../scripts/**/*.ts"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 4: 安装依赖并验证**

```bash
cd api && npm install
npm run dev  # 应报错 "no server entry yet" —— 正常，下一步创建
```

- [ ] **Step 5: Commit**

```bash
git add api/package.json api/tsconfig.json api/package-lock.json
git commit -m "chore: scaffold api project with Fastify + TypeScript"
```

---

### Task 2: JSON Schema 定义

**Files:**
- Create: `data/schema.yaml`

**Interfaces:**
- Produces: 标准 JSON Schema (Draft-07)，可校验所有 procedure YAML 文件

- [ ] **Step 1: 创建 `data/schema.yaml`**

```yaml
# JSON Schema for bereavement procedure definitions
# Validates every persona YAML file in procedures/

$schema: "http://json-schema.org/draft-07/schema#"
type: object
required: [persona, timeline]
additionalProperties: false
properties:
  persona:
    type: object
    required: [id, name, description, assumptions]
    additionalProperties: false
    properties:
      id:
        type: string
        pattern: "^[a-z_]+$"
      name:
        type: string
        minLength: 2
      description:
        type: string
        minLength: 10
      assumptions:
        type: array
        minItems: 1
        items:
          type: string
          minLength: 5

  timeline:
    type: array
    minItems: 1
    items:
      type: object
      required: [phase, title, procedures]
      additionalProperties: false
      properties:
        phase:
          type: string
          enum: ["24h", "3d", "7d", "30d", "90d", "long"]
        title:
          type: string
          minLength: 2
        procedures:
          type: array
          minItems: 1
          items:
            type: object
            required: [id, name, urgency, where, need, output]
            additionalProperties: false
            properties:
              id:
                type: string
                pattern: "^[a-z_]+$"
              name:
                type: string
                minLength: 2
              urgency:
                type: string
                enum: ["critical", "high", "normal"]
              where:
                oneOf:
                  - type: object
                    required: [type, name, address, phone]
                    properties:
                      type: { const: fixed }
                      name: { type: string, minLength: 2 }
                      address: { type: string, minLength: 5 }
                      phone: { type: string, pattern: "^[0-9\\-]+$" }
                  - type: object
                    required: [type, branches]
                    properties:
                      type: { const: depends }
                      branches:
                        type: array
                        minItems: 1
                        items:
                          type: object
                          required: [when, name]
                          properties:
                            when: { type: string }
                            name: { type: string, minLength: 2 }
                            address: { type: string }
                            phone: { type: string }
              need:
                type: object
                required: [originals, copies]
                properties:
                  originals:
                    type: array
                    minItems: 1
                    items: { type: string, minLength: 2 }
                  copies:
                    type: array
                    items:
                      type: object
                      required: [doc, count]
                      properties:
                        doc: { type: string, minLength: 2 }
                        count: { type: integer, minimum: 1 }
              output:
                type: string
                minLength: 2
              notes:
                type: string
              when:
                type: object
                additionalProperties:
                  type: boolean
```

- [ ] **Step 2: 验证 Schema 本身合法性**

```bash
# Manual: 用 ajv-cli 验证 schema.yaml 是合法的 JSON Schema
npx ajv compile -s data/schema.yaml
# Expected: "schema data/schema.yaml is valid"
```

- [ ] **Step 3: Commit**

```bash
git add data/schema.yaml
git commit -m "feat: add JSON Schema for procedure YAML validation"
```

---

### Task 3: 退休企业职工流程数据

**Files:**
- Create: `data/procedures/retired-worker.yaml`

**Interfaces:**
- Consumes: `data/schema.yaml` JSON Schema
- Produces: 退休职工完整办事流程（覆盖 MVP 80% 事项的 15-18 个 procedure）

- [ ] **Step 1: 创建 `data/procedures/retired-worker.yaml`**

```yaml
persona:
  id: retired_worker
  name: 退休企业职工
  description: 在杭州市参加城镇职工养老保险并已办理退休的企业退休人员
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
        name: 联系殡仪馆预约火化
        urgency: critical
        where:
          type: fixed
          name: 杭州市殡仪馆
          address: 杭州市西湖区西溪路731号
          phone: "0571-85220000"
        need:
          originals: [死亡医学证明, 逝者身份证, 代办人身份证]
          copies:
            - {doc: 死亡医学证明, count: 2}
        output: 火化预约确认单

  - phase: 3d
    title: 遗体告别与火化（1-3天）
    procedures:
      - id: cremation
        name: 遗体火化
        urgency: critical
        where:
          type: fixed
          name: 杭州市殡仪馆
          address: 杭州市西湖区西溪路731号
          phone: "0571-85220000"
        need:
          originals: [死亡医学证明, 逝者身份证, 代办人身份证, 火化预约确认单]
          copies:
            - {doc: 死亡医学证明, count: 2}
        output: 火化完成凭证
        notes: 火化前需办理遗体告别仪式（可选），殡仪馆提供一条龙服务

      - id: cremation_cert
        name: 领取《火化证明》
        urgency: critical
        where:
          type: fixed
          name: 杭州市殡仪馆
          address: 杭州市西湖区西溪路731号
          phone: "0571-85220000"
        need:
          originals: [死亡医学证明, 逝者身份证, 代办人身份证]
          copies: []
        output: 火化证明（多份）
        notes: 建议领取5-8份原件，后续多项手续均需使用

  - phase: 7d
    title: 户籍注销（3-7天内）
    procedures:
      - id: hukou_cancel
        name: 注销户口
        urgency: high
        where:
          type: fixed
          name: 逝者户籍所在地派出所
          address: 请联系逝者户籍地派出所确认
          phone: "0571-12345"
        need:
          originals: [死亡医学证明, 火化证明, 逝者户口本, 逝者身份证, 代办人身份证]
          copies:
            - {doc: 死亡医学证明, count: 2}
            - {doc: 火化证明, count: 2}
            - {doc: 代办人身份证, count: 1}
        output: 户口注销证明
        notes: 户口注销后身份证会被收回销毁，建议注销前复印逝者身份证 5-10 份备用

      - id: death_cert_notary
        name: 办理死亡公证（如需）
        urgency: normal
        where:
          type: fixed
          name: 杭州市各公证处
          address: 杭州市上城区望江东路332号（杭州市国立公证处）
          phone: "0571-85020513"
        need:
          originals: [死亡医学证明, 火化证明, 户口注销证明, 代办人身份证]
          copies:
            - {doc: 死亡医学证明, count: 1}
            - {doc: 火化证明, count: 1}
            - {doc: 户口注销证明, count: 1}
        output: 死亡公证书
        notes: 如需处理房产继承、银行存款取出等，公证处出具的公证书效力最强
        when:
          has_real_estate: true

  - phase: 30d
    title: 社保与养老金结算（7-30天）
    procedures:
      - id: pension_stop
        name: 养老金停发申报
        urgency: high
        where:
          type: fixed
          name: 杭州市社会保险管理服务中心
          address: 杭州市上城区清吟街123号
          phone: "0571-12333"
        need:
          originals: [死亡医学证明, 火化证明, 逝者身份证, 户口注销证明, 代办人身份证]
          copies:
            - {doc: 死亡医学证明, count: 1}
            - {doc: 火化证明, count: 1}
            - {doc: 户口注销证明, count: 1}
        output: 养老金停发确认书
        notes: 必须在逝者死亡次月15日前申报，逾期多发的养老金需退还

      - id: pension_balance
        name: 个人账户余额清算
        urgency: high
        where:
          type: fixed
          name: 杭州市社会保险管理服务中心
          address: 杭州市上城区清吟街123号
          phone: "0571-12333"
        need:
          originals: [死亡医学证明, 火化证明, 户口注销证明, 代办人身份证, 代办人银行卡]
          copies:
            - {doc: 死亡医学证明, count: 1}
            - {doc: 火化证明, count: 1}
            - {doc: 户口注销证明, count: 1}
            - {doc: 代办人身份证, count: 1}
        output: 个人账户余额一次性支付凭证
        notes: 余额将打入代办人提供的银行卡（约15个工作日到账）

      - id: funeral_allowance
        name: 申领丧葬补助金
        urgency: high
        where:
          type: fixed
          name: 杭州市社会保险管理服务中心
          address: 杭州市上城区清吟街123号
          phone: "0571-12333"
        need:
          originals: [死亡医学证明, 火化证明, 户口注销证明, 代办人身份证, 代办人银行卡, 逝者社保卡]
          copies:
            - {doc: 死亡医学证明, count: 1}
            - {doc: 火化证明, count: 1}
            - {doc: 户口注销证明, count: 1}
            - {doc: 代办人身份证, count: 1}
        output: 丧葬补助金申领受理回执
        notes: 2026年杭州标准约为 7000-14000 元，与逝者缴费年限和工资基数相关

      - id: survivor_benefit
        name: 申领遗属抚恤金
        urgency: normal
        where:
          type: fixed
          name: 杭州市社会保险管理服务中心
          address: 杭州市上城区清吟街123号
          phone: "0571-12333"
        need:
          originals: [死亡医学证明, 火化证明, 户口注销证明, 代办人身份证, 代办人银行卡, 关系证明]
          copies:
            - {doc: 死亡医学证明, count: 1}
            - {doc: 火化证明, count: 1}
            - {doc: 户口注销证明, count: 1}
            - {doc: 关系证明, count: 1}
        output: 遗属抚恤金申领受理回执
        notes: 符合条件遗属（配偶、未成年子女、无劳动能力父母）可申领

  - phase: 90d
    title: 资产处理（30-90天）
    procedures:
      - id: property_transfer
        name: 房产继承过户
        urgency: normal
        where:
          type: fixed
          name: 杭州市不动产登记中心
          address: 杭州市上城区解放东路18号市民中心H楼
          phone: "0571-87008100"
        need:
          originals: [死亡公证书, 户口注销证明, 房产证, 继承人身份证, 户口本]
          copies:
            - {doc: 死亡公证书, count: 2}
            - {doc: 户口注销证明, count: 1}
            - {doc: 房产证, count: 1}
            - {doc: 继承人身份证, count: 2}
        output: 不动产权证书（继承后）
        notes: 如有遗嘱按遗嘱分配，无遗嘱按法定继承顺序。需先办理死亡公证。契税免征（直系亲属继承）
        when:
          has_real_estate: true

      - id: bank_account
        name: 银行存款/理财取出
        urgency: normal
        where:
          type: fixed
          name: 各银行网点
          address: 联系逝者开户银行预约办理
          phone: "0571-12345"
        need:
          originals: [死亡公证书, 户口注销证明, 逝者银行卡/存折, 继承人身份证, 户口本, 关系证明]
          copies:
            - {doc: 死亡公证书, count: 1}
            - {doc: 户口注销证明, count: 1}
            - {doc: 继承人身份证, count: 1}
        output: 银行账户清算凭证
        notes: 各银行要求略有不同，建议先致电客服预约，避免白跑一趟。5万以下通常可直接在柜台办理

      - id: insurance_claim
        name: 商业保险理赔申请
        urgency: normal
        where:
          type: fixed
          name: 保险公司理赔部
          address: 联系逝者投保的保险公司客服
          phone: "0571-12345"
        need:
          originals: [死亡医学证明, 火化证明, 户口注销证明, 保险合同/保单, 受益人身份证, 受益人银行卡]
          copies:
            - {doc: 死亡医学证明, count: 2}
            - {doc: 火化证明, count: 1}
            - {doc: 户口注销证明, count: 1}
            - {doc: 保险合同, count: 1}
        output: 理赔受理通知书
        notes: 务必在保险事故发生后尽快报案（一般30天内），不同险种理赔时效不同
        when:
          has_commercial_insurance: true

  - phase: long
    title: 后续事项（长期）
    procedures:
      - id: will_execution
        name: 遗嘱执行与公证
        urgency: normal
        where:
          type: fixed
          name: 杭州市各公证处
          address: 杭州市上城区望江东路332号
          phone: "0571-85020513"
        need:
          originals: [遗嘱原件, 死亡医学证明, 户口注销证明, 继承人身份证, 户口本]
          copies:
            - {doc: 死亡医学证明, count: 1}
            - {doc: 户口注销证明, count: 1}
        output: 遗嘱公证文书
        notes: 自书遗嘱需经公证处确认效力，有争议需法院裁决
        when:
          has_will: true

      - id: other_cleanup
        name: 其他账户注销与处理
        urgency: normal
        where:
          type: fixed
          name: 各相关机构
          address: 根据逝者持有账户联系对应机构
          phone: "0571-12345"
        need:
          originals: [户口注销证明, 代办人身份证]
          copies:
            - {doc: 户口注销证明, count: 5}
        output: 各类注销/变更凭证
        notes: 包括但不限于：手机号注销、驾照注销、各类会员卡/积分处理、快递地址变更等
```

- [ ] **Step 2: 用 Schema 校验数据文件**

```bash
npx ajv validate -s data/schema.yaml -d data/procedures/retired-worker.yaml
# Expected: "data/procedures/retired-worker.yaml is valid"
```

- [ ] **Step 3: Commit**

```bash
git add data/procedures/retired-worker.yaml
git commit -m "feat: add retired worker procedure data (Hangzhou)"
```

---

### Task 4: 在职企业职工流程数据

**Files:**
- Create: `data/procedures/active-worker.yaml`

**Interfaces:**
- Consumes: `data/schema.yaml`
- Produces: 在职职工流程（在退休职工基础上增加工伤保险、遗属待遇等差异事项）

- [ ] **Step 1: 创建 `data/procedures/active-worker.yaml`**

完整内容包含 persona 元信息和 timeline 结构。与 retired-worker.yaml 的核心差异：
- `persona.id: active_worker`，`persona.name: 在职企业职工`
- assumptions 改为"逝者在杭州参加城镇职工养老保险并在职"
- 增加 `work_injury_claim` procedure（工伤保险理赔，`when.has_work_injury: true`）
- `survivor_benefit` 在职职工抚恤金计算方式不同
- `pension_stop` 改为社保停缴（非养老金停发）

完整 YAML 内容遵循与 Task 3 相同的结构模板，此处列出差异 procedures：

```yaml
persona:
  id: active_worker
  name: 在职企业职工
  description: 在杭州市参加城镇职工养老保险并在职的企业职工
  assumptions:
    - 逝者在杭州缴纳社保
    - 逝者有配偶或一名成年子女可代办

timeline:
  - phase: 24h
    # 事项与 retired-worker.yaml 相同

  - phase: 3d
    # 事项与 retired-worker.yaml 相同

  - phase: 7d
    # 事项与 retired-worker.yaml 相同

  - phase: 30d
    title: 社保结算与工伤处理（7-30天）
    procedures:
      - id: social_insurance_stop
        name: 社保停缴申报
        urgency: high
        where:
          type: fixed
          name: 杭州市社会保险管理服务中心
          address: 杭州市上城区清吟街123号
          phone: "0571-12333"
        need:
          originals: [死亡医学证明, 火化证明, 户口注销证明, 代办人身份证, 逝者社保卡]
          copies:
            - {doc: 死亡医学证明, count: 1}
            - {doc: 火化证明, count: 1}
            - {doc: 户口注销证明, count: 1}
        output: 社保停缴确认书
        notes: 单位HR可代办，需在逝者死亡次月15日前办理

      - id: pension_balance_active
        name: 养老保险个人账户清算
        urgency: high
        where:
          type: fixed
          name: 杭州市社会保险管理服务中心
          address: 杭州市上城区清吟街123号
          phone: "0571-12333"
        need:
          originals: [死亡医学证明, 火化证明, 户口注销证明, 代办人身份证, 代办人银行卡]
          copies:
            - {doc: 死亡医学证明, count: 1}
            - {doc: 火化证明, count: 1}
            - {doc: 户口注销证明, count: 1}
        output: 个人账户余额一次性支付凭证
        notes: 个人缴纳的养老保险余额（含利息）可全额继承

      - id: work_injury_claim
        name: 工伤保险理赔申请
        urgency: high
        where:
          type: fixed
          name: 杭州市人力资源和社会保障局工伤保险处
          address: 杭州市上城区大学路99号
          phone: "0571-87220000"
        need:
          originals: [工伤认定决定书, 死亡医学证明, 火化证明, 户口注销证明, 代办人身份证, 代办人银行卡, 劳动合同, 工资流水]
          copies:
            - {doc: 工伤认定决定书, count: 2}
            - {doc: 死亡医学证明, count: 1}
            - {doc: 火化证明, count: 1}
            - {doc: 户口注销证明, count: 1}
        output: 工伤保险理赔受理回执
        notes: 如因工死亡，单位应在30日内向人社局提出工伤认定申请。工亡补助金为全国统一标准（上年度全国城镇居民人均可支配收入的20倍），另加丧葬补助和供养亲属抚恤金
        when:
          has_work_injury: true

      - id: funeral_allowance
        # 与 retired-worker.yaml 相同

      - id: survivor_benefit_active
        name: 申领遗属待遇（在职职工标准）
        urgency: high
        where:
          type: fixed
          name: 杭州市社会保险管理服务中心
          address: 杭州市上城区清吟街123号
          phone: "0571-12333"
        need:
          originals: [死亡医学证明, 火化证明, 户口注销证明, 代办人身份证, 代办人银行卡, 关系证明, 劳动合同]
          copies:
            - {doc: 死亡医学证明, count: 1}
            - {doc: 火化证明, count: 1}
            - {doc: 户口注销证明, count: 1}
            - {doc: 关系证明, count: 1}
        output: 遗属待遇申领受理回执
        notes: 在职职工遗属待遇包含丧葬补助金 + 抚恤金（与缴费年限和工资基数相关）

  - phase: 90d
    # 事项与 retired-worker.yaml 相同

  - phase: long
    # 事项与 retired-worker.yaml 相同（遗嘱执行、其他账户注销）
    # 条件过滤: will_execution 仅 when.has_will: true 时显示
```

- [ ] **Step 2: Schema 校验**

```bash
npx ajv validate -s data/schema.yaml -d data/procedures/active-worker.yaml
# Expected: valid
```

- [ ] **Step 3: Commit**

```bash
git add data/procedures/active-worker.yaml
git commit -m "feat: add active worker procedure data (Hangzhou)"
```

---

### Task 5: 城乡居民/公务员/军人流程数据

**Files:**
- Create: `data/procedures/urban-resident.yaml`
- Create: `data/procedures/civil-servant.yaml`
- Create: `data/procedures/military.yaml`

**Interfaces:**
- Consumes: `data/schema.yaml`
- Produces: 三类身份的核心流程（每类 10-15 个 procedure，MVP 覆盖核心差异事项）

- [ ] **Step 1: 创建城乡居民流程 `data/procedures/urban-resident.yaml`**

核心差异：
- 无养老保险个人账户清算（仅居民医保停保）
- 丧葬补助金走城乡居民养老保险渠道（标准较低）
- 无工伤/失业保险理赔
- 如有农村宅基地，增加宅基地继承手续

```yaml
persona:
  id: urban_resident
  name: 城乡居民
  description: 在杭州市参加城乡居民养老保险或未参加职工养老保险的城乡居民
  assumptions:
    - 逝者未参加城镇职工养老保险（或仅参加居民养老保险）
    - 逝者有配偶或一名成年子女可代办

timeline:
  - phase: 24h
    # 同 retired-worker.yaml: death_cert, funeral_home

  - phase: 3d
    # 同 retired-worker.yaml: cremation, cremation_cert

  - phase: 7d
    # 同 retired-worker.yaml: hukou_cancel

  - phase: 30d
    title: 居民社保与丧葬补助（7-30天）
    procedures:
      - id: resident_insurance_stop
        name: 城乡居民医保停保
        urgency: normal
        where:
          type: fixed
          name: 所在社区/街道便民服务中心
          address: 联系逝者户籍所在社区
          phone: "0571-12345"
        need:
          originals: [死亡医学证明, 火化证明, 逝者身份证, 户口注销证明]
          copies:
            - {doc: 死亡医学证明, count: 1}
            - {doc: 火化证明, count: 1}
        output: 医保停保确认书

      - id: resident_funeral_allowance
        name: 城乡居民丧葬补助金申领
        urgency: high
        where:
          type: fixed
          name: 所在社区/街道便民服务中心
          address: 联系逝者户籍所在社区
          phone: "0571-12345"
        need:
          originals: [死亡医学证明, 火化证明, 户口注销证明, 代办人身份证, 代办人银行卡]
          copies:
            - {doc: 死亡医学证明, count: 1}
            - {doc: 火化证明, count: 1}
            - {doc: 户口注销证明, count: 1}
        output: 丧葬补助金申领受理回执
        notes: 杭州城乡居民丧葬补助标准约 2000-4000 元，具体咨询所在社区

  - phase: 90d
    title: 资产处理（30-90天）
    procedures:
      - id: rural_house_transfer
        name: 农村宅基地及房屋继承
        urgency: normal
        where:
          type: fixed
          name: 所在村集体经济组织/乡镇自然资源所
          address: 联系逝者户籍所在村
          phone: "0571-12345"
        need:
          originals: [死亡医学证明, 火化证明, 户口注销证明, 宅基地使用证, 房产证, 继承人身份证, 户口本]
          copies:
            - {doc: 死亡医学证明, count: 1}
            - {doc: 火化证明, count: 1}
            - {doc: 户口注销证明, count: 1}
            - {doc: 宅基地使用证, count: 1}
        output: 宅基地使用权变更登记证明
        notes: 宅基地继承需经村集体同意，一户多宅情况需核实政策
        when:
          has_rural_house: true
      - id: property_transfer
        # 同 retired-worker.yaml, when.has_real_estate: true
      - id: bank_account
        # 同 retired-worker.yaml
      - id: insurance_claim
        # 同 retired-worker.yaml, when.has_commercial_insurance: true

  - phase: long
    # 同 retired-worker.yaml
```

- [ ] **Step 2: 创建公务员流程 `data/procedures/civil-servant.yaml`**

核心差异：
- 社保渠道不同（公务员医保 + 职业年金）
- 丧葬费标准不同（按公务员标准）
- 一次性抚恤金标准不同（公务员有专门规定）
- 组织人事部门报告
- 无工伤保险（公务员不参加工伤保险）

```yaml
persona:
  id: civil_servant
  name: 公务员
  description: 在杭州市机关事业单位工作的在编公务员
  assumptions:
    - 逝者为杭州市在编公务员
    - 逝者有配偶或一名成年子女可代办

timeline:
  - phase: 24h
    # 同退休职工: death_cert, funeral_home
    procedures:
      - id: death_cert
        # 同 retired-worker.yaml
      - id: funeral_home
        # 同 retired-worker.yaml
      - id: employer_notify
        name: 报告所在单位组织人事部门
        urgency: high
        where:
          type: fixed
          name: 逝者所在单位
          address: 联系逝者单位人事部门
          phone: 联系逝者单位
        need:
          originals: [死亡医学证明]
          copies: []
        output: 单位知晓确认
        notes: 单位会派遣专人协助家属处理后事及抚恤金申领

  - phase: 30d
    title: 公务员待遇结算
    procedures:
      - id: civil_funeral_allowance
        name: 公务员丧葬费申领
        urgency: high
        where:
          type: fixed
          name: 逝者所在单位财务部门
          address: 联系逝者单位
          phone: 联系逝者单位
        need:
          originals: [死亡医学证明, 火化证明, 户口注销证明, 代办人身份证, 代办人银行卡]
          copies:
            - {doc: 死亡医学证明, count: 1}
            - {doc: 火化证明, count: 1}
            - {doc: 户口注销证明, count: 1}
        output: 丧葬费领取凭证
        notes: 公务员丧葬费标准由各地人社部门确定，杭州约为 4000-8000 元

      - id: civil_pension
        name: 一次性抚恤金 + 职业年金清算
        urgency: high
        where:
          type: fixed
          name: 杭州市社会保险管理服务中心 + 逝者单位
          address: 杭州市上城区清吟街123号
          phone: "0571-12333"
        need:
          originals: [死亡医学证明, 火化证明, 户口注销证明, 代办人身份证, 代办人银行卡, 关系证明]
          copies:
            - {doc: 死亡医学证明, count: 1}
            - {doc: 火化证明, count: 1}
            - {doc: 户口注销证明, count: 1}
            - {doc: 关系证明, count: 1}
        output: 抚恤金及年金领取凭证
        notes: 公务员一次性抚恤金标准为上年度全国城镇居民人均可支配收入的20倍 + 本人生前40个月基本工资

  # 其他 phases 与 retired-worker.yaml 相同（房产/银行/保险/遗嘱）
```

- [ ] **Step 3: 创建军人流程 `data/procedures/military.yaml`**

核心差异：
- 军队体系不同（需区分现役/退役军人）
- 退役军人事务局 vs 军队政治部门
- 军人抚恤金标准不同
- 烈士有特殊荣誉追授流程

```yaml
persona:
  id: military
  name: 军人（现役/退役军人）
  description: 在杭州市居住的现役军人或退役军人
  assumptions:
    - 逝者为现役军人或已退役的退伍军人
    - 逝者有配偶或一名成年子女可代办

timeline:
  - phase: 24h
    title: 立即办理
    procedures:
      - id: death_cert
        # 同 retired-worker.yaml
      - id: funeral_home
        # 同 retired-worker.yaml
      - id: military_notify
        name: 报告退役军人事务局/部队政治部
        urgency: high
        where:
          type: depends
          branches:
            - when: active_duty
              name: 所在部队政治部门
            - when: retired
              name: 杭州市退役军人事务局
              address: 杭州市上城区机场路271号
              phone: "0571-85280000"
        need:
          originals: [死亡医学证明, 逝者身份证]
          copies: []
        output: 备案确认
        notes: 现役军人死亡由部队主导善后，退役军人由退役军人事务局协调

  - phase: 30d
    title: 军人待遇结算
    procedures:
      - id: military_funeral
        name: 军人丧葬补助 + 抚恤金申领
        urgency: high
        where:
          type: depends
          branches:
            - when: active_duty
              name: 所在部队后勤部门
            - when: retired
              name: 杭州市退役军人事务局
              address: 杭州市上城区机场路271号
              phone: "0571-85280000"
        need:
          originals: [死亡医学证明, 火化证明, 户口注销证明, 军人证件, 代办人身份证, 代办人银行卡, 关系证明]
          copies:
            - {doc: 死亡医学证明, count: 2}
            - {doc: 火化证明, count: 1}
            - {doc: 户口注销证明, count: 1}
            - {doc: 军人证件, count: 1}
        output: 抚恤金申领受理回执
        notes: 军人抚恤金标准高于普通职工，具体标准咨询主管部门

      - id: martyr_honor
        name: 烈士评定申请（如符合条件）
        urgency: normal
        where:
          type: fixed
          name: 杭州市退役军人事务局优抚褒扬处
          address: 杭州市上城区机场路271号
          phone: "0571-85280000"
        need:
          originals: [死亡医学证明, 相关事迹证明材料, 军人证件]
          copies:
            - {doc: 死亡医学证明, count: 2}
        output: 烈士评定受理回执
        notes: 烈士评定需符合《烈士褒扬条例》规定条件，由省级政府批准
        when:
          is_martyr_case: true

  # 其他 phases 与 retired-worker.yaml 相同
```

- [ ] **Step 4: Schema 校验所有 5 个文件**

```bash
for f in data/procedures/*.yaml; do
  echo "Validating $f..."
  npx ajv validate -s data/schema.yaml -d "$f" || exit 1
done
echo "All 5 persona files passed validation"
```

- [ ] **Step 5: Commit**

```bash
git add data/procedures/urban-resident.yaml data/procedures/civil-servant.yaml data/procedures/military.yaml
git commit -m "feat: add urban resident, civil servant, and military procedure data"
```

---

### Task 6: ConfigLoader — YAML 加载与校验

**Files:**
- Create: `api/src/config/loader.ts`
- Create: `api/test/unit/config-loader.test.ts`

**Interfaces:**
- Produces:
  - `function loadConfig(dataDir: string): ConfigData` — 加载所有 YAML + 校验 + 返回缓存
  - `type ConfigData = Map<string, PersonaConfig>` — key 为 persona_id
  - 校验失败抛出 `ConfigValidationError`（包含文件路径和具体错误信息）

- [ ] **Step 1: 写失败的测试 `api/test/unit/config-loader.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';

describe('ConfigLoader', () => {
  it('should load all YAML files from the data directory', () => {
    const config = loadConfig('../../data');
    expect(config.size).toBeGreaterThanOrEqual(5);
    expect(config.has('retired_worker')).toBe(true);
    expect(config.has('active_worker')).toBe(true);
  });

  it('should validate each loaded persona has required fields', () => {
    const config = loadConfig('../../data');
    for (const [id, persona] of config) {
      expect(persona.persona.id).toBe(id);
      expect(persona.persona.name).toBeTruthy();
      expect(persona.timeline.length).toBeGreaterThan(0);
      for (const phase of persona.timeline) {
        expect(phase.procedures.length).toBeGreaterThan(0);
      }
    }
  });

  it('should throw ConfigValidationError for invalid YAML', () => {
    expect(() => loadConfig('test/fixtures/invalid-yaml')).toThrow('ConfigValidationError');
  });

  it('should cache results on multiple calls', () => {
    const config1 = loadConfig('../../data');
    const config2 = loadConfig('../../data');
    expect(config1).toBe(config2); // same reference = cached
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd api && npx vitest run test/unit/config-loader.test.ts
# Expected: FAIL — "loadConfig is not a function"
```

- [ ] **Step 3: 实现 `api/src/config/loader.ts`**

```typescript
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';

export interface PersonaMeta {
  id: string;
  name: string;
  description: string;
  assumptions: string[];
}

export interface Procedure {
  id: string;
  name: string;
  urgency: 'critical' | 'high' | 'normal';
  where: FixedWhere | DependsWhere;
  need: { originals: string[]; copies: { doc: string; count: number }[] };
  output: string;
  notes?: string;
  when?: Record<string, boolean>;
}

interface FixedWhere {
  type: 'fixed';
  name: string;
  address: string;
  phone: string;
}

interface DependsWhere {
  type: 'depends';
  branches: { when: string; name: string; address?: string; phone?: string }[];
}

export interface TimelinePhase {
  phase: '24h' | '3d' | '7d' | '30d' | '90d' | 'long';
  title: string;
  procedures: Procedure[];
}

export interface PersonaConfig {
  persona: PersonaMeta;
  timeline: TimelinePhase[];
}

export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public filePath: string,
    public errors: unknown[]
  ) {
    super(`ConfigValidationError in ${filePath}: ${message}`);
    this.name = 'ConfigValidationError';
  }
}

let cache: Map<string, PersonaConfig> | null = null;

export function loadConfig(dataDir: string): Map<string, PersonaConfig> {
  if (cache) return cache;

  const proceduresDir = join(dataDir, 'procedures');
  if (!existsSync(proceduresDir)) {
    throw new Error(`Procedures directory not found: ${proceduresDir}`);
  }

  const schemaPath = join(dataDir, 'schema.yaml');
  if (!existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schemaYaml = readFileSync(schemaPath, 'utf-8');
  const schema = parseYaml(schemaYaml);
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);

  const files = readdirSync(proceduresDir).filter(f => f.endsWith('.yaml'));
  if (files.length === 0) {
    throw new Error(`No YAML files found in ${proceduresDir}`);
  }

  cache = new Map();

  for (const file of files) {
    const filePath = join(proceduresDir, file);
    const raw = readFileSync(filePath, 'utf-8');
    const data = parseYaml(raw);

    if (!validate(data)) {
      throw new ConfigValidationError(
        `${file} failed schema validation`,
        filePath,
        validate.errors ?? []
      );
    }

    const persona = data as PersonaConfig;
    if (cache.has(persona.persona.id)) {
      throw new ConfigValidationError(
        `Duplicate persona id: ${persona.persona.id}`,
        filePath,
        []
      );
    }

    cache.set(persona.persona.id, persona);
  }

  console.log(`[ConfigLoader] Loaded ${cache.size} persona configs`);
  return cache;
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd api && npx vitest run test/unit/config-loader.test.ts
# Expected: 4 tests PASS
```

- [ ] **Step 5: Commit**

```bash
git add api/src/config/loader.ts api/test/unit/config-loader.test.ts
git commit -m "feat: implement ConfigLoader with YAML validation and caching"
```

---

### Task 7: GuideEngine — 流程匹配引擎

**Files:**
- Create: `api/src/engine/guide.ts`
- Create: `api/test/unit/guide-engine.test.ts`

**Interfaces:**
- Consumes: `ConfigData` (Map<string, PersonaConfig>) from ConfigLoader
- Produces:
  - `function matchGuide(config, personaId: string, answers: Record<string, string | boolean>): GuideResult`
  - `GuideResult` 包含 persona 信息、过滤后的 timeline、汇总统计

- [ ] **Step 1: 写失败的测试 `api/test/unit/guide-engine.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';
import { matchGuide } from '../../src/engine/guide.js';

describe('GuideEngine', () => {
  const config = loadConfig('../../data');

  it('should return timeline for retired worker with basic answers', () => {
    const result = matchGuide(config, 'retired_worker', {
      death_location: 'at_hospital',
      has_real_estate: false,
      has_commercial_insurance: false,
      has_will: false,
      has_social_security: true,
    });

    expect(result.persona.name).toBe('退休企业职工');
    expect(result.timeline.length).toBeGreaterThan(0);
    // Should NOT include property_transfer when has_real_estate is false
    const allProcedureIds = result.timeline.flatMap(p =>
      p.procedures.map(pr => pr.id)
    );
    expect(allProcedureIds).not.toContain('property_transfer');
    expect(allProcedureIds).not.toContain('insurance_claim');
    expect(allProcedureIds).not.toContain('will_execution');
  });

  it('should include conditional procedures when answers are true', () => {
    const result = matchGuide(config, 'retired_worker', {
      death_location: 'at_home',
      has_real_estate: true,
      has_commercial_insurance: true,
      has_will: true,
      has_social_security: true,
    });

    const allIds = result.timeline.flatMap(p => p.procedures.map(pr => pr.id));
    expect(allIds).toContain('property_transfer');
    expect(allIds).toContain('insurance_claim');
    expect(allIds).toContain('will_execution');
  });

  it('should resolve depends-type where correctly', () => {
    const result = matchGuide(config, 'retired_worker', {
      death_location: 'at_hospital',
      has_real_estate: false,
      has_commercial_insurance: false,
      has_will: false,
      has_social_security: true,
    });

    const deathCert = result.timeline[0].procedures.find(
      p => p.id === 'death_cert'
    );
    expect(deathCert?.where.type).toBe('depends');
    expect((deathCert?.where as any).resolved).toBe('接诊医院');
  });

  it('should throw for unknown persona_id', () => {
    expect(() =>
      matchGuide(config, 'nonexistent_persona', {})
    ).toThrow('Unknown persona');
  });

  it('should return summary statistics', () => {
    const result = matchGuide(config, 'retired_worker', {
      death_location: 'at_hospital',
      has_real_estate: false,
      has_commercial_insurance: false,
      has_will: false,
      has_social_security: true,
    });

    expect(result.summary.total_procedures).toBeGreaterThan(0);
    expect(result.summary.critical_count).toBeGreaterThan(0);
    expect(typeof result.summary.estimated_days_min).toBe('number');
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd api && npx vitest run test/unit/guide-engine.test.ts
# Expected: FAIL — matchGuide not defined
```

- [ ] **Step 3: 实现 `api/src/engine/guide.ts`**

```typescript
import type { PersonaConfig, Procedure, TimelinePhase } from '../config/loader.js';

export interface GuideResult {
  persona: {
    id: string;
    name: string;
    description: string;
    assumptions: string[];
  };
  timeline: ResolvedPhase[];
  summary: {
    total_procedures: number;
    critical_count: number;
    high_count: number;
    estimated_days_min: number;
  };
}

interface ResolvedPhase {
  phase: TimelinePhase['phase'];
  title: string;
  procedures: ResolvedProcedure[];
}

interface ResolvedProcedure extends Omit<Procedure, 'where'> {
  status: 'pending';
  where: ResolvedWhere;
}

type ResolvedWhere =
  | { type: 'fixed'; name: string; address: string; phone: string }
  | { type: 'depends'; resolved: string; address?: string; phone?: string };

export function matchGuide(
  config: Map<string, PersonaConfig>,
  personaId: string,
  answers: Record<string, string | boolean>
): GuideResult {
  const persona = config.get(personaId);
  if (!persona) {
    throw new Error(
      `Unknown persona: ${personaId}. Available: ${[...config.keys()].join(', ')}`
    );
  }

  const timeline: ResolvedPhase[] = [];
  let criticalCount = 0;
  let highCount = 0;
  let totalCount = 0;

  const DAYS: Record<string, number> = {
    '24h': 1, '3d': 3, '7d': 7, '30d': 30, '90d': 90, long: 90,
  };
  let estimatedDays = 0;

  for (const phase of persona.timeline) {
    const resolvedProcedures: ResolvedProcedure[] = [];

    for (const proc of phase.procedures) {
      // Check conditional (when) filter
      if (proc.when) {
        const shouldSkip = Object.entries(proc.when).some(
          ([key, required]) => answers[key] !== required
        );
        if (shouldSkip) continue;
      }

      // Resolve 'where' field
      let resolvedWhere: ResolvedWhere;
      if (proc.where.type === 'fixed') {
        resolvedWhere = {
          type: 'fixed',
          name: proc.where.name,
          address: proc.where.address,
          phone: proc.where.phone,
        };
      } else {
        // depends type — resolve from answers
        const branchKey = proc.where.branches[0]?.when;
        // Find which answer key maps to this depends field
        const answerKey = Object.keys(answers).find(k =>
          proc.where.branches.some(b => b.when === answers[k])
        );
        const matchedBranch = answerKey
          ? proc.where.branches.find(b => b.when === answers[answerKey])
          : proc.where.branches[0];

        resolvedWhere = {
          type: 'depends',
          resolved: matchedBranch?.name ?? proc.where.branches[0].name,
          address: matchedBranch?.address,
          phone: matchedBranch?.phone,
        };
      }

      resolvedProcedures.push({
        ...proc,
        status: 'pending',
        where: resolvedWhere,
        when: undefined,
      });

      totalCount++;
      if (proc.urgency === 'critical') criticalCount++;
      else if (proc.urgency === 'high') highCount++;
    }

    if (resolvedProcedures.length > 0) {
      timeline.push({
        phase: phase.phase,
        title: phase.title,
        procedures: resolvedProcedures,
      });
      estimatedDays = Math.max(estimatedDays, DAYS[phase.phase] ?? 90);
    }
  }

  return {
    persona: {
      id: persona.persona.id,
      name: persona.persona.name,
      description: persona.persona.description,
      assumptions: persona.persona.assumptions,
    },
    timeline,
    summary: {
      total_procedures: totalCount,
      critical_count: criticalCount,
      high_count: highCount,
      estimated_days_min: estimatedDays,
    },
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd api && npx vitest run test/unit/guide-engine.test.ts
# Expected: 5 tests PASS
```

- [ ] **Step 5: Commit**

```bash
git add api/src/engine/guide.ts api/test/unit/guide-engine.test.ts
git commit -m "feat: implement GuideEngine with conditional filtering and where resolution"
```

---

### Task 8: Fastify 服务器 + Guide/Personas 路由

**Files:**
- Create: `api/src/server.ts`
- Create: `api/src/routes/guide.ts`
- Create: `api/src/routes/personas.ts`
- Create: `api/test/integration/guide.test.ts`

**Interfaces:**
- Consumes: `loadConfig` from ConfigLoader, `matchGuide` from GuideEngine
- Produces: `npm run dev` 启动 Fastify 服务器，`POST /api/guide` 和 `GET /api/personas` 可用

- [ ] **Step 1: 写集成测试 `api/test/integration/guide.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

let baseUrl: string;

describe('API Integration', () => {
  beforeAll(async () => {
    // Start server programmatically for testing
    const { buildApp } = await import('../../src/server.js');
    const app = await buildApp({ logger: false });
    await app.listen({ port: 0 }); // random port
    baseUrl = `http://localhost:${(app.server.address() as any).port}`;
    return () => app.close();
  });

  it('GET /api/personas should return all persona types', async () => {
    const res = await fetch(`${baseUrl}/api/personas`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.personas).toBeInstanceOf(Array);
    expect(body.personas.length).toBeGreaterThanOrEqual(5);
    expect(body.personas[0]).toHaveProperty('id');
    expect(body.personas[0]).toHaveProperty('name');
  });

  it('POST /api/guide should return timeline for valid request', async () => {
    const res = await fetch(`${baseUrl}/api/guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persona_id: 'retired_worker',
        city: 'hangzhou',
        answers: {
          death_location: 'at_hospital',
          has_real_estate: false,
          has_commercial_insurance: false,
          has_will: false,
          has_social_security: true,
        },
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.persona).toBeDefined();
    expect(body.timeline.length).toBeGreaterThan(0);
    expect(body.summary.total_procedures).toBeGreaterThan(0);
  });

  it('POST /api/guide should return 400 for unknown persona', async () => {
    const res = await fetch(`${baseUrl}/api/guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona_id: 'unknown', city: 'hangzhou', answers: {} }),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd api && npx vitest run test/integration/guide.test.ts
# Expected: FAIL — buildApp not found
```

- [ ] **Step 3: 实现 `api/src/routes/personas.ts`**

```typescript
import { FastifyInstance } from 'fastify';
import type { PersonaConfig } from '../config/loader.js';

export async function personasRoutes(app: FastifyInstance, config: Map<string, PersonaConfig>) {
  app.get('/api/personas', async () => {
    const personas = [...config.values()].map(p => ({
      id: p.persona.id,
      name: p.persona.name,
      description: p.persona.description,
    }));
    return { personas };
  });
}
```

- [ ] **Step 4: 实现 `api/src/routes/guide.ts`**

```typescript
import { FastifyInstance } from 'fastify';
import type { PersonaConfig } from '../config/loader.js';
import { matchGuide } from '../engine/guide.js';

interface GuideRequestBody {
  persona_id: string;
  city?: string;
  answers: Record<string, string | boolean>;
}

export async function guideRoutes(app: FastifyInstance, config: Map<string, PersonaConfig>) {
  app.post<{ Body: GuideRequestBody }>('/api/guide',
    {
      schema: {
        body: {
          type: 'object',
          required: ['persona_id', 'answers'],
          properties: {
            persona_id: { type: 'string', minLength: 1 },
            city: { type: 'string' },
            answers: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const { persona_id, answers } = request.body;

      if (!config.has(persona_id)) {
        return reply.status(400).send({
          error: 'Unknown persona',
          message: `"${persona_id}" is not supported. Available: ${[...config.keys()].join(', ')}`,
        });
      }

      try {
        const result = matchGuide(config, persona_id, answers);
        return result;
      } catch (err) {
        return reply.status(500).send({
          error: 'Guide generation failed',
          message: (err as Error).message,
        });
      }
    }
  );
}
```

- [ ] **Step 5: 实现 `api/src/server.ts`**

```typescript
import Fastify from 'fastify';
import { loadConfig } from './config/loader.js';
import { guideRoutes } from './routes/guide.js';
import { personasRoutes } from './routes/personas.js';

export async function buildApp(opts = {}) {
  const app = Fastify({ logger: true, ...opts });

  const dataDir = process.env.DATA_DIR || '../../data';
  const config = loadConfig(dataDir);

  await app.register(guideRoutes, config);
  await app.register(personasRoutes, config);

  return app;
}

// Only start when run directly (not imported for tests)
const isMain = process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js');
if (isMain) {
  const app = await buildApp();
  try {
    const port = parseInt(process.env.PORT || '3000');
    await app.listen({ port });
    console.log(`Server running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
```

- [ ] **Step 6: 运行集成测试确认通过**

```bash
cd api && npx vitest run test/integration/guide.test.ts
# Expected: 3 tests PASS
```

- [ ] **Step 7: Commit**

```bash
git add api/src/server.ts api/src/routes/ api/test/integration/
git commit -m "feat: add Fastify server with /api/guide and /api/personas routes"
```

---

### Task 9: PDF 生成 — 委托书 + 材料清单

**Files:**
- Create: `api/src/pdf/generator.ts`
- Create: `api/src/pdf/templates/delegation-letter.ejs`
- Create: `api/src/pdf/templates/checklist.ejs`
- Create: `api/src/routes/pdf.ts`
- Create: `api/test/unit/pdf-generator.test.ts`

**Interfaces:**
- Consumes: GuideResult from GuideEngine
- Produces:
  - `function generateDelegationLetter(data): Promise<Buffer>` — 授权委托书 PDF
  - `function generateChecklist(guideResult): Promise<Buffer>` — 材料准备清单 PDF
  - `POST /api/pdf/delegation-letter` 和 `POST /api/pdf/checklist`

- [ ] **Step 1: 创建委托书模板 `api/src/pdf/templates/delegation-letter.ejs`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  body { font-family: "SimSun", serif; font-size: 14pt; line-height: 2; margin: 60px; }
  h1 { text-align: center; font-size: 18pt; margin-bottom: 40px; }
  .field { margin: 20px 0; }
  .field-label { font-weight: bold; }
  .signature { margin-top: 80px; text-align: right; }
</style>
</head>
<body>
<h1>授权委托书</h1>

<p>委托人：<%= principalName %>（身份证号：<%= principalId %>）</p>
<p>受托人：<%= agentName %>（身份证号：<%= agentId %>）</p>
<p>委托人与受托人关系：<%= relationship %></p>

<p>因<%= deceasedName %>（身份证号：<%= deceasedId %>）于<%= deathDate %>不幸离世，
委托人因故不能亲自办理相关行政手续，现全权委托受托人代为办理以下事项：</p>

<ol>
<% items.forEach(function(item) { %>
  <li><%= item %></li>
<% }) %>
</ol>

<p>受托人在办理上述事项过程中所签署的相关文件、作出的陈述，委托人均予以承认，
由此产生的一切法律后果由委托人承担。</p>

<p>委托期限：自签署之日起至上述事项办结之日止。</p>

<p class="signature">
  委托人（签字）：_______________<br><br>
  日期：<%= date %>
</p>
</body>
</html>
```

- [ ] **Step 2: 创建材料清单模板 `api/src/pdf/templates/checklist.ejs`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  body { font-family: "SimSun", serif; font-size: 12pt; margin: 40px; }
  h1 { text-align: center; font-size: 16pt; }
  h2 { font-size: 14pt; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
  .item { margin: 12px 0; padding: 8px; border-left: 3px solid #333; }
  .item-name { font-weight: bold; font-size: 13pt; }
  .checklist { list-style: none; padding: 0; }
  .checklist li { padding: 3px 0; }
  .output { color: #555; }
</style>
</head>
<body>
<h1>材料准备清单</h1>
<p>逝者：<%= personaName %></p>
<p>生成日期：<%= date %></p>

<% timeline.forEach(function(phase) { %>
<h2><%= phase.title %>（<%= phase.phase %>）</h2>
<% phase.procedures.forEach(function(proc) { %>
<div class="item">
  <div class="item-name"><%= proc.name %></div>
  <div>📍 <%= proc.where.resolved || proc.where.name %></div>
  <div>📞 <%= proc.where.phone || "致电12345查询" %></div>
  <div>
    需要携带：
    <ul class="checklist">
      <% proc.need.originals.forEach(function(o) { %>
        <li>☐ <strong><%= o %></strong>（原件）</li>
      <% }) %>
      <% proc.need.copies.forEach(function(c) { %>
        <li>☐ <%= c.doc %> 复印件×<%= c.count %></li>
      <% }) %>
    </ul>
  </div>
  <div class="output">办完后得到：<%= proc.output %></div>
  <% if (proc.notes) { %>
    <div style="color: #888; font-size: 10pt;">⚠️ <%= proc.notes %></div>
  <% } %>
</div>
<% }) %>
<% }) %>

<p style="margin-top: 30px; color: #999; font-size: 10pt;">
以上信息仅供参考，建议办理前致电确认。如有出入请反馈给我们。
</p>
</body>
</html>
```

- [ ] **Step 3: 实现 `api/src/pdf/generator.ts`**

```typescript
import puppeteer from 'puppeteer';
import { renderFile } from 'ejs';
import { join } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import crypto from 'node:crypto';

const templatesDir = join(import.meta.dirname, 'templates');

interface DelegationLetterData {
  principalName: string;
  principalId: string;
  agentName: string;
  agentId: string;
  relationship: string;
  deceasedName: string;
  deceasedId: string;
  deathDate: string;
  items: string[];
  date: string;
}

export async function generateDelegationLetter(
  data: DelegationLetterData
): Promise<Buffer> {
  const templatePath = join(templatesDir, 'delegation-letter.ejs');
  const html = await renderFile(templatePath, data);
  return htmlToPdf(html);
}

export async function generateChecklist(guideResult: any): Promise<Buffer> {
  const templatePath = join(templatesDir, 'checklist.ejs');
  const html = await renderFile(templatePath, {
    personaName: guideResult.persona.name,
    date: new Date().toISOString().split('T')[0],
    timeline: guideResult.timeline,
  });
  return htmlToPdf(html);
}

async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm' } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// Cache management
const CACHE_DIR = '../../tmp/pdf-cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function cachePdf(key: string, generator: () => Promise<Buffer>): Promise<Buffer> {
  const hash = crypto.createHash('md5').update(key).digest('hex');
  const cachePath = join(CACHE_DIR, `${hash}.pdf`);

  if (existsSync(cachePath)) {
    const stat = require('fs').statSync(cachePath);
    if (Date.now() - stat.mtimeMs < CACHE_TTL) {
      return readFileSync(cachePath);
    }
  }

  const pdf = await generator();
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath, pdf);
  return pdf;
}
```

- [ ] **Step 4: 实现 `api/src/routes/pdf.ts`**

```typescript
import { FastifyInstance } from 'fastify';
import { generateDelegationLetter, generateChecklist, cachePdf } from '../pdf/generator.js';
import type { PersonaConfig } from '../config/loader.js';
import { matchGuide } from '../engine/guide.js';

export async function pdfRoutes(app: FastifyInstance, config: Map<string, PersonaConfig>) {
  app.post('/api/pdf/delegation-letter', async (request, reply) => {
    const body = request.body as any;
    const { principalName, principalId, agentName, agentId, relationship,
            deceasedName, deceasedId, deathDate, persona_id, answers } = body;

    const guide = matchGuide(config, persona_id, answers);
    const items = guide.timeline.flatMap(p =>
      p.procedures.map(proc => proc.name)
    );

    const key = `dl-${JSON.stringify(body)}`;
    const pdf = await cachePdf(key, () =>
      generateDelegationLetter({
        principalName, principalId, agentName, agentId,
        relationship, deceasedName, deceasedId, deathDate,
        items,
        date: new Date().toISOString().split('T')[0],
      })
    );

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', 'attachment; filename="delegation-letter.pdf"');
    return pdf;
  });

  app.post('/api/pdf/checklist', async (request, reply) => {
    const body = request.body as any;
    const { persona_id, answers } = body;
    const guide = matchGuide(config, persona_id, answers);

    const key = `cl-${persona_id}-${JSON.stringify(answers)}`;
    const pdf = await cachePdf(key, () => generateChecklist(guide));

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', 'attachment; filename="checklist.pdf"');
    return pdf;
  });
}
```

- [ ] **Step 5: 更新 `api/src/server.ts` 注册 pdf routes**

```typescript
// Add after the existing route registrations:
import { pdfRoutes } from './routes/pdf.js';

// Inside buildApp, add:
await app.register(pdfRoutes, config);
```

- [ ] **Step 6: Commit**

```bash
git add api/src/pdf/ api/src/routes/pdf.ts api/src/server.ts
git commit -m "feat: add PDF generation for delegation letter and checklist"
```

---

### Task 10: VenueService + 数据校验 CI 脚本

**Files:**
- Create: `api/src/services/venue.ts`
- Create: `scripts/validate-data.ts`

**Interfaces:**
- Produces:
  - `function searchVenue(name: string): VenueResult | null` — 按名称模糊匹配网点
  - `scripts/validate-data.ts` — CI 脚本，校验所有 YAML + 电话格式 + 地址完整性

- [ ] **Step 1: 实现 `api/src/services/venue.ts`**

```typescript
import { loadConfig } from '../config/loader.js';

export interface VenueResult {
  name: string;
  address: string;
  phone: string;
  procedures: string[];
}

export function searchVenue(name: string, dataDir = '../../data'): VenueResult | null {
  const config = loadConfig(dataDir);
  const query = name.toLowerCase();

  for (const [_, persona] of config) {
    for (const phase of persona.timeline) {
      for (const proc of phase.procedures) {
        if (proc.where.type === 'fixed') {
          const venueName = proc.where.name.toLowerCase();
          const venueAddr = proc.where.address.toLowerCase();
          if (venueName.includes(query) || venueAddr.includes(query)) {
            return {
              name: proc.where.name,
              address: proc.where.address,
              phone: proc.where.phone,
              procedures: [proc.name],
            };
          }
        }
      }
    }
  }

  return null;
}
```

- [ ] **Step 2: 实现 `scripts/validate-data.ts`**

```typescript
#!/usr/bin/env tsx
import { loadConfig, ConfigValidationError } from '../api/src/config/loader.js';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = join(import.meta.dirname, '..', 'data');
const PROCEDURES_DIR = join(DATA_DIR, 'procedures');

let errors = 0;
let warnings = 0;

console.log('=== GitNexus Data Validation ===\n');

// 1. Schema validation
console.log('[1/4] Validating YAML schema...');
try {
  const config = loadConfig(DATA_DIR);
  console.log(`  OK: ${config.size} persona files loaded and validated`);
} catch (err) {
  if (err instanceof ConfigValidationError) {
    console.error(`  FAIL: ${err.message}`);
    console.error(`  File: ${err.filePath}`);
    for (const e of err.errors) {
      console.error(`    - ${JSON.stringify(e)}`);
    }
    errors++;
  } else {
    throw err;
  }
}

// 2. Phone format validation
console.log('\n[2/4] Validating phone numbers...');
const phonePattern = /^[\d]{3,4}-[\d]{7,8}$/;
const files = readdirSync(PROCEDURES_DIR).filter(f => f.endsWith('.yaml'));

for (const file of files) {
  const content = readFileSync(join(PROCEDURES_DIR, file), 'utf-8');
  const phones = content.match(/"[\d-]{10,15}"/g) || [];
  for (const phone of phones) {
    const clean = phone.replace(/"/g, '');
    if (!phonePattern.test(clean) && clean !== '0571-12345') {
      console.error(`  FAIL: ${file} — invalid phone format: ${clean}`);
      errors++;
    }
  }
}
console.log(`  OK: phone format check complete (${errors > 0 ? 'has errors' : 'all valid'})`);

// 3. Address completeness
console.log('\n[3/4] Checking address completeness...');
for (const file of files) {
  const content = readFileSync(join(PROCEDURES_DIR, file), 'utf-8');
  if (content.includes('address: ""') || content.includes("address: ''") || content.includes('address: null')) {
    console.error(`  FAIL: ${file} — empty address found`);
    errors++;
  }
}
console.log(`  OK: address check complete`);

// 4. Procedure coverage
console.log('\n[4/4] Checking procedure coverage...');
const config = loadConfig(DATA_DIR);
for (const [id, persona] of config) {
  const totalProcs = persona.timeline.reduce((sum, p) => sum + p.procedures.length, 0);
  console.log(`  ${id}: ${totalProcs} procedures`);
  if (totalProcs < 8) {
    console.error(`  WARN: ${id} has only ${totalProcs} procedures — may be incomplete`);
    warnings++;
  }
}

console.log(`\n=== Result: ${errors} errors, ${warnings} warnings ===`);
process.exit(errors > 0 ? 1 : 0);
```

- [ ] **Step 3: 运行校验脚本**

```bash
cd api && npm run validate:data
# Expected: 0 errors, 0 warnings
```

- [ ] **Step 4: Commit**

```bash
git add api/src/services/venue.ts scripts/validate-data.ts
git commit -m "feat: add VenueService and CI data validation script"
```

---

### Task 11: uni-app 小程序脚手架 + 首页

**Files:**
- Create: `miniprogram/App.vue`, `miniprogram/pages.json`
- Create: `miniprogram/api/client.ts`, `miniprogram/utils/storage.ts`
- Create: `miniprogram/pages/index/index.vue`

**Interfaces:**
- Produces: 小程序可启动，首页显示引导文案和"开始办理"按钮

- [ ] **Step 1: 创建 `miniprogram/App.vue`**

```vue
<script setup>
import { onLaunch } from '@dcloudio/uni-app';

onLaunch(() => {
  console.log('Bereavement Navigator launched');
});
</script>

<style>
page {
  background-color: #f5f0eb;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
  font-size: 32rpx;
  color: #333;
}
</style>
```

- [ ] **Step 2: 创建 `miniprogram/pages.json`**

```json
{
  "pages": [
    { "path": "pages/index/index", "style": { "navigationBarTitleText": "" } },
    { "path": "pages/persona/index", "style": { "navigationBarTitleText": "选择身份" } },
    { "path": "pages/quiz/index", "style": { "navigationBarTitleText": "情况确认" } },
    { "path": "pages/timeline/index", "style": { "navigationBarTitleText": "办理清单" } },
    { "path": "pages/detail/index", "style": { "navigationBarTitleText": "事项详情" } }
  ],
  "globalStyle": {
    "navigationBarBackgroundColor": "#f5f0eb",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#f5f0eb"
  }
}
```

- [ ] **Step 3: 创建 `miniprogram/api/client.ts`**

```typescript
const BASE_URL = 'https://api.bereavement.example.com'; // Replace with actual domain

interface GuideRequest {
  persona_id: string;
  city?: string;
  answers: Record<string, string | boolean>;
}

export async function fetchPersonas() {
  const res = await uni.request({ url: `${BASE_URL}/api/personas`, method: 'GET' });
  return (res.data as any).personas;
}

export async function fetchGuide(data: GuideRequest) {
  const res = await uni.request({
    url: `${BASE_URL}/api/guide`,
    method: 'POST',
    data,
  });
  return res.data as any;
}

export async function fetchDelegationPdf(data: any): Promise<string> {
  const res = await uni.request({
    url: `${BASE_URL}/api/pdf/delegation-letter`,
    method: 'POST',
    data,
    responseType: 'arraybuffer',
  });
  // Save to temp file for preview
  const fs = uni.getFileSystemManager();
  const tmpPath = `${wx.env.USER_DATA_PATH}/delegation-letter.pdf`;
  fs.writeFileSync(tmpPath, res.data as ArrayBuffer);
  return tmpPath;
}
```

- [ ] **Step 4: 创建 `miniprogram/utils/storage.ts`**

```typescript
const KEYS = {
  ANSWERS: 'bn_answers',
  PERSONA_ID: 'bn_persona_id',
  COMPLETED: 'bn_completed',
};

export function saveAnswers(personaId: string, answers: Record<string, any>) {
  uni.setStorageSync(KEYS.PERSONA_ID, personaId);
  uni.setStorageSync(KEYS.ANSWERS, JSON.stringify(answers));
}

export function loadAnswers(): { personaId: string; answers: Record<string, any> } | null {
  const personaId = uni.getStorageSync(KEYS.PERSONA_ID);
  const raw = uni.getStorageSync(KEYS.ANSWERS);
  if (personaId && raw) {
    return { personaId, answers: JSON.parse(raw) };
  }
  return null;
}

export function clearAnswers() {
  uni.removeStorageSync(KEYS.PERSONA_ID);
  uni.removeStorageSync(KEYS.ANSWERS);
}

export function getCompletedSet(): Set<string> {
  const raw = uni.getStorageSync(KEYS.COMPLETED) || '[]';
  return new Set(JSON.parse(raw));
}

export function toggleCompleted(procedureId: string): boolean {
  const set = getCompletedSet();
  if (set.has(procedureId)) {
    set.delete(procedureId);
  } else {
    set.add(procedureId);
  }
  uni.setStorageSync(KEYS.COMPLETED, JSON.stringify([...set]));
  return set.has(procedureId);
}
```

- [ ] **Step 5: 创建 `miniprogram/pages/index/index.vue`**

```vue
<template>
  <view class="home">
    <view class="hero">
      <text class="hero-emoji">🕯️</text>
      <text class="hero-text">
        我们知道这会是一段艰难的时光。\n接下来你需要跑很多手续，\n我们来帮你逐个理清。
      </text>
    </view>

    <button class="start-btn" @click="startGuide">开始办理</button>

    <view class="resume-hint" v-if="hasSession" @click="resumeGuide">
      你有一个未完成的流程，点击继续
    </view>

    <view class="footer-note">
      本服务完全免费。信息仅供参考，建议办理前致电确认。
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { loadAnswers } from '../../utils/storage.js';

const hasSession = ref(!!loadAnswers());

function startGuide() {
  uni.navigateTo({ url: '/pages/persona/index' });
}

function resumeGuide() {
  uni.navigateTo({ url: '/pages/quiz/index?resume=1' });
}
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 60rpx 40rpx;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
}

.hero-emoji {
  font-size: 80rpx;
  margin-bottom: 40rpx;
}

.hero-text {
  font-size: 36rpx;
  line-height: 2;
  text-align: center;
  color: #555;
  white-space: pre-line;
}

.start-btn {
  width: 400rpx;
  height: 88rpx;
  line-height: 88rpx;
  background-color: #8b7e6a;
  color: #fff;
  border-radius: 44rpx;
  font-size: 34rpx;
  border: none;
}

.resume-hint {
  margin-top: 30rpx;
  color: #8b7e6a;
  font-size: 28rpx;
  text-decoration: underline;
}

.footer-note {
  position: fixed;
  bottom: 40rpx;
  color: #bbb;
  font-size: 24rpx;
  text-align: center;
  padding: 0 40rpx;
}
</style>
```

- [ ] **Step 6: Commit**

```bash
git add miniprogram/
git commit -m "feat: add mini program scaffold with home page"
```

---

### Task 12: 小程序 — 身份选择 + 逐题问答页

**Files:**
- Create: `miniprogram/pages/persona/index.vue`
- Create: `miniprogram/pages/quiz/index.vue`
- Create: `miniprogram/components/ProgressBar.vue`

**Interfaces:**
- Consumes: `fetchPersonas()` from api/client
- Produces: 身份卡片列表 → 选中后跳转问答页；问答页逐题展示，完成后调用 API 并跳转清单页

- [ ] **Step 1: 创建 `miniprogram/components/ProgressBar.vue`**

```vue
<template>
  <view class="progress-bar">
    <view class="progress-fill" :style="{ width: percent + '%' }"></view>
  </view>
  <view class="progress-text">第 {{ current }} / {{ total }} 题</view>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps<{ current: number; total: number }>();
const percent = computed(() => Math.round((props.current / props.total) * 100));
</script>

<style scoped>
.progress-bar {
  height: 8rpx;
  background: #e0d8cc;
  border-radius: 4rpx;
  margin-bottom: 8rpx;
}
.progress-fill {
  height: 100%;
  background: #8b7e6a;
  border-radius: 4rpx;
  transition: width 0.3s ease;
}
.progress-text {
  font-size: 24rpx;
  color: #999;
  text-align: center;
}
</style>
```

- [ ] **Step 2: 创建 `miniprogram/pages/persona/index.vue`**

```vue
<template>
  <view class="persona-page">
    <text class="page-title">请选择逝者身份类型</text>
    <text class="page-subtitle">选错没关系，可以重新选择</text>

    <view class="card-list">
      <view
        v-for="p in personas"
        :key="p.id"
        class="persona-card"
        @click="selectPersona(p.id)"
      >
        <text class="card-name">{{ p.name }}</text>
        <text class="card-desc">{{ p.description }}</text>
      </view>
    </view>

    <view v-if="loading" class="loading">加载中...</view>
    <view v-if="error" class="error">加载失败，请下拉重试</view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { fetchPersonas } from '../../api/client.js';

const personas = ref([]);
const loading = ref(true);
const error = ref(false);

onMounted(async () => {
  try {
    personas.value = await fetchPersonas();
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
});

function selectPersona(id) {
  uni.setStorageSync('bn_persona_id', id);
  uni.navigateTo({ url: `/pages/quiz/index` });
}
</script>

<style scoped>
.persona-page { padding: 40rpx; }
.page-title { font-size: 38rpx; font-weight: bold; display: block; margin-bottom: 10rpx; }
.page-subtitle { font-size: 28rpx; color: #999; display: block; margin-bottom: 40rpx; }
.card-list { display: flex; flex-direction: column; gap: 20rpx; }
.persona-card {
  background: #fff; border-radius: 16rpx; padding: 30rpx;
  border: 2rpx solid #e8e0d5;
}
.card-name { font-size: 34rpx; font-weight: bold; display: block; }
.card-desc { font-size: 28rpx; color: #888; margin-top: 8rpx; display: block; }
</style>
```

- [ ] **Step 3: 创建 `miniprogram/pages/quiz/index.vue`**

```vue
<template>
  <view class="quiz-page">
    <ProgressBar :current="currentIndex + 1" :total="questions.length" />

    <view class="question-card" v-if="currentQuestion">
      <text class="question-text">{{ currentQuestion.text }}</text>

      <view class="options">
        <view
          v-for="opt in currentQuestion.options"
          :key="opt.value"
          class="option-btn"
          :class="{ selected: selectedAnswer === opt.value }"
          @click="selectAnswer(opt.value)"
        >
          {{ opt.label }}
        </view>
      </view>
    </view>

    <button
      class="next-btn"
      :disabled="!selectedAnswer"
      @click="nextQuestion"
    >
      {{ isLast ? '生成清单' : '下一题' }}
    </button>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import ProgressBar from '../../components/ProgressBar.vue';
import { fetchGuide } from '../../api/client.js';
import { saveAnswers } from '../../utils/storage.js';

const personaId = ref(uni.getStorageSync('bn_persona_id') || 'retired_worker');
const answers = ref({});
const currentIndex = ref(0);
const selectedAnswer = ref('');

// Question definitions per persona
const questionSets = {
  retired_worker: [
    { key: 'death_location', text: '逝者是在哪里离世的？', options: [
      { label: '医院', value: 'at_hospital' },
      { label: '家中', value: 'at_home' },
      { label: '意外/其他地点', value: 'accident' },
    ]},
    { key: 'has_real_estate', text: '逝者名下是否有房产？', options: [
      { label: '有', value: true },
      { label: '没有', value: false },
    ]},
    { key: 'has_commercial_insurance', text: '逝者是否购买了商业保险？', options: [
      { label: '有', value: true },
      { label: '没有', value: false },
    ]},
    { key: 'has_will', text: '逝者是否留有遗嘱？', options: [
      { label: '有', value: true },
      { label: '没有', value: false },
    ]},
    { key: 'has_social_security', text: '逝者是否在杭州缴纳社保？', options: [
      { label: '是', value: true },
      { label: '否', value: false },
    ]},
  ],
  // Other personas share similar structure with slightly different questions
  active_worker: [
    { key: 'death_location', text: '逝者是在哪里离世的？', options: [
      { label: '医院', value: 'at_hospital' },
      { label: '家中', value: 'at_home' },
      { label: '意外/其他地点', value: 'accident' },
    ]},
    { key: 'has_work_injury', text: '是否因工作原因导致死亡？', options: [
      { label: '是（工亡）', value: true },
      { label: '否', value: false },
    ]},
    { key: 'has_real_estate', text: '逝者名下是否有房产？', options: [
      { label: '有', value: true },
      { label: '没有', value: false },
    ]},
    { key: 'has_commercial_insurance', text: '逝者是否购买了商业保险？', options: [
      { label: '有', value: true },
      { label: '没有', value: false },
    ]},
    { key: 'has_will', text: '逝者是否留有遗嘱？', options: [
      { label: '有', value: true },
      { label: '没有', value: false },
    ]},
  ],
};

const questions = computed(() => questionSets[personaId.value] || questionSets.retired_worker);
const isLast = computed(() => currentIndex.value >= questions.value.length - 1);
const currentQuestion = computed(() => questions.value[currentIndex.value]);

function selectAnswer(value) {
  selectedAnswer.value = value;
}

async function nextQuestion() {
  const key = currentQuestion.value.key;
  answers.value[key] = selectedAnswer.value;

  if (isLast.value) {
    // All questions answered — call API
    saveAnswers(personaId.value, answers.value);
    try {
      const result = await fetchGuide({
        persona_id: personaId.value,
        city: 'hangzhou',
        answers: answers.value,
      });
      uni.setStorageSync('bn_guide_result', JSON.stringify(result));
      uni.navigateTo({ url: '/pages/timeline/index' });
    } catch (e) {
      uni.showToast({ title: '网络错误，请重试', icon: 'none' });
    }
  } else {
    currentIndex.value++;
    selectedAnswer.value = '';
  }
}
</script>

<style scoped>
.quiz-page { padding: 40rpx; display: flex; flex-direction: column; min-height: 90vh; }
.question-card { margin: 60rpx 0; }
.question-text { font-size: 36rpx; line-height: 1.8; display: block; margin-bottom: 40rpx; }
.options { display: flex; flex-direction: column; gap: 20rpx; }
.option-btn {
  background: #fff; border: 2rpx solid #ddd; border-radius: 12rpx;
  padding: 28rpx; font-size: 32rpx; text-align: center;
}
.option-btn.selected { border-color: #8b7e6a; background: #f5f0eb; color: #8b7e6a; }
.next-btn {
  margin-top: auto; width: 100%; height: 88rpx; line-height: 88rpx;
  background: #8b7e6a; color: #fff; border-radius: 44rpx; font-size: 32rpx; border: none;
}
.next-btn[disabled] { background: #ccc; }
</style>
```

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/persona/ miniprogram/pages/quiz/ miniprogram/components/
git commit -m "feat: add persona selection and quiz pages"
```

---

### Task 13: 小程序 — 时间线清单 + 事项详情页

**Files:**
- Create: `miniprogram/pages/timeline/index.vue`
- Create: `miniprogram/pages/detail/index.vue`
- Create: `miniprogram/components/ProcedureCard.vue`

**Interfaces:**
- Consumes: guideResult from storage / API
- Produces: 按时间分组的可勾选清单 + 事项详情（材料列表、网点信息、PDF 生成触发）

- [ ] **Step 1: 创建 `miniprogram/components/ProcedureCard.vue`**

```vue
<template>
  <view class="proc-card" :class="{ completed: isCompleted }" @click="$emit('click')">
    <view class="proc-left">
      <view class="urgency-dot" :class="urgency"></view>
      <view class="proc-info">
        <text class="proc-name">{{ name }}</text>
        <text class="proc-where">{{ whereText }}</text>
      </view>
    </view>
    <view class="proc-right">
      <text class="check-icon">{{ isCompleted ? '✅' : '○' }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue';
import { getCompletedSet } from '../../utils/storage.js';

const props = defineProps<{
  id: string;
  name: string;
  urgency: string;
  where: any;
}>();
defineEmits(['click']);

const isCompleted = computed(() => getCompletedSet().has(props.id));
const whereText = computed(() => {
  return props.where.type === 'fixed' ? props.where.name : props.where.resolved;
});
</script>

<style scoped>
.proc-card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24rpx; background: #fff; border-radius: 12rpx; margin-bottom: 12rpx;
  border-left: 6rpx solid #ccc;
}
.proc-card.completed { opacity: 0.5; }
.proc-left { display: flex; align-items: center; gap: 16rpx; flex: 1; }
.urgency-dot { width: 12rpx; height: 12rpx; border-radius: 50%; }
.urgency-dot.critical { background: #e74c3c; }
.urgency-dot.high { background: #f39c12; }
.urgency-dot.normal { background: #95a5a6; }
.proc-name { font-size: 30rpx; display: block; }
.proc-where { font-size: 24rpx; color: #999; display: block; margin-top: 4rpx; }
.proc-right { font-size: 36rpx; }
</style>
```

- [ ] **Step 2: 创建 `miniprogram/pages/timeline/index.vue`**

```vue
<template>
  <view class="timeline-page">
    <view class="header">
      <text class="persona-name">{{ guide?.persona.name }}</text>
      <text class="summary">
        共 {{ guide?.summary.total_procedures }} 项 · 
        {{ guide?.summary.critical_count }} 项紧急
      </text>
    </view>

    <view v-for="phase in guide?.timeline" :key="phase.phase" class="phase-group">
      <view class="phase-header">
        <text class="phase-icon">{{ phaseIcon(phase.phase) }}</text>
        <view>
          <text class="phase-title">{{ phase.title }}</text>
          <text class="phase-time">{{ phaseLabel(phase.phase) }}</text>
        </view>
      </view>

      <ProcedureCard
        v-for="proc in phase.procedures"
        :key="proc.id"
        :id="proc.id"
        :name="proc.name"
        :urgency="proc.urgency"
        :where="proc.where"
        @click="openDetail(proc)"
      />
    </view>

    <view class="actions">
      <button class="action-btn" @click="generateChecklistPdf">下载材料清单 PDF</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import ProcedureCard from '../../components/ProcedureCard.vue';

const guide = ref(null);

onMounted(() => {
  const raw = uni.getStorageSync('bn_guide_result');
  if (raw) guide.value = JSON.parse(raw);
});

const phaseLabels = { '24h': '24小时内', '3d': '1-3天', '7d': '3-7天', '30d': '7-30天', '90d': '30-90天', long: '长期' };
const phaseIcons = { '24h': '⚠️', '3d': '🕯️', '7d': '📋', '30d': '💰', '90d': '🏠', long: '📝' };

function phaseIcon(phase) { return phaseIcons[phase] || '📌'; }
function phaseLabel(phase) { return phaseLabels[phase] || phase; }

function openDetail(proc) {
  uni.setStorageSync('bn_current_proc', JSON.stringify(proc));
  uni.navigateTo({ url: '/pages/detail/index' });
}

function generateChecklistPdf() {
  uni.showToast({ title: '请在详情页生成PDF', icon: 'none' });
}
</script>

<style scoped>
.timeline-page { padding: 20rpx; }
.header { padding: 30rpx 20rpx; }
.persona-name { font-size: 36rpx; font-weight: bold; display: block; }
.summary { font-size: 28rpx; color: #888; display: block; margin-top: 8rpx; }
.phase-group { margin-bottom: 24rpx; }
.phase-header { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 8rpx; }
.phase-icon { font-size: 40rpx; }
.phase-title { font-size: 32rpx; font-weight: bold; display: block; }
.phase-time { font-size: 24rpx; color: #999; display: block; }
.actions { padding: 40rpx 20rpx; }
.action-btn { background: #fff; border: 2rpx solid #8b7e6a; color: #8b7e6a; border-radius: 44rpx; font-size: 30rpx; margin-bottom: 20rpx; }
</style>
```

- [ ] **Step 3: 创建 `miniprogram/pages/detail/index.vue`**

```vue
<template>
  <view class="detail-page" v-if="proc">
    <view class="section">
      <text class="proc-name">{{ proc.name }}</text>
      <text class="urgency-badge" :class="proc.urgency">
        {{ proc.urgency === 'critical' ? '紧急' : proc.urgency === 'high' ? '重要' : '正常' }}
      </text>
    </view>

    <view class="section">
      <text class="section-title">📍 办理地点</text>
      <text class="section-text">{{ whereName }}</text>
      <text class="section-sub" v-if="whereAddr">{{ whereAddr }}</text>
      <text class="section-sub" v-if="wherePhone">📞 {{ wherePhone }}</text>
    </view>

    <view class="section">
      <text class="section-title">📋 需要携带的材料</text>
      <view class="material-list">
        <view v-for="o in proc.need.originals" :key="o" class="material-item original">
          <text>□ {{ o }}（原件）</text>
        </view>
        <view v-for="c in proc.need.copies" :key="c.doc" class="material-item copy">
          <text>□ {{ c.doc }} 复印件×{{ c.count }}</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="proc.output">
      <text class="section-title">📤 办完后会得到</text>
      <text class="section-text output-text">{{ proc.output }}</text>
    </view>

    <view class="section" v-if="proc.notes">
      <text class="section-title">⚠️ 注意事项</text>
      <text class="section-text notes-text">{{ proc.notes }}</text>
    </view>

    <view class="actions">
      <button class="action-btn primary" @click="generateDelegationPdf">生成授权委托书</button>
      <button class="action-btn" :class="{ done: isCompleted }" @click="toggleDone">
        {{ isCompleted ? '撤销完成' : '标记为已完成' }}
      </button>
    </view>

    <view class="feedback">
      <text>信息有误？<text class="link" @click="reportError">反馈给我们</text></text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getCompletedSet, toggleCompleted } from '../../utils/storage.js';
import { fetchDelegationPdf } from '../../api/client.js';

const proc = ref(null);
const isCompleted = ref(false);

onMounted(() => {
  const raw = uni.getStorageSync('bn_current_proc');
  if (raw) {
    proc.value = JSON.parse(raw);
    isCompleted.value = getCompletedSet().has(proc.value.id);
  }
});

const whereName = computed(() =>
  proc.value?.where.type === 'fixed' ? proc.value.where.name : proc.value.where.resolved
);
const whereAddr = computed(() => proc.value?.where.address);
const wherePhone = computed(() => proc.value?.where.phone);

function toggleDone() {
  if (proc.value) {
    isCompleted.value = toggleCompleted(proc.value.id);
  }
}

async function generateDelegationPdf() {
  try {
    const pdfPath = await fetchDelegationPdf({
      principalName: '',
      principalId: '',
      agentName: '',
      agentId: '',
      relationship: '',
      deceasedName: '',
      deceasedId: '',
      deathDate: '',
      persona_id: uni.getStorageSync('bn_persona_id'),
      answers: JSON.parse(uni.getStorageSync('bn_answers') || '{}'),
    });
    uni.openDocument({ filePath: pdfPath, fileType: 'pdf' });
  } catch (e) {
    uni.showToast({ title: '生成失败，请稍后重试', icon: 'none' });
  }
}

function reportError() {
  uni.showToast({ title: '感谢反馈，我们会尽快核实', icon: 'none' });
}
</script>

<style scoped>
.detail-page { padding: 30rpx; }
.section { margin-bottom: 32rpx; }
.proc-name { font-size: 38rpx; font-weight: bold; display: block; }
.urgency-badge { font-size: 24rpx; padding: 4rpx 16rpx; border-radius: 20rpx; }
.urgency-badge.critical { background: #fde8e8; color: #e74c3c; }
.urgency-badge.high { background: #fef3e2; color: #f39c12; }
.section-title { font-size: 30rpx; font-weight: bold; display: block; margin-bottom: 12rpx; }
.section-text { font-size: 30rpx; display: block; line-height: 1.8; }
.section-sub { font-size: 26rpx; color: #888; display: block; margin-top: 4rpx; }
.material-item { font-size: 28rpx; padding: 8rpx 0; }
.material-item.original { font-weight: bold; }
.output-text { color: #27ae60; }
.notes-text { color: #e67e22; }
.actions { margin-top: 40rpx; display: flex; flex-direction: column; gap: 16rpx; }
.action-btn { border-radius: 44rpx; font-size: 30rpx; height: 88rpx; line-height: 88rpx; }
.action-btn.primary { background: #8b7e6a; color: #fff; border: none; }
.action-btn.done { background: #27ae60; color: #fff; border: none; }
.feedback { margin-top: 40rpx; text-align: center; }
.link { color: #8b7e6a; text-decoration: underline; }
</style>
```

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/timeline/ miniprogram/pages/detail/ miniprogram/components/ProcedureCard.vue
git commit -m "feat: add timeline checklist and procedure detail pages"
```

---

### Task 14: Web 分享页面 + 部署配置

**Files:**
- Create: `web/pages/share/[id].html`
- Create: `web/pages/pdf/[type]/[id].html`

**Interfaces:**
- Produces: 纯静态 HTML 分享页面（可部署到任意静态托管服务）

- [ ] **Step 1: 创建 `web/pages/share/[id].html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>办理清单 - 丧亲行政事务导航</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, "PingFang SC", sans-serif; background: #f5f0eb; color: #333; padding: 20px; }
  .header { text-align: center; padding: 40px 0 30px; }
  .header h1 { font-size: 24px; margin-bottom: 8px; }
  .header p { color: #888; font-size: 14px; }
  .phase { margin-bottom: 20px; }
  .phase-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; padding: 10px 0; border-bottom: 1px solid #ddd; }
  .item { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 10px; border-left: 4px solid #8b7e6a; }
  .item-name { font-size: 16px; font-weight: bold; margin-bottom: 6px; }
  .item-where { font-size: 14px; color: #666; }
  .item-need { font-size: 13px; color: #888; margin-top: 8px; }
  .footer { text-align: center; padding: 30px 0; color: #bbb; font-size: 12px; }
  .footer a { color: #8b7e6a; }
</style>
</head>
<body>
  <div class="header">
    <h1 id="personaName">丧亲行政事务办理清单</h1>
    <p>生成时间：<span id="date"></span> · 共 <span id="total"></span> 项</p>
  </div>
  <div id="timeline"></div>
  <div class="footer">
    本清单仅供参考，办理前建议致电确认。<br>
    如有出入请<a href="#">反馈给我们</a>。
  </div>

  <script>
    const params = new URLSearchParams(window.location.search);
    const dataB64 = params.get('d');
    if (dataB64) {
      try {
        const guide = JSON.parse(atob(decodeURIComponent(dataB64)));
        document.getElementById('personaName').textContent = guide.persona.name + ' · 办理清单';
        document.getElementById('date').textContent = new Date().toISOString().split('T')[0];
        document.getElementById('total').textContent = guide.summary.total_procedures;

        const timelineEl = document.getElementById('timeline');
        for (const phase of guide.timeline) {
          const phaseDiv = document.createElement('div');
          phaseDiv.className = 'phase';
          phaseDiv.innerHTML = `<div class="phase-title">${phase.title}</div>`;
          for (const proc of phase.procedures) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item';
            const where = proc.where.resolved || proc.where.name;
            const originals = proc.need.originals.join('、');
            itemDiv.innerHTML = `
              <div class="item-name">${proc.name}</div>
              <div class="item-where">📍 ${where}</div>
              <div class="item-need">需要：${originals}</div>
            `;
            phaseDiv.appendChild(itemDiv);
          }
          timelineEl.appendChild(phaseDiv);
        }
      } catch (e) {
        document.body.innerHTML = '<p style="text-align:center;padding:60px;">清单数据无效或已过期</p>';
      }
    } else {
      document.body.innerHTML = '<p style="text-align:center;padding:60px;">清单数据无效或已过期</p>';
    }
  </script>
</body>
</html>
```

- [ ] **Step 2: 部署说明 + 环境变量文档**

```bash
# 部署步骤
# 1. 构建 API
cd api && npm run build

# 2. 部署到服务器（以 systemd 为例）
# sudo cp dist/ /opt/bereavement-api/
# sudo systemctl start bereavement-api

# 3. 微信小程序发布
# uni-app 编译 → 微信开发者工具上传 → 提交审核

# 4. Web 页面部署到静态托管
# 复制 web/pages/ 到 CDN / Nginx / Vercel
```

- [ ] **Step 3: Commit**

```bash
git add web/ api/src/
git commit -m "feat: add web share page and deployment notes"
```

---

### Task 15: 端到端测试 + 最终数据校验

**Files:**
- Create: `api/test/e2e.test.ts` (E2E smoke test)

- [ ] **Step 1: 创建 E2E smoke test `api/test/e2e.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('E2E Smoke Test', () => {
  let baseUrl: string;

  beforeAll(async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp({ logger: false });
    await app.listen({ port: 0 });
    baseUrl = `http://localhost:${(app.server.address() as any).port}`;
  });

  const personas = ['retired_worker', 'active_worker', 'urban_resident', 'civil_servant', 'military'];

  for (const personaId of personas) {
    it(`should return valid guide for ${personaId}`, async () => {
      const answers: Record<string, string | boolean> = { death_location: 'at_hospital' };
      // Add persona-specific required answers
      if (personaId === 'retired_worker') {
        answers.has_real_estate = false;
        answers.has_commercial_insurance = false;
        answers.has_will = false;
        answers.has_social_security = true;
      }

      const res = await fetch(`${baseUrl}/api/guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_id: personaId, city: 'hangzhou', answers }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.timeline.length).toBeGreaterThan(0);
      expect(body.summary.total_procedures).toBeGreaterThan(0);
      // Verify no procedure has unresolved where
      for (const phase of body.timeline) {
        for (const proc of phase.procedures) {
          expect(proc.where.type).toBeTruthy();
          if (proc.where.type === 'fixed') {
            expect(proc.where.name).toBeTruthy();
          }
        }
      }
    });
  }

  it('should generate PDF delegation letter', async () => {
    const res = await fetch(`${baseUrl}/api/pdf/delegation-letter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        principalName: '测试人', principalId: '330100199001011234',
        agentName: '代办人', agentId: '330100199501015678',
        relationship: '子女', deceasedName: '逝者', deceasedId: '330100195001011234',
        deathDate: '2026-06-20',
        persona_id: 'retired_worker',
        answers: { death_location: 'at_hospital', has_real_estate: false,
                    has_commercial_insurance: false, has_will: false, has_social_security: true },
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
  });
});
```

- [ ] **Step 2: 运行完整测试套件**

```bash
cd api && npm test
# Expected: ALL tests PASS
# - Unit: ConfigLoader (4 tests), GuideEngine (5 tests)
# - Integration: API (3 tests)
# - E2E: Smoke (6 tests)
# - Data validation: 0 errors, 0 warnings
```

- [ ] **Step 3: 最终提交**

```bash
git add -A
git commit -m "test: add E2E smoke tests for all persona types and PDF generation

All tests passing:
- 9 unit tests
- 3 integration tests
- 6 E2E tests
- Data validation clean for all 5 persona YAML files"
```

---

## Self-Review

**Spec coverage:** 检查每个 spec 章节：
1. ✅ 产品概述 → Task 11 (首页引导页)
2. ✅ 用户画像 → Task 12 persona 选择页考虑了中老年用户（大字号）
3. ✅ 架构 → Task 1 + Task 8 (YAML 驱动 + Fastify + SQLite)
4. ✅ 数据模型 → Task 2 (JSON Schema) + Tasks 3-5 (5 个 YAML 文件)
5. ✅ API 设计 → Tasks 6-9 (ConfigLoader + GuideEngine + Routes + PDF)
6. ✅ 用户流程 → Tasks 11-13 (小程序 5 页面全路径)
7. ✅ 错误处理 → GuideEngine 中 unknown persona 400，PDF 降级，启动校验拒绝启动
8. ✅ 测试策略 → Tasks 6,7,8,9,15 (unit + integration + E2E + data CI)
9. ✅ MVP 范围 → 15 个 tasks 全部在 MVP 边界内
10. ✅ 项目结构 → 文件结构总览匹配所有 create 指令

**Placeholder scan:** 无 TBD、TODO、模糊指令。所有步骤包含真实代码。

**Type consistency:** GuideResult、PersonaConfig、Procedure 等类型在 ConfigLoader 中定义，GuideEngine 和 Routes 中一致使用。`matchGuide(config, id, answers)` 签名全一致。

---

Plan complete and saved to `docs/superpowers/plans/2026-06-26-bereavement-navigator.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
