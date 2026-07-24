import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import type { EChartsType } from 'echarts/core';
import type { TalentBaseline, TalentYearData } from '../types/talent';

type Props = {
  yearData: TalentYearData;
  baseline: TalentBaseline;
};

type EChartsModule = typeof import('./talentProfileEcharts');

let echartsLoader: Promise<EChartsModule> | null = null;

function loadECharts() {
  if (!echartsLoader) {
    echartsLoader = import('./talentProfileEcharts');
  }
  return echartsLoader;
}

export function TalentRadarChart({ yearData, baseline }: Props) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let chart: EChartsType | null = null;
    let onResize: (() => void) | null = null;

    loadECharts().then(({ echarts }) => {
      if (cancelled) return;

      chart = echarts.init(container);
      chartRef.current = chart;
      onResize = () => chart?.resize();
      window.addEventListener('resize', onResize);

      const isDark = resolvedTheme === 'dark';
      const textColor = isDark ? '#e2e8f0' : '#334155';
      const tooltipBg = isDark ? '#1e293b' : '#ffffff';
      const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
      const splitLineColor = isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.15)';

      // Raw values for tooltip display
      const rawUserData = [
        yearData.totalOpenrankContributions,
        yearData.avgCodeQuality,
        yearData.avgPrTitleAndDescriptionQuality,
        yearData.avgValueLevel,
        yearData.avgIssueQuality,
      ];

      const rawBaselineData = [
        baseline.openrank,
        baseline.codeQuality,
        baseline.prTitleAndDescriptionQuality,
        baseline.valueLevel,
        baseline.issueQuality,
      ];

      // OpenRank dimension uses dynamic max; others are percentage-based (max 100)
      const openrankMax =
        Math.ceil(
          Math.max(yearData.totalOpenrankContributions, baseline.openrank) * 1.1,
        ) || 100;

      const indicators = [
        { name: t('insight.talentRadarOpenrank'), max: openrankMax },
        { name: t('insight.talentRadarCodeQuality'), max: 100 },
        { name: t('insight.talentRadarPrText'), max: 100 },
        { name: t('insight.talentRadarPrValue'), max: 100 },
        { name: t('insight.talentRadarIssueQuality'), max: 100 },
      ];

      // Use raw values directly; radar indicator max handles the scale
      const userData = [...rawUserData];
      const baselineData = [...rawBaselineData];

      const userLabel = t('insight.talentRadarUser');
      const baselineLabel = t('insight.talentRadarBaseline');

      chart.setOption({
        tooltip: {
          trigger: 'item',
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: { color: textColor, fontSize: 12 },
          formatter: () => {
            const lines = indicators.map((ind, i) =>
              `${ind.name}: <b>${rawUserData[i].toFixed(1)}</b> / ${rawBaselineData[i].toFixed(1)}`,
            );
            return `<b>${userLabel}</b> / ${baselineLabel}<br/>${lines.join('<br/>')}`;
          },
        },
        legend: {
          bottom: 0,
          textStyle: { color: textColor, fontSize: 12 },
          data: [t('insight.talentRadarUser'), t('insight.talentRadarBaseline')],
        },
        radar: {
          indicator: indicators,
          shape: 'polygon',
          splitNumber: 4,
          axisName: { color: textColor, fontSize: 11 },
          splitLine: { lineStyle: { color: splitLineColor } },
          splitArea: { show: false },
          axisLine: { lineStyle: { color: splitLineColor } },
        },
        series: [
          {
            type: 'radar',
            data: [
              {
                name: t('insight.talentRadarUser'),
                value: userData,
                areaStyle: { color: 'rgba(59,130,246,0.2)' },
                lineStyle: { color: '#3b82f6', width: 2 },
                itemStyle: { color: '#3b82f6' },
              },
              {
                name: t('insight.talentRadarBaseline'),
                value: baselineData,
                areaStyle: { color: 'rgba(107,114,128,0.1)' },
                lineStyle: { color: '#6b7280', width: 1.5, type: 'dashed' },
                itemStyle: { color: '#6b7280' },
              },
            ],
          },
        ],
      });
    });

    return () => {
      cancelled = true;
      if (onResize) window.removeEventListener('resize', onResize);
      if (chart) {
        chart.dispose();
        chartRef.current = null;
      }
    };
  }, [yearData, baseline, resolvedTheme, t]);

  return <div ref={containerRef} style={{ width: '100%', height: 300 }} />;
}
