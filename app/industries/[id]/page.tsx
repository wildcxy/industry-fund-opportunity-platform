import Link from "next/link";
import { notFound } from "next/navigation";

import { RiskDisclaimer } from "@/components/risk-disclaimer";
import { ScorePill } from "@/components/score-pill";
import { StorageActionButton } from "@/components/storage-action-button";
import { TrendBars } from "@/components/trend-bars";
import { getIndustryDetailView } from "@/lib/adapters/industry";
import { formatAum, formatPercent, formatRate } from "@/lib/format";
import { STORAGE_KEYS } from "@/lib/storage";
import { IndustryEventImpactLabel } from "@/types";

function MethodologyPanel({
  title,
  content
}: {
  title: string;
  content: string;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-7 text-ink/68">{content}</p>
    </div>
  );
}

function formatFundAumWithQuality(fund: { aum?: number | null; missingMetrics?: string[] }) {
  if (fund.missingMetrics?.includes("aum") || fund.aum === null || fund.aum === undefined || fund.aum <= 0) {
    return "--";
  }
  return formatAum(fund.aum);
}

function eventImpactLabel(label: IndustryEventImpactLabel) {
  if (label === "long_term_support") return "长期 thesis 支撑";
  if (label === "risk_or_invalidation") return "风险/失效信号";
  if (label === "short_term_noise") return "短期扰动";
  if (label === "mixed") return "多空混合";
  return "证据不足";
}

function eventImpactTone(label: IndustryEventImpactLabel) {
  if (label === "long_term_support") return "bg-emerald-50 text-emerald-800";
  if (label === "risk_or_invalidation") return "bg-rose-50 text-rose-800";
  if (label === "short_term_noise") return "bg-amber-50 text-amber-800";
  return "bg-mist text-ink/65";
}

