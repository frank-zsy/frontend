import { OVERVIEW_DATA_BASE_URL } from './constants'
import type { DatasetKey, GeoScope, OverviewDataset, OverviewMeta } from './types'

/**
 * 拉取 Overview meta.json，包含 summary（InfoBar 依赖）与 drillDownCountries。
 * 失败一律返回 null，由上层用本地兜底。
 */
export async function fetchOverviewMeta(): Promise<OverviewMeta | null> {
  try {
    const response = await fetch(`${OVERVIEW_DATA_BASE_URL}meta.json`)
    if (!response.ok) return null
    const data: unknown = await response.json()
    if (!data || typeof data !== 'object') return null
    const obj = data as Record<string, unknown>
    if (!obj.summary || typeof obj.summary !== 'object') return null
    return obj as unknown as OverviewMeta
  } catch {
    return null
  }
}

/**
 * 拉取 Overview dataset。
 * - world 视图: {dataset}.json
 * - 下钻视图: {geoScope}/{dataset}.json （如 CN/developers.json，geoScope 为 Alpha-2 国家码）
 *
 * 三层防御: try/catch + response.ok + 顶层结构校验，任何异常一律返回 null。
 */
export async function fetchOverviewDataset(
  dataset: DatasetKey,
  geoScope: GeoScope,
): Promise<OverviewDataset | null> {
  try {
    const path = geoScope === 'world' ? `${dataset}.json` : `${geoScope}/${dataset}.json`
    const response = await fetch(`${OVERVIEW_DATA_BASE_URL}${path}`)
    if (!response.ok) return null
    const data: unknown = await response.json()
    if (!data || typeof data !== 'object') return null
    const obj = data as Record<string, unknown>
    if (!Array.isArray(obj.leaderboards) || !Array.isArray(obj.trends)) return null
    return obj as unknown as OverviewDataset
  } catch {
    return null
  }
}
