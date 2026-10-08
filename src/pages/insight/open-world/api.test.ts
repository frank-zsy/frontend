// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchOverviewDataset, fetchOverviewMeta } from './api'

const datasetPayload = {
  leaderboards: [],
  trends: [],
}

function mockFetch(payload: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response)
}

describe('OpenWorld data source', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses the calendar-year directory by default', async () => {
    const fetchMock = mockFetch(datasetPayload)

    await fetchOverviewDataset('developers', 'world')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://selfoss.open-digger.cn/openshare/overview/developers.json',
    )
  })

  it('uses the half-year directory for meta, world, and drill-down data', async () => {
    const fetchMock = mockFetch(datasetPayload)

    await fetchOverviewMeta(true)
    await fetchOverviewDataset('contribution', 'world', true)
    await fetchOverviewDataset('developers', 'CN', true)

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://selfoss.open-digger.cn/openshare/overview_half_year/meta.json',
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://selfoss.open-digger.cn/openshare/overview_half_year/contribution.json',
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://selfoss.open-digger.cn/openshare/overview_half_year/CN/developers.json',
    )
  })
})
