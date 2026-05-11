import Link from "next/link";

import { HeatmapGrid } from "@/components/heatmap-grid";
import { RiskDisclaimer } from "@/components/risk-disclaimer";
import { ScorePill } from "@/components/score-pill";
import { StorageActionButton } from "@/components/storage-action-button";
import { TrendBars } from "@/components/trend-bars";
import { WatchlistPanel } from "@/components/watchlist-panel";
import { IndustryNewsEventRefreshButton } from "@/features/industries/industry-news-event-refresh-button";
import { IndustryTopFundRefreshButton } from "@/features/industries/industry-top-fund-refresh-button";
import { getHomepageIndustryView } from "@/lib/adapters/industry";
import { formatPercent, formatRate } from "@/lib/format";
import { STORAGE_KEYS } from "@/lib/storage";

export default async function HomePage() {
  const homepage = await getHomepageIndustryView();
  const industries = homepage.industries;
  const focusIndustries = industries.slice(0, 2);

  return (
    <div className="space-y-8">
      <section className="panel overflow-hidden p-7 lg:p-10">
        <div className="section-grid items-start">
          <div>
            <p className="eyebrow">V1 Demo / Opportunity Discovery</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight lg:text-5xl">
              把行业机会、基金筛选与持续观察放到同一个决策工作台里。
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-ink/70">
              第一版以网页前端展示为核心，重点服务行业轮动和主题配置场景，帮助用户完成从发现机会到验证逻辑，再到基金筛选的完整链路。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/funds" className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">
                进入基金发现
              </Link>
              <Link
                href="/compare"
                className="rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink"
              >
                查看对比池
              </Link>
            </div>
          </div>
          <TrendBars
            title="行业机会评分走势"
            data={industries.map((item) => ({ label: item.industryName, value: item.opportunityScore }))}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <IndustryTopFundRefreshButton />
        <IndustryNewsEventRefreshButton />
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="metric-card">
          <p className="eyebrow">Market Overview</p>
          <h2 className="mt-2 text-2xl font-semibold">市场概览</h2>
          <p className="mt-3 text-sm leading-7 text-ink/65">{homepage.marketOverview.summary}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-ink/55">强趋势行业数</p>
          <p className="mt-3 text-4xl font-semibold">{homepage.marketOverview.strongTrendCount}</p>
          <p className="mt-3 text-sm text-ink/65">用于快速识别当前更偏趋势强化的主题方向。</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-ink/55">低位关注行业数</p>
          <p className="mt-3 text-4xl font-semibold">{homepage.marketOverview.lowPositionCount}</p>
          <p className="mt-3 text-sm text-ink/65">用于提示估值修复或中期观察价值更高的方向。</p>
        </div>
      </section>

      {homepage.globalFundPicks && homepage.globalFundPicks.items.length > 0 ? (
        <section className="panel p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">Daily Decision Brief</p>
              <h2 className="mt-2 text-2xl font-semibold">{homepage.globalFundPicks.title}</h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-ink/65">{homepage.globalFundPicks.methodology}</p>
            </div>
            <Link href="/portfolio" className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink">
              查看我的持仓策略
            </Link>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {homepage.globalFundPicks.items.map((fund, index) => (
              <article key={`${fund.fundCode}-${index}`} className="rounded-3xl border border-pine/15 bg-gradient-to-br from-white to-mist/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">TOP {index + 1}</span>
                    {fund.isHeld ? (
                      <span className="ml-2 rounded-full bg-pine px-3 py-1 text-xs font-semibold text-white">你已持有</span>
                    ) : null}
                    <h3 className="mt-4 text-lg font-semibold">{fund.fundName}</h3>
                    <p className="mt-1 text-xs text-ink/55">
                      {fund.fundCode} · {fund.theme} · {fund.fundType}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-pine px-4 py-3 text-right text-white">
                    <p className="text-xs text-white/70">观察分</p>
                    <p className="text-xl font-semibold">{fund.observationScore}</p>
                  </div>
                </div>
                {fund.isHeld ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-pine">
                      <p className="text-xs opacity-70">持仓市值</p>
                      <p className="mt-1 font-semibold">{fund.marketValueSnapshot?.toFixed(2) ?? "--"} 元</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-3 text-pine">
                      <p className="text-xs opacity-70">持有收益率</p>
                      <p className="mt-1 font-semibold">{formatRate(fund.holdingReturnSnapshot)}</p>
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 rounded-2xl bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-pine">{fund.actionLabel}</p>
                    {fund.decisionTiming ? (
                      <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink">
                        {fund.decisionTiming.decisionStage}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink/68">{fund.reason}</p>
                  <p className="mt-2 text-xs leading-5 text-ink/50">{fund.riskNote}</p>
                </div>
                {fund.decisionTiming ? (
                  <div className="mt-4 rounded-2xl bg-ink p-4 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Next Action</p>
                        <p className="mt-2 text-sm font-semibold">{fund.decisionTiming.nextAction}</p>
                      </div>
                      <div className="rounded-xl bg-white/10 px-3 py-2 text-right">
                        <p className="text-xs text-white/60">买入准备</p>
                        <p className="text-lg font-semibold">{fund.decisionTiming.buyReadinessScore}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-xs leading-5 text-white/72">
                      <p>
                        <span className="font-semibold text-white">买入触发：</span>
                        {fund.decisionTiming.buyTrigger}
                      </p>
                      <p>
                        <span className="font-semibold text-white">卖出/控仓：</span>
                        {fund.decisionTiming.sellTrigger}
                      </p>
                      <p>
                        <span className="font-semibold text-white">仓位建议：</span>
                        {fund.decisionTiming.positionAdvice}
                      </p>
                    </div>
                    <div className="mt-4 space-y-2">
                      {fund.decisionTiming.checklist.slice(0, 3).map((item) => (
                        <p key={item} className="rounded-xl bg-white/8 px-3 py-2 text-xs leading-5 text-white/70">
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-xs text-ink/50">近1月</p>
                    <p className="mt-1 font-semibold">{formatRate(fund.return1m)}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-xs text-ink/50">近3月</p>
                    <p className="mt-1 font-semibold">{formatRate(fund.return3m)}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-xs text-ink/50">回撤</p>
                    <p className="mt-1 font-semibold">{formatRate(fund.maxDrawdown)}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/funds/${encodeURIComponent(fund.fundCode)}`}
                    className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
                  >
                    详细复盘
                  </Link>
                  <StorageActionButton
                    storageKey={STORAGE_KEYS.watchlist}
                    itemId={fund.fundId}
                    idleLabel="加入观察"
                    activeLabel="已加入观察"
                  />
                  <StorageActionButton
                    storageKey={STORAGE_KEYS.compare}
                    itemId={fund.fundId}
                    idleLabel="加入对比"
                    activeLabel="已加入对比"
                    maxItems={4}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="panel p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow">Top Industries</p>
              <h2 className="mt-2 text-2xl font-semibold">行业机会榜单</h2>
            </div>
            <p className="text-sm text-ink/55">评分口径：趋势、资金、估值、风险四维综合展示</p>
          </div>
          <div className="mt-6 space-y-4">
            {industries.map((item, index) => (
              <article key={item.industryId} className="rounded-3xl border border-ink/10 bg-mist/50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">NO.{index + 1}</span>
                      <h3 className="text-xl font-semibold">{item.industryName}</h3>
                      <ScorePill score={item.opportunityScore} label={item.label} />
                    </div>
                    <p className="mt-3 leading-7 text-ink/70">{item.summary}</p>
                    {item.trendStrategy ? (
                      <div className="mt-4 rounded-2xl border border-pine/15 bg-white p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-pine px-3 py-1 text-xs font-semibold text-white">
                            {item.trendStrategy.signal}
                          </span>
                          <span className="text-sm font-semibold text-ink">趋势策略分 {item.trendStrategy.strategyScore}</span>
                          <span className="text-xs text-ink/55">过热风险 {item.trendStrategy.overheatRiskScore}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-ink/65">{item.trendStrategy.hint}</p>
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-pine">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid min-w-[220px] grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-ink/55">近 5 日</p>
                      <p className="mt-2 text-lg font-semibold">{formatPercent(item.performance5d)}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-ink/55">近 20 日</p>
                      <p className="mt-2 text-lg font-semibold">{formatPercent(item.performance20d)}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-ink/55">60日动量</p>
                      <p className="mt-2 text-lg font-semibold">{formatRate(item.trendStrategy?.return60d)}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-ink/55">风险等级</p>
                      <p className="mt-2 text-lg font-semibold">{item.riskLevel}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-ink/55">关联基金</p>
                      <p className="mt-2 text-lg font-semibold">{item.fundCount} 只</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/industries/${item.industryId}`}
                    className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
                  >
                    查看行业详情
                  </Link>
                  <Link
                    href={`/funds?theme=${encodeURIComponent(item.industryName)}`}
                    className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink"
                  >
                    查看相关基金
                  </Link>
                  <StorageActionButton
                    storageKey={STORAGE_KEYS.watchlist}
                    itemId={item.industryId}
                    idleLabel="加入观察"
                    activeLabel="已加入观察"
                  />
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-6">
            <div>
              <p className="eyebrow">Focus Cards</p>
              <h2 className="mt-2 text-2xl font-semibold">今日重点行业卡片</h2>
            </div>
            <div className="mt-6 space-y-4">
              {focusIndustries.map((item) => (
                <article key={item.industryId} className="rounded-3xl bg-gradient-to-br from-ink to-pine p-5 text-white">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold">{item.industryName}</p>
                      <p className="mt-2 text-sm text-white/80">{item.focusReason}</p>
                    </div>
                    <div className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">{item.opportunityScore}</div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/industries/${item.industryId}`}
                      className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink"
                    >
                      查看逻辑
                    </Link>
                    <Link
                      href={`/funds?theme=${encodeURIComponent(item.industryName)}`}
                      className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white"
                    >
                      查看基金
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <WatchlistPanel />
          <RiskDisclaimer />
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Fund Mapping</p>
            <h2 className="mt-2 text-2xl font-semibold">热门行业对应基金速览</h2>
          </div>
          <p className="text-sm text-ink/55">把行业机会直接映射到代表性基金，降低搜索成本。</p>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {industries.map((item) => (
            <article key={item.industryId} className="rounded-3xl border border-ink/10 bg-mist/55 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{item.industryName}</h3>
                  <p className="mt-2 text-sm text-ink/65">{item.methodology?.content ?? item.summary}</p>
                </div>
                <ScorePill score={item.opportunityScore} label={item.label} />
              </div>
              <div className="mt-5 space-y-3">
                {item.relatedFunds.map((fund) => (
                  <Link
                    key={fund.fundId}
                    href={`/funds?theme=${encodeURIComponent(item.industryName)}`}
                    className="block rounded-2xl bg-white p-4 transition hover:border-pine/35"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{fund.fundName}</p>
                        <p className="mt-1 text-xs text-ink/55">
                          {fund.fundCode} · {fund.fundType}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-pine">
                          {fund.rankingSignal ?? "行业Top10"} · 评分 {fund.rankingScore ?? "--"}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-pine">{formatPercent(fund.return3m)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <HeatmapGrid items={industries} />
    </div>
  );
}
