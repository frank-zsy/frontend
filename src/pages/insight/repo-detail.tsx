import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchItemMeta, fetchRepoTrendData } from './api/openDiggerTrend';
import { fetchRepoCommunityOpenRankDetails } from './api/communityOpenRankDetails';
import { getLabelDetailPath, getDeveloperDetailPath } from './domain/routes';
import { getRepoUrlByPlatform, normalizeRepoPlatform } from './domain/repoPlatform';
import { normalizeInsightLang } from './domain/lang';
import { TrendChart } from './components/TrendChart';
import { CommunityDeveloperOpenRank } from './components/CommunityDeveloperOpenRank';
import { RepoPlatformIcon } from './components/RepoPlatformIcon';
import { LeaderboardAvatar } from './components/LeaderboardAvatar';
import { InsightDetailNav } from './components/InsightDetailNav';
import { inferredDeveloperAvatarUrl } from './domain/communityOpenRankDetails';
import { EMPTY_TREND, pickTrendMode } from './domain/trends';
import { preprocessContributions } from './domain/geography';
import { computeInitialTimeValue } from './domain/timeRange';
import type { RepoTrendMap, MetaLabelEntry, ContributionRow, TrendSeries } from './types/api';
import type { CommunityOpenRankDetailsFile } from './domain/communityOpenRankDetails';

const ContributionMap = lazy(() =>
  import('./components/ContributionMap').then((module) => ({ default: module.ContributionMap })),
);

function getLatest(t: TrendSeries): number {
  const v = t.values;
  return v.length ? Number(v[v.length - 1]) : 0;
}

function getPrev(t: TrendSeries): number {
  const v = t.values;
  return v.length >= 2 ? Number(v[v.length - 2]) : 0;
}

function getChangePct(latest: number, prev: number): string {
  if (!prev || prev === 0) return latest > 0 ? '+100' : '0';
  const pct = ((latest - prev) / prev) * 100;
  return (pct > 0 ? '+' : '') + pct.toFixed(1);
}

function getStatDelta(latest: number, prev: number): number | null {
  if (prev === 0 && latest === 0) return null;
  return latest - prev;
}

