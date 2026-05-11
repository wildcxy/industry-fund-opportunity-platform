import Link from "next/link";

import { RiskDisclaimer } from "@/components/risk-disclaimer";
import { getFundListView } from "@/lib/adapters/fund";
import { fetchBackendJson } from "@/lib/backend-api";
import { formatAum, formatPercent, formatRate } from "@/lib/format";
import { buildFundDataQualityNotes, buildShortTermReview } from "@/lib/fund-review";
import { FundHoldingView, FundListItem } from "@/types";
import { StrategyStateNote } from "./strategy-state-note";

function hasNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

function percent(value: number | null | undefined) {
  return hasNumber(value) ? formatPercent(value) : "--";
}

function nav(value: number | null | undefined) {
  return hasNumber(value) ? value.toFixed(4) : "--";
}

function moneyScale(value: number | null | undefined) {
  return hasNumber(value) && value > 0 ? formatAum(value) : "--";
}

function costAt(fund: FundListItem, days: number) {
  return fund.holdingCostSummary?.find((item) => item.holdingDays === days)?.totalCostRate;
}

async function getHoldingView(fundCode: string): Promise<FundHoldingView | null> {
  try {
    return await fetchBackendJson<FundHoldingView>(`/api/funds/${encodeURIComponent(fundCode)}/holdings`);
  } catch {
    return null;
  }
}