export default async function IndustryDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getIndustryDetailView(id);

  if (!detail) {
    notFound();
  }

  const metricGroups = [
    { title: "趋势信号", metrics: detail.trendMetrics },
    { title: "资金信号", metrics: detail.capitalMetrics },
    { title: "估值信号", metrics: detail.valuationMetrics },
    { title: "风险信号", metrics: detail.riskMetrics }
  ];
  const longTermEvents = detail.longTermEvents ?? [];
  const eventGroups = [
    {
      label: "long_term_support" as const,
      title: "长期 thesis 支撑",
      items: longTermEvents.filter((event) => event.longTermImpact === "long_term_support" || event.longTermImpact === "mixed")
    },
    {
      label: "risk_or_invalidation" as const,
      title: "风险/失效信号",
      items: longTermEvents.filter((event) => event.longTermImpact === "risk_or_invalidation" || event.longTermImpact === "insufficient_evidence")
    },
    {
      label: "short_term_noise" as const,
      title: "短期扰动",
      items: longTermEvents.filter((event) => event.longTermImpact === "short_term_noise")
    }
  ];

  return (
    <div className="space-y-8">
      <section className="panel p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Industry Detail</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold">{detail.industryName}</h1>
              <ScorePill score={detail.chartSeries.at(-1)?.value ?? 0} label={detail.opportunityLabel} />
            </div>
            <p className="mt-5 text-lg leading-8 text-ink/72">{detail.headline}</p>
            <p className="mt-4 leading-8 text-ink/68">{detail.thesisSummary}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <StorageActionButton
              storageKey={STORAGE_KEYS.watchlist}
              itemId={detail.industryId}
              idleLabel="加入观察"
              activeLabel="已在观察中"
            />
            <Link
              href={`/funds?theme=${encodeURIComponent(detail.industryName)}`}
              className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold"
            >
              查看相关基金
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {detail.conclusionCards.map((card) => (
          <article key={card.title} className="panel p-5">
            <p className="text-sm text-ink/55">{card.title}</p>
            <p className="mt-3 text-2xl font-semibold">{card.value}</p>
            <p className="mt-3 text-sm leading-7 text-ink/68">{card.summary}</p>
          </article>
        ))}
      </section>

      {detail.trendStrategy ? (
        <section className="panel p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="eyebrow">Trend Strategy</p>
              <h2 className="mt-2 text-2xl font-semibold">趋势策略与回撤控制</h2>
              <p className="mt-3 leading-8 text-ink/68">{detail.trendStrategy.hint}</p>
              <p className="mt-2 text-sm leading-7 text-ink/55">{detail.trendStrategy.riskControlHint}</p>
            </div>
            <div className="rounded-3xl bg-ink p-5 text-white">
              <p className="text-sm text-white/65">策略信号</p>
              <p className="mt-2 text-2xl font-semibold">{detail.trendStrategy.signal}</p>
              <p className="mt-2 text-sm text-white/70">策略分 {detail.trendStrategy.strategyScore}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-2xl bg-mist/60 p-4">
              <p className="text-sm text-ink/55">20日动量</p>
              <p className="mt-2 text-lg font-semibold">{formatRate(detail.trendStrategy.return20d)}</p>
            </div>
            <div className="rounded-2xl bg-mist/60 p-4">
              <p className="text-sm text-ink/55">60日动量</p>
              <p className="mt-2 text-lg font-semibold">{formatRate(detail.trendStrategy.return60d)}</p>
            </div>
            <div className="rounded-2xl bg-mist/60 p-4">
              <p className="text-sm text-ink/55">120日代理</p>
              <p className="mt-2 text-lg font-semibold">{formatRate(detail.trendStrategy.return120dProxy)}</p>
            </div>
            <div className="rounded-2xl bg-mist/60 p-4">
              <p className="text-sm text-ink/55">最大回撤代理</p>
              <p className="mt-2 text-lg font-semibold">{formatRate(detail.trendStrategy.maxDrawdownProxy)}</p>
            </div>
            <div className="rounded-2xl bg-mist/60 p-4">
              <p className="text-sm text-ink/55">波动代理</p>
              <p className="mt-2 text-lg font-semibold">{formatRate(detail.trendStrategy.volatilityProxy)}</p>
            </div>
            <div className="rounded-2xl bg-mist/60 p-4">
              <p className="text-sm text-ink/55">过热风险</p>
              <p className="mt-2 text-lg font-semibold">{detail.trendStrategy.overheatRiskScore}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            <div className="rounded-2xl border border-ink/10 bg-white p-4">
              <p className="text-sm text-ink/55">动量</p>
              <p className="mt-2 text-xl font-semibold">{detail.trendStrategy.momentumScore}</p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-white p-4">
              <p className="text-sm text-ink/55">回撤控制</p>
              <p className="mt-2 text-xl font-semibold">{detail.trendStrategy.drawdownControlScore}</p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-white p-4">
              <p className="text-sm text-ink/55">波动控制</p>
              <p className="mt-2 text-xl font-semibold">{detail.trendStrategy.volatilityControlScore}</p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-white p-4">
              <p className="text-sm text-ink/55">趋势质量</p>
              <p className="mt-2 text-xl font-semibold">{detail.trendStrategy.trendQualityScore}</p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-white p-4">
              <p className="text-sm text-ink/55">方法说明</p>
              <p className="mt-2 text-xs leading-5 text-ink/62">{detail.trendStrategy.methodology}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section-grid">
        {detail.chartSeries.length > 0 ? (
          <TrendBars title={`${detail.industryName} 阶段评分变化`} data={detail.chartSeries} />
        ) : (
          <div className="panel p-6">
            <p className="eyebrow">Trend Chart</p>
            <h2 className="mt-2 text-2xl font-semibold">趋势图表区</h2>
            <p className="mt-4 leading-8 text-ink/68">当前仅展示文字摘要，后续可在真实数据接入后替换为图表。</p>
          </div>
        )}

        {detail.capitalHeatSeries.length > 0 ? (
          <TrendBars title={`${detail.industryName} 资金热度变化`} data={detail.capitalHeatSeries} />
        ) : (
          <div className="panel p-6">
            <p className="eyebrow">Capital Heat</p>
            <h2 className="mt-2 text-2xl font-semibold">资金热度图表区</h2>
            <p className="mt-4 leading-8 text-ink/68">当前仅展示文字摘要，建议结合资金强度指标与事件节奏综合判断。</p>
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel p-6">
          <p className="eyebrow">Signal Breakdown</p>
          <h2 className="mt-2 text-2xl font-semibold">核心信号拆解</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {metricGroups.map((group) => (
              <div key={group.title} className="rounded-2xl bg-mist/55 p-4">
                <p className="text-base font-semibold">{group.title}</p>
                <div className="mt-4 space-y-3">
                  {group.metrics.length > 0 ? (
                    group.metrics.map((metric) => (
                      <div key={metric.name} className="rounded-2xl bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold">{metric.name}</p>
                          <ScorePill score={metric.score} label="信号分值" />
                        </div>
                        <p className="mt-3 text-sm leading-7 text-ink/68">{metric.summary}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-white p-4 text-sm leading-7 text-ink/68">当前仅展示文字摘要</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <p className="eyebrow">Methodology</p>
          <h2 className="mt-2 text-2xl font-semibold">指标口径说明</h2>
          <div className="mt-6 space-y-4">
            {detail.methodologyNotes.map((note) => (
              <MethodologyPanel key={note.title} title={note.title} content={note.content} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="panel p-6">
          <p className="eyebrow">Catalysts</p>
          <h2 className="mt-2 text-2xl font-semibold">催化事件时间线</h2>
          <div className="mt-6 space-y-4">
            {detail.timelineEvents.length > 0 ? (
              detail.timelineEvents.map((event) => (
                <div key={`${event.date}-${event.title}`} className="rounded-2xl border border-ink/10 bg-white p-4">
                  <p className="text-sm font-semibold text-pine">{event.date}</p>
                  <p className="mt-2 font-semibold">{event.title}</p>
                  <p className="mt-2 text-sm leading-7 text-ink/68">{event.summary}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-ink/10 bg-white p-4 text-sm leading-7 text-ink/68">
                近期暂无新增事件，建议结合趋势与估值综合判断。
              </div>
            )}
          </div>
        </div>

        <div className="panel p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="eyebrow">Long-Term Events</p>
              <h2 className="mt-2 text-2xl font-semibold">长期事件影响</h2>
              <p className="mt-3 text-sm leading-7 text-ink/62">
                事件只用于验证行业长期逻辑、风险和失效条件，不作为短线交易信号。
              </p>
            </div>
            {detail.eventImpactSummary ? (
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${eventImpactTone(detail.eventImpactSummary.impactDirection)}`}>
                {eventImpactLabel(detail.eventImpactSummary.impactDirection)} / {detail.eventImpactSummary.confidence}
              </span>
            ) : null}
          </div>
          {detail.eventImpactSummary ? (
            <div className="mt-4 rounded-2xl bg-mist/55 p-4 text-sm leading-7 text-ink/65">
              <p>{detail.eventImpactSummary.riskControlHint}</p>
              {detail.eventImpactSummary.invalidationConditions.length ? (
                <p className="mt-2 text-rose-800">失效条件：{detail.eventImpactSummary.invalidationConditions.join("；")}</p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-5 grid gap-4">
            {eventGroups.map((group) => (
              <div key={group.title} className="rounded-2xl border border-ink/10 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{group.title}</p>
                  <span className="rounded-full bg-mist px-2 py-1 text-xs font-semibold text-pine">{group.items.length} 条</span>
                </div>
                <div className="mt-3 space-y-3">
                  {group.items.length ? (
                    group.items.map((event) => (
                      <article key={event.eventId} className="rounded-xl bg-mist/55 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${eventImpactTone(event.longTermImpact)}`}>
                            {eventImpactLabel(event.longTermImpact)}
                          </span>
                          <span className="text-xs text-ink/48">{event.eventDate} / {event.sourceName}</span>
                        </div>
                        <p className="mt-2 font-semibold">{event.title}</p>
                        <p className="mt-2 text-sm leading-6 text-ink/65">{event.thesisEffect}</p>
                        <p className="mt-1 text-xs leading-5 text-ink/55">{event.riskNote}</p>
                      </article>
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-ink/55">暂无该类长期事件证据。</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Related Funds</p>
              <h2 className="mt-2 text-2xl font-semibold">代表性基金映射</h2>
            </div>
            <Link href="/compare" className="text-sm font-semibold text-pine">
              前往对比页
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {detail.relatedFunds.map((fund) => (
              <div key={fund.fundId} className="rounded-2xl border border-ink/10 bg-mist/55 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold">{fund.fundName}</p>
                    <p className="mt-1 text-sm text-ink/58">
                      {fund.fundCode} · {fund.fundType} · {fund.trackingTarget}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-pine">
                        评分 {fund.rankingScore ?? "--"}
                      </span>
                      {fund.rankingSignal ? (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-pine">
                          {fund.rankingSignal}
                        </span>
                      ) : null}
                      {fund.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-pine">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-ink/55">近 3 月</p>
                      <p className="mt-2 font-semibold">{formatPercent(fund.return3m)}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-ink/55">规模</p>
                      <p className="mt-2 font-semibold">{formatFundAumWithQuality(fund)}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/funds?theme=${encodeURIComponent(detail.industryName)}`}
                    className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
                  >
                    查看基金列表
                  </Link>
                  <StorageActionButton
                    storageKey={STORAGE_KEYS.compare}
                    itemId={fund.fundId}
                    idleLabel="加入对比"
                    activeLabel="已加入对比"
                    maxItems={4}
                  />
                  <StorageActionButton
                    storageKey={STORAGE_KEYS.watchlist}
                    itemId={fund.fundId}
                    idleLabel="加入观察"
                    activeLabel="已加入观察"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <RiskDisclaimer compact />
      <p className="text-sm text-ink/55">{detail.disclaimer}</p>
    </div>
  );
}