export default function RepoDetailPage() {
  const { platform, owner, repo } = useParams<{ platform: string; owner: string; repo: string }>();
  const repoName = `${owner}/${repo}`;
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = normalizeInsightLang(i18n.language);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<RepoTrendMap | null>(null);
  const [metaLabels, setMetaLabels] = useState<MetaLabelEntry[]>([]);
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [trendMode, setTrendMode] = useState<'month' | 'year'>('month');
  const [sectionTimeValue, setSectionTimeValue] = useState('');
  const [description, setDescription] = useState('');
  const [communityOpenRankDetails, setCommunityOpenRankDetails] = useState<CommunityOpenRankDetailsFile | null>(null);

  const normalizedPlatform = normalizeRepoPlatform(platform || 'github');

  useEffect(() => {
    if (!platform || !owner || !repo) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const item = { name: repoName, platform: normalizedPlatform, itemType: 'repo' };
        const [itemMeta, repoTrend, communityDetails] = await Promise.all([
          fetchItemMeta('repo', item),
          fetchRepoTrendData(normalizedPlatform, repoName),
          fetchRepoCommunityOpenRankDetails(normalizedPlatform, repoName),
        ]);
        if (cancelled) return;
        setTrendData(repoTrend);
        setMetaLabels(itemMeta.labels);
        setContributions(itemMeta.contributions || []);
        setDescription(itemMeta.description || itemMeta.descriptionZh || '');
        setCommunityOpenRankDetails(communityDetails);
      } catch {
        if (!cancelled) setError(t('insight.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [platform, owner, repo, normalizedPlatform, repoName, t]);

  const influenceTrend = trendData ? pickTrendMode(trendData.influence, trendMode) : EMPTY_TREND;
  const activityTrend = trendData ? pickTrendMode(trendData.activity, trendMode) : EMPTY_TREND;
  const participantsTrend = trendData ? pickTrendMode(trendData.participants, trendMode) : EMPTY_TREND;
  const issuePrTrend = trendData ? pickTrendMode(trendData.issuePr, trendMode) : EMPTY_TREND;

  const infLatest = getLatest(influenceTrend);
  const infPrev = getPrev(influenceTrend);
  const actLatest = getLatest(activityTrend);
  const actPrev = getPrev(activityTrend);
  const devLatest = getLatest(participantsTrend);
  const devPrev = getPrev(participantsTrend);

  const timeKey = influenceTrend.months.length
    ? influenceTrend.months[influenceTrend.months.length - 1]
    : '';

  const contributionRows = preprocessContributions(contributions);
  const showContributionMap = contributionRows.length > 0;
  const showCommunityRank = Boolean(communityOpenRankDetails);

  const handleTrendModeChange = (mode: 'month' | 'year') => {
    if (sectionTimeValue) {
      setSectionTimeValue(computeInitialTimeValue(mode, null, sectionTimeValue));
    }
    setTrendMode(mode);
  };
  const detailNav = (
    <InsightDetailNav
      homeLabel={t('insight.detailBreadcrumbHome')}
      sectionLabel={t('insight.detailSectionRepoSingular')}
      currentLabel={repoName}
      backLabel={t('insight.detailBackToInsight')}
    />
  );

  if (loading) {
    return (
      <div className="insight-detail-layout space-y-6">
        {detailNav}
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-muted-foreground">{t('insight.loadingRepository')}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="insight-detail-layout space-y-6">
        {detailNav}
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-sm text-destructive">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="insight-detail-layout space-y-6">
      {detailNav}

      {/* Repo Info Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <div className="relative size-20 flex-shrink-0 sm:size-32">
            <LeaderboardAvatar
              avatar={inferredDeveloperAvatarUrl(normalizedPlatform, owner || '')}
              displayName={owner || repoName}
              sizeClass="size-20 sm:size-32"
              bordered={false}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h1 className="text-xl font-semibold text-balance break-all text-foreground">{repoName}</h1>
              <span className="inline-block rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {t('insight.detailSectionRepoSingular')}
              </span>
              {metaLabels.map((label, idx) => {
                const text = lang === 'zh' ? (label.name_zh || label.name || '') : (label.name || label.name_zh || '');
                if (!text) return null;
                const hasLink = Boolean(label.id);
                if (hasLink) {
                  return (
                    <button
                      key={idx}
                      type="button"
                      className="inline-block cursor-pointer rounded border border-border bg-secondary px-2 py-0.5 font-mono text-[11px] leading-tight text-secondary-foreground transition-colors hover:border-primary/50 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => navigate(getLabelDetailPath(label.id!))}
                    >
                      {text}
                    </button>
                  );
                }
                return (
                  <span
                    key={idx}
                    className="inline-block rounded border border-border bg-secondary px-2 py-0.5 font-mono text-[11px] leading-tight text-muted-foreground"
                  >
                    {text}
                  </span>
                );
              })}
            </div>
            {description && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <a
            href={getRepoUrlByPlatform(normalizedPlatform, repoName)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full flex-shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-secondary-foreground transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
          >
            <RepoPlatformIcon platform={normalizedPlatform} size="sm" />
            <span>{t('insight.repoVisitExternal')}</span>
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon="lightning-bolt"
          iconBg="bg-chart-3/15"
          iconColor="text-chart-3"
          value={infLatest}
          pct={getChangePct(infLatest, infPrev)}
          delta={getStatDelta(infLatest, infPrev)}
          subtitle={`${t('insight.detailStatOpenRankInfluence')}${timeKey ? ` (${timeKey})` : ''}`}
        />
        <StatCard
          icon="chart-line"
          iconBg="bg-chart-1/15"
          iconColor="text-chart-1"
          value={actLatest}
          pct={getChangePct(actLatest, actPrev)}
          delta={getStatDelta(actLatest, actPrev)}
          subtitle={`${t('insight.detailStatActivity')}${timeKey ? ` (${timeKey})` : ''}`}
        />
        <StatCard
          icon="account-group"
          iconBg="bg-chart-2/15"
          iconColor="text-chart-2"
          value={devLatest}
          pct={getChangePct(devLatest, devPrev)}
          delta={getStatDelta(devLatest, devPrev)}
          subtitle={`${t('insight.detailStatDeveloperCount')}${timeKey ? ` (${timeKey})` : ''}`}
        />
      </div>

      {/* Trend Charts */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {t('insight.detailHistoricalTrendHeading')}
          </h2>
          <div className="flex rounded-lg border border-border bg-background p-0.5" role="group" aria-label={t('insight.detailTrendModeAria')}>
            <button
              type="button"
              aria-pressed={trendMode === 'month'}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${trendMode === 'month' ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => handleTrendModeChange('month')}
            >
              {t('insight.detailTrendModeMonth')}
            </button>
            <button
              type="button"
              aria-pressed={trendMode === 'year'}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${trendMode === 'year' ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => handleTrendModeChange('year')}
            >
              {t('insight.detailTrendModeYear')}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border border-border bg-background p-4">
            <TrendChart
              values={influenceTrend.values}
              label={t('insight.detailChartInfluenceTrend')}
              monthLabels={influenceTrend.months}
              noDataText={t('insight.noData')}
            />
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <TrendChart
              values={activityTrend.values}
              label={t('insight.detailChartActivityTrend')}
              monthLabels={activityTrend.months}
              noDataText={t('insight.noData')}
            />
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <TrendChart
              values={participantsTrend.values}
              label={t('insight.detailChartParticipantsTrend')}
              monthLabels={participantsTrend.months}
              noDataText={t('insight.noData')}
            />
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <TrendChart
              values={issuePrTrend.values}
              label={t('insight.detailChartIssuePrTrend')}
              monthLabels={issuePrTrend.months}
              noDataText={t('insight.noData')}
            />
          </div>
        </div>
      </div>



      {/* Contribution Map */}
      {showContributionMap && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            {t('insight.detailContributionMapHeading')}
          </h2>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
            <div className="max-h-80 overflow-auto rounded-lg border border-border bg-background p-4">
              <ContributionTable contributions={contributions} lang={lang} t={t} />
            </div>
            <Suspense fallback={<ContributionMapFallback />}>
              <ContributionMap contributions={contributions} />
            </Suspense>
          </div>
        </div>
      )}

      {/* Community Developer OpenRank */}
      {showCommunityRank && communityOpenRankDetails && (
        <div className="rounded-xl border border-border bg-card p-6">
          <CommunityDeveloperOpenRank
            details={communityOpenRankDetails}
            meta={null}
            timeType={trendMode}
            sectionTimeValue={sectionTimeValue || timeKey}
            onSectionTimeChange={setSectionTimeValue}
            onDeveloperClick={(devItem) => {
              const platform = devItem.platform || 'github';
              const login = (devItem.login ?? devItem.name ?? '').split('/')[0]?.trim() || '';
              if (login) {
                navigate(getDeveloperDetailPath(platform, login));
              }
            }}
            lang={lang}
            t={(k: string) => t(k)}
          />
        </div>
      )}
    </div>
  );
}

function ContributionMapFallback() {
  return (
    <div
      className="rounded-lg border border-border bg-background p-4"
      style={{ height: 320 }}
      aria-hidden="true"
    />
  );
}

function ContributionTable({
  contributions,
  lang,
  t,
}: {
  contributions: ContributionRow[];
  lang: 'zh' | 'en';
  t: (k: string) => string;
}) {
  const rows = preprocessContributions(contributions).slice().sort((a, b) => b.openrank - a.openrank);
  if (rows.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">{t('insight.noData')}</p>;
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border text-muted-foreground">
          <th className="py-2 pr-3 text-left font-mono">#</th>
          <th className="py-2 pr-3 text-left font-mono">{t('insight.contributionTableCountry')}</th>
          <th className="py-2 pr-3 text-right font-mono">{t('insight.mapTooltipDevelopers')}</th>
          <th className="py-2 text-right font-mono">{t('insight.headerOpenRank')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.mapName}-${index}`} className="border-b border-border/60">
            <td className="py-2 pr-3 font-mono text-muted-foreground">{index + 1}</td>
            <td className="py-2 pr-3 text-foreground">
              {row.countryCode ? (
                <img
                  src={`https://flagcdn.com/24x18/${row.countryCode.toLowerCase()}.png`}
                  alt=""
                  className="mr-2 inline-block align-middle"
                  style={{ width: 24, height: 18 }}
                />
              ) : null}
              {lang === 'zh' ? row.displayNameZh : row.displayNameEn}
            </td>
            <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted-foreground">
              {(row.developers ?? 0).toLocaleString()}
            </td>
            <td className="py-2 text-right font-mono tabular-nums text-muted-foreground">
              {row.openrank.toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const statDeltaFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

/* --- Internal StatCard Component --- */
function StatCard({
  icon,
  iconBg,
  iconColor,
  value,
  pct,
  delta,
  subtitle,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  value: number;
  pct: string;
  delta: number | null;
  subtitle: string;
}) {
  const up = parseFloat(pct) >= 0;
  return (
    <div className="rounded-xl border border-border bg-card px-5 pt-5 pb-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex size-9 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
            <svg className={`size-5 ${iconColor}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              {icon === 'lightning-bolt' && <path d="M11 15H6l7-14v8h5l-7 14v-8z" />}
              {icon === 'chart-line' && <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" />}
              {icon === 'account-group' && <path d="M12 5.5A3.5 3.5 0 0 1 15.5 9a3.5 3.5 0 0 1-3.5 3.5A3.5 3.5 0 0 1 8.5 9 3.5 3.5 0 0 1 12 5.5M5 8c.56 0 1.08.15 1.53.42-.15 1.43.27 2.85 1.13 3.96C7.16 13.34 6.16 14 5 14a3 3 0 0 1-3-3 3 3 0 0 1 3-3m14 0a3 3 0 0 1 3 3 3 3 0 0 1-3 3c-1.16 0-2.16-.66-2.66-1.62a5.54 5.54 0 0 0 1.13-3.96c.45-.27.97-.42 1.53-.42M5.5 18.25c0-2.07 2.91-3.75 6.5-3.75s6.5 1.68 6.5 3.75V20h-13v-1.75M0 20v-1.5c0-1.39 1.89-2.56 4.45-2.9-.59.68-.95 1.62-.95 2.65V20H0m24 0h-3.5v-1.75c0-1.03-.36-1.97-.95-2.65 2.56.34 4.45 1.51 4.45 2.9V20z" />}
            </svg>
          </div>
          <div className="text-3xl font-bold tabular-nums text-card-foreground">{value.toLocaleString()}</div>
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-medium ${up ? 'text-primary' : 'text-destructive'}`}>
          <svg className="size-4 flex-shrink-0 self-center" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            {up ? <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" /> : <path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6h-6z" />}
          </svg>
          <div className="flex flex-col items-end leading-tight font-mono tabular-nums">
            {delta != null ? <span>{statDeltaFormatter.format(Math.abs(delta))}</span> : null}
            <span>{Math.abs(parseFloat(pct))}%</span>
          </div>
        </div>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
    </div>
  );
}
