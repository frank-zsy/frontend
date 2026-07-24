import { TREND_DATA_BASE } from './constants';
import { normalizeRepoPlatform } from '../domain/repoPlatform';
import type { TalentBaseline, TalentData } from '../types/talent';

let baselineCache: Promise<TalentBaseline | null> | null = null;

export function fetchTalentBaseline(): Promise<TalentBaseline | null> {
  if (!baselineCache) {
    baselineCache = fetch(`${TREND_DATA_BASE}talent_baseline.json`)
      .then((res) => (res.ok ? (res.json() as Promise<TalentBaseline>) : null))
      .catch(() => null);
  }
  return baselineCache;
}

export async function fetchUserTalent(platform: unknown, login: string): Promise<TalentData | null> {
  const handle = (login || '').split('/')[0]?.trim() || '';
  if (!handle) return null;
  const p = normalizeRepoPlatform(platform || 'github');
  const url = `${TREND_DATA_BASE}${p}/${handle}/talent.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as TalentData;
  } catch {
    return null;
  }
}