export default async function FundDetailPage({ params }: { params: Promise<{ fundCode: string }> }) {
  const { fundCode } = await params;
  const funds = await getFundListView();
  const fund = funds.find((item) => item.fundCode === fundCode || item.fundId === fundCode);

  if (!fund) {
    return (
      <div className="space-y-6">
        <section className="panel p-8">
          <p className="eyebrow">Fund Review</p>
          <h1 className="mt-2 text-3xl font-semibold">没有找到这只基金的本地快照</h1>
          <p className="mt-4 max-w-2xl leading-7 text-ink/65">
            这通常表示基金还没有加入真实采集池，或者后端暂时没有返回基金列表。可以先回到基金发现页搜索并采集该基金。
          </p>
          <Link href="/funds" className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">
            返回基金发现页
          </Link>
        </section>
        <RiskDisclaimer compact />
      </div>
    );
  }

  const [holdingView, allFunds] = await Promise.all([getHoldingView(fund.fundCode), getFundListView()]);
  const review = buildShortTermReview(fund);
  const qualityNotes = buildFundDataQualityNotes(fund);
  const sameThemeFunds = allFunds
    .filter((item) => item.fundCode !== fund.fundCode && item.theme === fund.theme)
    .sort((left, right) => {
      const leftValue = hasNumber(left.return3m) ? left.return3m : Number.NEGATIVE_INFINITY;
      const rightValue = hasNumber(right.return3m) ? right.return3m : Number.NEGATIVE_INFINITY;
      return rightValue - leftValue;
    })
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <section className="panel p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="eyebrow">Fund Detail Review</p>
            <h1 className="mt-2 text-4xl font-semibold">{fund.fundName}</h1>
            <p className="mt-3 text-sm text-ink/60">
              {fund.fundCode} / {fund.fundType} / {fund.theme} / {fund.trackingTarget}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-pine">{fund.dataSource ?? "数据来源待确认"}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${review.toneClass}`}>{review.badgeLabel}</span>
              {fund.fundCompany ? <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-pine">{fund.fundCompany}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/funds" className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold">
              回到基金发现
            </Link>
            <Link href={`/funds?theme=${encodeURIComponent(fund.theme)}`} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
              查看同主题基金
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="昨日涨跌" value={percent(fund.return1d)} note="盘后最新已披露交易日口径，不是实时盘中涨跌。" />
        <MetricCard label="近 1 月 / 近 3 月" value={`${percent(fund.return1m)} / ${percent(fund.return3m)}`} note="用于判断短期是否连续升温。" />
        <MetricCard label="最大回撤 / 波动率" value={`${percent(fund.maxDrawdown)} / ${percent(fund.volatility)}`} note="用于判断长期持有过程中的心理压力。" />
        <MetricCard label="规模 / 成立年限" value={`${moneyScale(fund.aum)} / ${fund.foundedYears ? `${fund.foundedYears} 年` : "--"}`} note="规模过小或成立时间过短都需要额外谨慎。" />
      </section>

      <StrategyStateNote fundId={fund.fundId} fundCode={fund.fundCode} fundName={fund.fundName} />

      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="eyebrow">Short Term Review</p>
            <h2 className="mt-2 text-2xl font-semibold">{review.title}</h2>
            <p className="mt-3 max-w-3xl leading-7 text-ink/68">{review.summary}</p>
          </div>
          <span className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${review.toneClass}`}>{review.badgeLabel}</span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {review.metrics.map((item) => (
            <MetricCard key={item.label} label={item.label} value={item.value} note={item.note} />
          ))}
        </div>
        <div className="mt-5 rounded-2xl bg-mist/60 p-5">
          <p className="font-semibold">复盘动作提示</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {review.actions.map((item) => (
              <p key={item} className="rounded-xl bg-white p-4 text-sm leading-6 text-ink/68">
                {item}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="panel p-6">
          <p className="eyebrow">Cost Review</p>
          <h2 className="mt-2 text-2xl font-semibold">费用与长期持有成本</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MetricCard label="申购/认购费" value={formatRate(fund.feeRuleSummary?.purchaseFeeRate ?? fund.feeRuleSummary?.subscriptionFeeRate ?? fund.feeRate)} note="不同销售平台可能存在折扣，页面先按已采集规则展示。" />
            <MetricCard label="免赎回费门槛" value={fund.redemptionFeeFreeAfterDays ? `${fund.redemptionFeeFreeAfterDays} 天` : "--"} note="长期持有时，这个字段比短期涨跌更接近真实成本。" />
            <MetricCard label="30 天成本" value={formatRate(costAt(fund, 30))} note="适合检查短持是否会被赎回费显著侵蚀。" />
            <MetricCard label="365 天成本" value={formatRate(costAt(fund, 365))} note="适合长期持有候选的横向比较。" />
          </div>
        </div>

        <div className="panel p-6">
          <p className="eyebrow">Data Quality</p>
          <h2 className="mt-2 text-2xl font-semibold">数据质量与缺口</h2>
          <div className="mt-5 space-y-3">
            {qualityNotes.map((item) => (
              <p key={item} className="rounded-xl bg-mist/60 p-4 text-sm leading-6 text-ink/68">
                {item}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Holdings & Rebalance</p>
            <h2 className="mt-2 text-2xl font-semibold">持仓披露与调仓推测</h2>
            <p className="mt-2 text-sm leading-7 text-ink/60">
              持仓来自基金定期报告披露，天然会滞后；调仓方向只能作为复盘线索，不能当作事实结论。
            </p>
          </div>
          <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-pine">
            {holdingView?.holdingFreshness?.label ?? "持仓数据待接入"}
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm font-semibold">{holdingView?.holdingFreshness?.summary ?? "暂未读取到官方披露持仓。"}</p>
            <div className="mt-4 grid gap-2">
              {holdingView?.holdings?.length ? (
                holdingView.holdings.slice(0, 10).map((item) => (
                  <div key={`${item.reportPeriod}-${item.holdingName}`} className="flex items-center justify-between gap-4 rounded-lg bg-mist/60 px-3 py-2 text-sm">
                    <span className="font-medium">{item.holdingName}</span>
                    <span className="text-ink/60">{item.weightPercent === null || item.weightPercent === undefined ? "占比待补" : `${item.weightPercent.toFixed(2)}%`}</span>
                  </div>
                ))
              ) : (
                <p className="rounded-xl bg-mist/60 p-4 text-sm leading-6 text-ink/60">暂无官方披露持仓。后续接入定期报告或更稳定数据源后，会展示报告期、披露日和前十大持仓占比。</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm font-semibold">调仓推测线索</p>
            <div className="mt-4 space-y-3">
              {holdingView?.rebalanceInference?.length ? (
                holdingView.rebalanceInference.map((item) => (
                  <div key={item.label} className="rounded-lg bg-mist/60 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{item.label}</span>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-pine">置信度 {item.confidence}</span>
                    </div>
                    <p className="mt-2 leading-6 text-ink/65">{item.evidence}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-xl bg-mist/60 p-4 text-sm leading-6 text-ink/60">调仓推测需要持仓披露、主题行情与净值走势共同支持；当前证据不足，先不做方向判断。</p>
              )}
            </div>
            <p className="mt-4 text-xs leading-6 text-ink/55">
              {holdingView?.disclaimer ?? "调仓推测仅用于复盘，不代表基金经理真实交易，也不构成投资建议。"}
            </p>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <p className="eyebrow">Peer Compare</p>
        <h2 className="mt-2 text-2xl font-semibold">同主题候选对照</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {sameThemeFunds.length ? (
            sameThemeFunds.map((item) => (
              <Link key={item.fundCode} href={`/funds/${encodeURIComponent(item.fundCode)}`} className="rounded-2xl bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.fundName}</p>
                    <p className="mt-1 text-xs text-ink/55">{item.fundCode} / {item.fundType}</p>
                  </div>
                  <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-pine">详情</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <MiniMetric label="昨日" value={percent(item.return1d)} />
                  <MiniMetric label="近 3 月" value={percent(item.return3m)} />
                  <MiniMetric label="回撤" value={percent(item.maxDrawdown)} />
                </div>
              </Link>
            ))
          ) : (
            <p className="rounded-xl bg-mist/60 p-4 text-sm leading-6 text-ink/60">当前同主题基金样本不足。可以回到基金发现页继续搜索真实基金并加入采集池。</p>
          )}
        </div>
      </section>

      <RiskDisclaimer compact />
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-ink/10">
      <p className="text-sm text-ink/55">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-2 text-xs leading-5 text-ink/52">{note}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-mist/60 p-3">
      <p className="text-xs text-ink/52">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
