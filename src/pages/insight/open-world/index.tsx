import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { fetchOverviewDataset, fetchOverviewMeta } from './api'
import { InfoBar } from './components/InfoBar'
import { LeaderboardPanel } from './components/LeaderboardPanel'
import { MetricSelector } from './components/MetricSelector'
import { OverviewMap } from './components/OpenWorldMap'
import { TrendChart } from './components/TrendChart'
import {
  COUNTRY_META,
  DEFAULT_DATASET,
  DEFAULT_GEO_SCOPE,
  DRILL_DOWN_COUNTRIES,
} from './constants'
import type { DatasetKey, GeoScope, LeaderboardRow, OverviewDataset, OverviewMeta, OverviewSummary } from './types'

/** 将 ISO 时间或 'YYYY-MM-DD' 刪到 YYYY-MM（InfoBar 要求精度到月） */
function normalizeUpdatedAt(raw: string | undefined): string {
  if (typeof raw === 'string' && /^\d{4}-\d{2}/.test(raw)) {
    return raw.slice(0, 7)
  }
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** 当前客户端时间格式化为 YYYY-MM 用于 InfoBar.updatedAt 兜底 */
function getCurrentYearMonth(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export default function OverviewPage() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language.startsWith('zh')

  const [dataset, setDataset] = useState<DatasetKey>(DEFAULT_DATASET)
  const [geoScope, setGeoScope] = useState<GeoScope>(DEFAULT_GEO_SCOPE)
  const [payload, setPayload] = useState<OverviewDataset | null>(null)
  const [meta, setMeta] = useState<OverviewMeta | null>(null)
  const [loading, setLoading] = useState(true)

  // meta 只需拉一次（summary / drillDownCountries）
  useEffect(() => {
    let cancelled = false
    fetchOverviewMeta().then((data) => {
      if (cancelled) return
      setMeta(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // influence 不支持下钻，切换到 influence 时回归世界视图
  useEffect(() => {
    if (dataset === 'influence' && geoScope !== 'world') {
      setGeoScope(DEFAULT_GEO_SCOPE)
    }
  }, [dataset, geoScope])

  // 切换 dataset 或 geoScope 时拉取数据；切 dataset 时保留 geoScope（用户停留在下钻态）
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const effectiveScope = dataset === 'influence' ? 'world' : geoScope
    fetchOverviewDataset(dataset, effectiveScope).then((data) => {
      if (cancelled) return
      setPayload(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [dataset, geoScope])

  const handleDrillDown = useCallback((countryCode: string) => {
    if (dataset === 'influence') return
    setGeoScope(countryCode)
  }, [dataset])

  const handleBackToWorld = useCallback(() => {
    setGeoScope(DEFAULT_GEO_SCOPE)
  }, [])

  const handleRowClick = useCallback((row: LeaderboardRow) => {
    if (dataset === 'influence') return
    if (typeof row.code === 'string' && DRILL_DOWN_COUNTRIES.includes(row.code) && geoScope === 'world') {
      setGeoScope(row.code)
    }
  }, [dataset, geoScope])

  // dataset 名称（i18n + key 兜底）
  const datasetI18nKey = `insight.overview.datasets.${dataset}`
  const translatedDataset = t(datasetI18nKey)
  const metricLabel = translatedDataset === datasetI18nKey ? dataset : translatedDataset

  // 地区名称（world / 下钻国家）
  const regionLabel = useMemo(() => {
    if (geoScope === 'world') return isZh ? '全球' : 'World'
    const meta = COUNTRY_META[geoScope]
    if (!meta) return geoScope
    return isZh ? meta.zh : meta.en
  }, [geoScope, isZh])

  const pageTitle = t('insight.overview.map.titlePattern', { metric: metricLabel, region: regionLabel })

  // 地图数据源：固定取第一个含 code 的国家榜（企业榜无 code 不参与地图）
  const mapRows: LeaderboardRow[] = useMemo(() => {
    if (!payload) return []
    const board = payload.leaderboards.find(b => b.data.some(r => typeof r.code === 'string'))
    return board?.data ?? []
  }, [payload])

  const leaderboards = payload?.leaderboards ?? []
  const trends = payload?.trends ?? []

  // InfoBar summary：优先用 meta，未拉到时本地兜底
  const summary: OverviewSummary = useMemo(() => {
    if (meta?.summary) {
      const s = meta.summary
      return {
        totalRecords: typeof s.totalRecords === 'number' ? s.totalRecords : undefined,
        totalRepos: typeof s.totalRepos === 'number' ? s.totalRepos : 0,
        totalDevelopers: typeof s.totalDevelopers === 'number' ? s.totalDevelopers : 0,
        totalCountries: typeof s.totalCountries === 'number' ? s.totalCountries : undefined,
        dataSource: typeof s.dataSource === 'string' && s.dataSource ? s.dataSource : 'OpenDigger',
        updatedAt: normalizeUpdatedAt(s.updatedAt),
      }
    }
    return {
      totalRepos: 0,
      totalDevelopers: 0,
      dataSource: 'OpenDigger',
      updatedAt: getCurrentYearMonth(),
    }
  }, [meta])

  return (
    <div className="flex h-full flex-col overflow-hidden px-2 pt-0 pb-0.5 md:px-3 md:pt-0 md:pb-1">
      {/* 标题 Banner */}
      <div className="overview-banner shrink-0 px-4 pt-1 pb-2 text-center md:px-6 md:pt-1.5 md:pb-3">
        <h1 className="overview-banner-title text-xl font-bold tracking-tight md:text-2xl">
          {pageTitle}
        </h1>
      </div>
      <div className="shrink-0 h-3 md:h-4" aria-hidden="true" />

      {/* 主内容区域 */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
        {/* 左侧：顶部选择器 + 地图 + 底部三趋势图 (70%)；减去一半 gap-3 避免与 InfoBar 右沿错位 */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 md:w-[calc(70%-6px)] md:flex-none">
          {/* 顶部：dataset 选择器 */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="w-80">
              <MetricSelector value={dataset} onChange={setDataset} />
            </div>
          </div>

          {/* 地图：占据主要高度；overflow-hidden 避免 ECharts canvas 隐式高度把趋势图挤出左列底沿 */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <OverviewMap
              rows={mapRows}
              geoScope={geoScope}
              metricLabel={metricLabel}
              regionLabel={regionLabel}
              isZh={isZh}
              loading={loading}
              onDrillDown={handleDrillDown}
              onBackToWorld={handleBackToWorld}
            />
          </div>

          {/* 底部：三个趋势图横排，紧凑模式隐藏垂直刻度 */}
          {/* 使用 flex + overflow-hidden 限定子卡片严格=120px，避免 grid auto-rows 被 min-content 撑高造成倒灌 InfoBar */}
          <div className="flex h-[120px] shrink-0 gap-3 overflow-hidden">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="min-h-0 min-w-0 flex-1 overflow-hidden">
                <TrendChart
                  trend={trends[idx] ?? null}
                  loading={loading}
                  isZh={isZh}
                  compact
                />
              </div>
            ))}
          </div>
        </div>

        {/* 右侧：贯穿上下的完整排行榜面板 (30%)；减去一半 gap-3 避免与 InfoBar 右沿错位 */}
        <div className="flex min-h-0 flex-1 flex-col md:w-[calc(30%-6px)] md:flex-none">
          <div className="min-h-0 flex-1">
            <LeaderboardPanel
              leaderboards={leaderboards}
              isZh={isZh}
              loading={loading}
              onRowClick={handleRowClick}
            />
          </div>
        </div>
      </div>

      {/* 底部信息栏：与上部主内容对齐，保留圆角 */}
      <div className="shrink-0 pt-2">
        <InfoBar summary={summary} />
      </div>
    </div>
  )
}
