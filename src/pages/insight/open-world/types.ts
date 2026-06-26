// Overview 数据契约（与 OSS 输出对齐）
// - 3 个固定 dataset 文件: developers / contribution / influence
// - 顶层结构: { leaderboards: [...], trends: [trend, trend, trend] }
// - leaderboard: { title, title_zh, options[], options_zh[], data[] }
// - row 通用字段: rank, name, name_zh, value, change；国家榜额外含 code（alpha2 或 'CN-BJ'）
// - influence 第 2 榜（企业榜）额外含 id, logo, country, country_zh

export type DatasetKey = 'developers' | 'contribution' | 'influence'

/** 地理范围: 'world' 或国家 alpha2 码（如 'CN', 'US'） */
export type GeoScope = 'world' | string

export interface LeaderboardColumn {
  name: string
  type: 'String' | 'StringWithIcon'
  /** 该列从行数据中取的字段，StringWithIcon 一般为 [textField, logoField] */
  fields: string[]
  /** 建议列宽（px） */
  width: number
}

export interface LeaderboardRow {
  rank: number
  name: string
  name_zh: string
  value: number
  /** 同比绝对变化量（可正可负） */
  change: number
  /** 国家榜行的 alpha2 或 ISO 3166-2 代码（如 'US' / 'CN-BJ'） */
  code?: string
  /** 企业榜行字段 */
  id?: string
  logo?: string
  country?: string
  country_zh?: string
  /** 兜底允许其它扩展字段 */
  [extra: string]: unknown
}

export interface Leaderboard {
  title: string
  title_zh: string
  options: LeaderboardColumn[]
  options_zh: LeaderboardColumn[]
  data: LeaderboardRow[]
}

export interface TrendItem {
  title: string
  title_zh: string
  /** 最近 5 个完整自然年（动态推导） */
  labels: string[]
  /** 与 labels 一一对应；缺数据用 0 占位 */
  values: number[]
}

export interface OverviewDataset {
  leaderboards: Leaderboard[]
  /** 固定 3 个 trend */
  trends: TrendItem[]
}

/**
 * InfoBar 渲染依赖的 summary 数据契约。
 * 字段语义：
 * - totalRecords: 日志总量（OSS meta 字段 totalRecords）
 * - totalRepos:   仓库总量
 * - totalDevelopers: 开发者总量
 * - totalCountries:  覆盖国家与地区数量
 * - dataSource / updatedAt: 数据来源与更新时间（YYYY-MM 精度）
 * activeDevelopers 不在 InfoBar 中展示，按需保留扩展字段。
 */
export interface OverviewSummary {
  totalRecords?: number
  totalRepos: number
  totalDevelopers: number
  totalCountries?: number
  dataSource: string
  updatedAt: string
}

/**
 * meta.json 顶层结构（selfoss.open-digger.cn/openshare/overview/meta.json）：
 * - metrics: dataset key 列表
 * - drillDownCountries: alpha2 -> 国家本地化名称映射
 * - summary: InfoBar 渲染依赖；activeDevelopers 为扩展字段，当前 InfoBar 不展示
 */
export interface OverviewMetaSummary extends OverviewSummary {
  activeDevelopers?: number
}

export interface OverviewMeta {
  metrics: DatasetKey[]
  drillDownCountries: Record<string, { name: string; name_zh: string }>
  summary: OverviewMetaSummary
}
