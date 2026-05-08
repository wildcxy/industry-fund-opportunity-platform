"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { RiskDisclaimer } from "@/components/risk-disclaimer";
import { formatRate } from "@/lib/format";
import { STORAGE_KEYS, readCompareItems, readJsonArray, writeJsonArray } from "@/lib/storage";
import { FundCompareItem, HoldingCostScenario } from "@/types";

type CompareApiResponse = {
  snapshot?: {
    items?: FundCompareItem[];
  };
};

const COST_HORIZONS = [30, 365, 730];

function getHoldingCost(item: FundCompareItem, holdingDays: number): HoldingCostScenario | undefined {
  return item.holdingCostSummary?.find((scenario) => scenario.holdingDays === holdingDays);
}

function getCoreFeeRate(item: FundCompareItem) {
  return item.feeRule?.purchaseFeeRate ?? item.feeRule?.subscriptionFeeRate ?? item.feeRate ?? null;
}

export default function ComparePage() {
  const [rows, setRows] = useState<FundCompareItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      const ids = readJsonArray(STORAGE_KEYS.compare).slice(0, 4);

      if (ids.length === 0) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`/api/compare?ids=${encodeURIComponent(ids.join(","))}`, {
          cache: "no-store"
        });
        const payload = (await response.json()) as CompareApiResponse;
        const items = payload.snapshot?.items ?? [];

        if (!cancelled) {
          setRows(items);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setRows(readCompareItems());
          setLoading(false);
        }
      }
    }

    loadRows();

    return () => {
      cancelled = true;
    };
  }, []);

  function clearAll() {
    writeJsonArray(STORAGE_KEYS.compare, []);
    setRows([]);
  }

  const summaryCards = useMemo(
    () =>
      rows.map((fund) => ({
        fundId: fund.fundId,
        title: fund.fundName,
        metrics: [
          { label: "昨日涨跌", value: formatRate(fund.returnMetrics.day1, 1) },
          { label: "近 1 月", value: formatRate(fund.returnMetrics.month1, 1) },
          { label: "近 3 月", value: formatRate(fund.returnMetrics.month3, 1) },
          { label: "近 6 月", value: formatRate(fund.returnMetrics.month6, 1) },
          { label: "最大回撤", value: formatRate(fund.riskMetrics.maxDrawdown, 1) },
          { label: "波动率", value: formatRate(fund.riskMetrics.volatility, 1) }
        ]
      })),
    [rows]
  );

  return (
    <div className="space-y-8">
      <section className="panel p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Fund Compare</p>
            <h1 className="mt-2 text-4xl font-semibold">基金对比页</h1>
            <p className="mt-4 max-w-3xl leading-8 text-ink/70">
              这一版已经把长期持有成本接进来了。现在除了收益、回撤和波动率，我们还能横向看申购费、赎回规则，以及
              30 天、1 年、2 年三个持有周期下的相对成本差异。
            </p>
          </div>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            清空对比池
          </button>
        </div>
      </section>

      {loading ? (
        <div className="panel p-10 text-center">
          <p className="text-lg font-semibold">正在加载对比数据</p>
          <p className="mt-3 text-sm text-ink/65">优先读取后端盘后快照，异常时再回退到本地演示数据。</p>
        </div>
      ) : rows.length < 2 ? (
        <div className="panel p-10 text-center">
          <p className="text-lg font-semibold">至少选择 2 只基金再进行对比</p>
          <p className="mt-3 text-sm text-ink/65">可以先去基金发现页挑几只基金放进对比池，然后回到这里做横向比较。</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/funds" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
              前往基金发现
            </Link>
            <Link href="/" className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold">
              返回首页
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.fundId} className="panel p-5">
                <p className="text-lg font-semibold">{card.title}</p>
                <div className="mt-5 space-y-3 text-sm">
                  {card.metrics.map((metric) => (
                    <div key={metric.label} className="flex justify-between gap-4">
                      <span className="text-ink/55">{metric.label}</span>
                      <span className="font-semibold">{metric.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="panel overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-ink text-white">
                  <tr>
                    <th className="px-5 py-4">维度</th>
                    {rows.map((fund) => (
                      <th key={fund.fundId} className="px-5 py-4">
                        {fund.fundName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-ink/10 bg-white">
                    <td className="px-5 py-4 font-semibold">昨日涨跌</td>
                    {rows.map((fund) => (
                      <td key={fund.fundId} className="px-5 py-4">
                        {formatRate(fund.returnMetrics.day1, 1)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-ink/10 bg-white">
                    <td className="px-5 py-4 font-semibold">近 3 月收益</td>
                    {rows.map((fund) => (
                      <td key={fund.fundId} className="px-5 py-4">
                        {formatRate(fund.returnMetrics.month3, 1)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-ink/10 bg-white">
                    <td className="px-5 py-4 font-semibold">最大回撤</td>
                    {rows.map((fund) => (
                      <td key={fund.fundId} className="px-5 py-4">
                        {formatRate(fund.riskMetrics.maxDrawdown, 1)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-ink/10 bg-white">
                    <td className="px-5 py-4 font-semibold">波动率</td>
                    {rows.map((fund) => (
                      <td key={fund.fundId} className="px-5 py-4">
                        {formatRate(fund.riskMetrics.volatility, 1)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-ink/10 bg-white">
                    <td className="px-5 py-4 font-semibold">申购费</td>
                    {rows.map((fund) => (
                      <td key={fund.fundId} className="px-5 py-4">
                        {formatRate(getCoreFeeRate(fund))}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-ink/10 bg-white">
                    <td className="px-5 py-4 font-semibold">30 天持有总成本</td>
                    {rows.map((fund) => (
                      <td key={fund.fundId} className="px-5 py-4">
                        {formatRate(getHoldingCost(fund, 30)?.totalCostRate)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-ink/10 bg-white">
                    <td className="px-5 py-4 font-semibold">1 年持有总成本</td>
                    {rows.map((fund) => (
                      <td key={fund.fundId} className="px-5 py-4">
                        {formatRate(getHoldingCost(fund, 365)?.totalCostRate)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-ink/10 bg-white">
                    <td className="px-5 py-4 font-semibold">2 年持有总成本</td>
                    {rows.map((fund) => (
                      <td key={fund.fundId} className="px-5 py-4">
                        {formatRate(getHoldingCost(fund, 730)?.totalCostRate)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-ink/10 bg-white">
                    <td className="px-5 py-4 font-semibold">赎回规则摘要</td>
                    {rows.map((fund) => (
                      <td key={fund.fundId} className="px-5 py-4 leading-7 text-ink/68">
                        {fund.redemptionRules?.[0]?.ruleText ?? "待补充"}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-white">
                    <td className="px-5 py-4 font-semibold">前十大持仓摘要</td>
                    {rows.map((fund) => (
                      <td key={fund.fundId} className="px-5 py-4 leading-7 text-ink/68">
                        {fund.topHoldings.length > 0 ? fund.topHoldings.join(" / ") : "待补充"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="panel p-6">
              <p className="eyebrow">Long Hold Cost</p>
              <h2 className="mt-2 text-2xl font-semibold">长期持有成本摘要</h2>
              <div className="mt-6 space-y-4">
                {rows.map((fund) => (
                  <div key={fund.fundId} className="rounded-2xl bg-mist/55 p-4">
                    <p className="font-semibold">{fund.fundName}</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      {COST_HORIZONS.map((days) => {
                        const scenario = getHoldingCost(fund, days);
                        return (
                          <div key={days} className="rounded-2xl bg-white p-4 text-sm">
                            <p className="text-ink/55">{days === 365 ? "1 年" : days === 730 ? "2 年" : `${days} 天`}</p>
                            <p className="mt-2 text-lg font-semibold">{formatRate(scenario?.totalCostRate)}</p>
                            <p className="mt-2 text-xs leading-6 text-ink/60">
                              {scenario?.isRedemptionFeeFree ? "已进入免赎回费区间" : "仍包含赎回费影响"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-ink/68">
                      {fund.feeRule?.feeRuleText ?? "当前仅展示结构化成本结果，原始费用说明待补充。"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel p-6">
              <p className="eyebrow">Comparison Insight</p>
              <h2 className="mt-2 text-2xl font-semibold">对比结论提示</h2>
              <div className="mt-6 space-y-4">
                {rows.map((fund) => {
                  const cost30 = getHoldingCost(fund, 30)?.totalCostRate;
                  const cost365 = getHoldingCost(fund, 365)?.totalCostRate;

                  return (
                    <div key={fund.fundId} className="rounded-2xl bg-mist/55 p-4">
                      <p className="font-semibold">{fund.fundName}</p>
                      <p className="mt-3 text-sm leading-7 text-ink/68">
                        {cost30 !== undefined && cost30 !== null && cost30 <= 0.25
                          ? "短于一个月的观察持有成本相对更友好，适合做同主题低成本观察样本。"
                          : "短期持有成本不占优，更适合结合中长期持有场景做比较。"}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-ink/68">
                        {cost365 !== undefined && cost365 !== null && cost365 <= 0.8
                          ? "1 年维度成本压力相对可控，适合放进长期观察清单继续跟踪。"
                          : "1 年维度成本偏高，适合与同主题低费率产品再做一轮比较。"}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-ink/68">
                        当前提示仅用于信息整理与横向比较，不构成投资建议。
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}

      <RiskDisclaimer compact />
    </div>
  );
}
