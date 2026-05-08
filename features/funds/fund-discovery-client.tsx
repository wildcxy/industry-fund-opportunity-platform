"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useMemo, useState } from "react";

import { StorageActionButton } from "@/components/storage-action-button";
import { formatAum, formatPercent, formatRate } from "@/lib/format";
import { buildShortTermReview } from "@/lib/fund-review";
import { STORAGE_KEYS } from "@/lib/storage";
import { FundDiscoveryQueryState, FundHoldingView, FundListItem, FundSearchResult } from "@/types";

type SearchState = "idle" | "loading" | "error" | "ready";
type ActionState = Record<string, "adding" | "collecting" | "done" | "error">;
type HoldingState = Record<string, { loading: boolean; data?: FundHoldingView; error?: string }>;

function toQueryString(state: FundDiscoveryQueryState) {
  const params = new URLSearchParams();

  if (state.theme !== "全部") params.set("theme", state.theme);
  if (state.fundType !== "全部") params.set("fundType", state.fundType);
  if (state.sortKey !== "return3m") params.set("sortKey", state.sortKey);
  if (state.viewMode !== "table") params.set("viewMode", state.viewMode);
  if (state.exchangeOnly) params.set("exchangeOnly", "true");
  if (state.feeBand !== "全部") params.set("feeBand", state.feeBand);
  if (state.aumBand !== "全部") params.set("aumBand", state.aumBand);
  if (state.ageBand !== "全部") params.set("ageBand", state.ageBand);
  if (state.volatilityBand !== "全部") params.set("volatilityBand", state.volatilityBand);
  if (state.fundCompany !== "全部") params.set("fundCompany", state.fundCompany);

  return params.toString();
}

function inFeeBand(fund: FundListItem, feeBand: FundDiscoveryQueryState["feeBand"]) {
  if (feeBand === "全部") return true;
  if (!fund.feeRuleSummary && fund.feeRate === 0) return false;
  if (feeBand === "低费率") return fund.feeRate <= 0.5;
  if (feeBand === "中费率") return fund.feeRate > 0.5 && fund.feeRate <= 0.8;
  return fund.feeRate > 0.8;
}

function inAumBand(fund: FundListItem, aumBand: FundDiscoveryQueryState["aumBand"]) {
  if (aumBand === "全部") return true;
  if (!hasMetric(fund, "aum")) return false;
  if (aumBand === "10亿以下") return fund.aum < 10;
  if (aumBand === "10-50亿") return fund.aum >= 10 && fund.aum <= 50;
  return fund.aum > 50;
}

function inAgeBand(fund: FundListItem, ageBand: FundDiscoveryQueryState["ageBand"]) {
  const years = fund.foundedYears ?? 0;
  if (ageBand === "全部") return true;
  if (!fund.foundedYears) return false;
  if (ageBand === "3年以内") return years <= 3;
  if (ageBand === "3-5年") return years > 3 && years <= 5;
  return years > 5;
}

function inVolatilityBand(fund: FundListItem, volatilityBand: FundDiscoveryQueryState["volatilityBand"]) {
  if (volatilityBand === "全部") return true;
  if (!hasMetric(fund, "volatility")) return false;
  if (volatilityBand === "低波动") return fund.volatility < 20;
  if (volatilityBand === "中波动") return fund.volatility >= 20 && fund.volatility <= 25;
  return fund.volatility > 25;
}

function getHoldingCost(fund: FundListItem, holdingDays: number) {
  return fund.holdingCostSummary?.find((item) => item.holdingDays === holdingDays)?.totalCostRate;
}

function hasMetric(fund: FundListItem, metric: string) {
  if (fund.dataCompleteness === "pending" || fund.dataCompleteness === "failed") return false;
  return !fund.missingMetrics?.includes(metric);
}

function formatFundPercent(fund: FundListItem, metric: "return1d" | "return1m" | "return3m" | "return6m" | "maxDrawdown" | "volatility") {
  const value = fund[metric];
  return hasMetric(fund, metric) && value !== null && value !== undefined ? formatPercent(value) : "--";
}

function formatFundAum(fund: FundListItem) {
  return hasMetric(fund, "aum") && fund.aum > 0 ? formatAum(fund.aum) : "--";
}

function getDataSourceTone(source?: FundListItem["dataSource"]) {
  if (source === "真实快照") return "bg-emerald-50 text-emerald-700";
  if (source === "费用待补充") return "bg-amber-50 text-amber-700";
  if (source === "采集失败") return "bg-rose-50 text-rose-700";
  if (source === "待采集" || source === "采集中") return "bg-sky-50 text-sky-700";
  return "bg-mist text-pine";
}

function getSearchStatusLabel(item: FundSearchResult, action?: ActionState[string]) {
  if (action === "adding") return "添加中";
  if (action === "collecting") return "采集中";
  if (action === "done") return "已触发采集";
  if (action === "error") return "处理失败";
  if (item.candidateStatus === "ready") return "真实快照";
  if (item.candidateStatus === "collecting") return "采集中";
  if (item.candidateStatus === "failed") return "采集失败";
  if (item.isAdded) return "已加入";
  return "未加入";
}

function getThemeSignals(funds: FundListItem[]) {
  const grouped = new Map<string, number[]>();
  funds.forEach((fund) => {
    if (!hasMetric(fund, "return3m")) return;
    grouped.set(fund.theme, [...(grouped.get(fund.theme) ?? []), fund.return3m]);
  });

  const signals = new Map<string, { label: string; tone: string }>();
  grouped.forEach((values, theme) => {
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    if (average >= 10) {
      signals.set(theme, { label: "主题短期强势", tone: "bg-emerald-50 text-emerald-700" });
    } else if (average <= -10) {
      signals.set(theme, { label: "主题回撤明显", tone: "bg-rose-50 text-rose-700" });
    }
  });
  return signals;
}

function getFundSignals(fund: FundListItem, themeSignal?: { label: string; tone: string }) {
  const signals: Array<{ label: string; tone: string }> = [];
  const shortTermReview = buildShortTermReview(fund);

  if (fund.dataCompleteness === "pending") {
    signals.push({ label: "待采集", tone: "bg-sky-50 text-sky-700" });
  } else if (fund.dataCompleteness === "failed") {
    signals.push({ label: "采集失败", tone: "bg-rose-50 text-rose-700" });
  } else if (fund.dataCompleteness === "partial") {
    signals.push({ label: "数据待补全", tone: "bg-amber-50 text-amber-700" });
  }

  if (shortTermReview.level !== "low") {
    signals.push({ label: shortTermReview.badgeLabel, tone: shortTermReview.toneClass });
  }
  if (hasMetric(fund, "return1m") && fund.return1m >= 5) {
    signals.push({ label: "近1月强势", tone: "bg-emerald-50 text-emerald-700" });
  }
  if (hasMetric(fund, "return3m") && fund.return3m >= 10) {
    signals.push({ label: "近3月强势", tone: "bg-emerald-50 text-emerald-700" });
  }
  if (
    hasMetric(fund, "return3m") &&
    hasMetric(fund, "maxDrawdown") &&
    hasMetric(fund, "aum") &&
    fund.return3m > -5 &&
    fund.maxDrawdown > -18 &&
    fund.aum >= 1 &&
    fund.feeRate <= 0.8
  ) {
    signals.push({ label: "长期候选", tone: "bg-teal-50 text-teal-700" });
  }
  if (hasMetric(fund, "maxDrawdown") && fund.maxDrawdown <= -20) {
    signals.push({ label: "回撤较深", tone: "bg-rose-50 text-rose-700" });
  }
  if (hasMetric(fund, "aum") && fund.aum > 0 && fund.aum < 1) {
    signals.push({ label: "规模偏小", tone: "bg-amber-50 text-amber-700" });
  }
  if (!fund.feeRuleSummary && fund.dataSource !== "演示样例") {
    signals.push({ label: "费率待核", tone: "bg-amber-50 text-amber-700" });
  }
  if (themeSignal) {
    signals.push(themeSignal);
  }

  return signals.slice(0, 4);
}

function sortableValue(fund: FundListItem, key: FundDiscoveryQueryState["sortKey"]) {
  if (key === "feeRate") {
    return fund.feeRuleSummary || fund.feeRate > 0 ? fund.feeRate : Number.POSITIVE_INFINITY;
  }
  if (key === "aum") return hasMetric(fund, "aum") ? fund.aum : Number.NEGATIVE_INFINITY;
  if (key === "maxDrawdown") return hasMetric(fund, "maxDrawdown") ? fund.maxDrawdown : Number.NEGATIVE_INFINITY;
  const value = fund[key];
  return hasMetric(fund, key) && value !== null && value !== undefined ? value : Number.NEGATIVE_INFINITY;
}

function getFundObservationText(fund: FundListItem) {
  if (fund.dataCompleteness === "pending") return "已加入候选池，等待采集真实净值与风险收益指标。";
  if (fund.dataCompleteness === "failed") return "最近一次采集失败，建议重新触发采集或稍后重试。";
  if (fund.dataCompleteness === "partial") return "已有部分真实指标，但仍有字段缺失；适合先观察，不适合直接比较成本。";
  if (hasMetric(fund, "return3m") && fund.return3m >= 10) return "短期表现较强，适合高亮观察，但需要结合回撤、估值和拥挤度判断。";
  if (hasMetric(fund, "maxDrawdown") && fund.maxDrawdown <= -20) return "回撤较深，可能存在左侧观察价值，也可能代表趋势仍弱，需要结合行业基本面。";
  return fund.feeRuleSummary?.feeRuleText ?? "用于长期观察时，应同时比较费率、回撤、波动、规模和主题代表性。";
}

function getVisibleEstimate(funds: FundListItem[]) {
  const withDayReturn = funds.filter((fund) => hasMetric(fund, "return1d") && fund.return1d !== null && fund.return1d !== undefined);
  const average = withDayReturn.length ? withDayReturn.reduce((sum, fund) => sum + (fund.return1d ?? 0), 0) / withDayReturn.length : null;
  const risingCount = withDayReturn.filter((fund) => (fund.return1d ?? 0) > 0).length;
  const fallingCount = withDayReturn.filter((fund) => (fund.return1d ?? 0) < 0).length;
  const strongest = [...withDayReturn].sort((left, right) => (right.return1d ?? 0) - (left.return1d ?? 0))[0];
  const weakest = [...withDayReturn].sort((left, right) => (left.return1d ?? 0) - (right.return1d ?? 0))[0];
  const navDates = withDayReturn
    .map((fund) => fund.latestNavDate ?? fund.metricTradeDate)
    .filter((value): value is string => Boolean(value));
  const uniqueDates = [...new Set(navDates)].sort();
  const latestDate = uniqueDates.at(-1) ?? null;
  const earliestDate = uniqueDates[0] ?? null;
  const dateLabel = latestDate ? (earliestDate && earliestDate !== latestDate ? `${earliestDate} 至 ${latestDate}` : latestDate) : "暂无披露日期";

  return {
    average,
    coverage: funds.length ? Math.round((withDayReturn.length / funds.length) * 100) : 0,
    risingCount,
    fallingCount,
    strongest,
    weakest,
    latestDate,
    dateLabel
  };
}

function formatEstimatePercent(value: number | null) {
  return value === null ? "--" : formatPercent(value);
}

export function FundDiscoveryClient({
  funds,
  queryState
}: {
  funds: FundListItem[];
  queryState: FundDiscoveryQueryState;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [fundQuery, setFundQuery] = useState("嘉实全球产业升级");
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState<FundSearchResult[]>([]);
  const [actionState, setActionState] = useState<ActionState>({});
  const [expandedHoldingCode, setExpandedHoldingCode] = useState<string | null>(null);
  const [holdingState, setHoldingState] = useState<HoldingState>({});
  const [isRefreshingVisible, setIsRefreshingVisible] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");

  const themes = useMemo(
    () => ["全部", ...Array.from(new Set(funds.flatMap((fund) => fund.themeAliases?.length ? fund.themeAliases : [fund.theme])))],
    [funds]
  );
  const companies = useMemo(
    () => ["全部", ...Array.from(new Set(funds.map((fund) => fund.fundCompany).filter(Boolean) as string[]))],
    [funds]
  );

  function updateQuery<K extends keyof FundDiscoveryQueryState>(key: K, value: FundDiscoveryQueryState[K]) {
    const nextState = { ...queryState, [key]: value };
    const query = toQueryString(nextState);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function clearFilters() {
    router.replace(pathname, { scroll: false });
  }

  async function searchRealFunds() {
    const query = fundQuery.trim();
    if (!query) return;

    setSearchState("loading");
    setSearchError("");

    try {
      const response = await fetch(`/api/funds/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? "真实基金搜索失败");
      }
      setSearchResults(payload.items ?? []);
      setSearchState("ready");
    } catch (error) {
      setSearchState("error");
      setSearchError(error instanceof Error ? error.message : "真实基金搜索失败");
      setSearchResults([]);
    }
  }

  async function addAndCollectFund(item: FundSearchResult) {
    setActionState((current) => ({ ...current, [item.fundCode]: "adding" }));

    try {
      const addResponse = await fetch("/api/funds/candidates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fundCode: item.fundCode,
          fundName: item.fundName,
          fundType: item.fundType,
          fundCompany: item.fundCompany,
          theme: "自选基金",
          trackingTarget: item.fundName,
          query: fundQuery
        })
      });
      const addPayload = await addResponse.json();
      if (!addResponse.ok) {
        throw new Error(addPayload.message ?? "添加候选基金失败");
      }

      setActionState((current) => ({ ...current, [item.fundCode]: "collecting" }));
      const collectResponse = await fetch(`/api/funds/${encodeURIComponent(item.fundCode)}/collect`, { method: "POST" });
      const collectPayload = await collectResponse.json();
      if (!collectResponse.ok) {
        throw new Error(collectPayload.detail ?? collectPayload.message ?? "真实数据采集失败");
      }

      setActionState((current) => ({ ...current, [item.fundCode]: "done" }));
      router.refresh();
      await searchRealFunds();
    } catch (error) {
      setActionState((current) => ({ ...current, [item.fundCode]: "error" }));
      setSearchError(error instanceof Error ? error.message : "真实基金添加或采集失败");
    }
  }

  async function collectListedFund(fund: FundListItem) {
    setActionState((current) => ({ ...current, [fund.fundCode]: "collecting" }));

    try {
      const response = await fetch(`/api/funds/${encodeURIComponent(fund.fundCode)}/collect`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail ?? payload.message ?? "真实数据采集失败");
      }
      setActionState((current) => ({ ...current, [fund.fundCode]: "done" }));
      router.refresh();
    } catch (error) {
      setActionState((current) => ({ ...current, [fund.fundCode]: "error" }));
      setSearchError(error instanceof Error ? error.message : "真实基金采集失败");
    }
  }

  async function refreshVisibleFunds() {
    const fundCodes = filteredFunds.map((fund) => fund.fundCode).filter(Boolean);
    if (!fundCodes.length) {
      setRefreshMessage("当前筛选结果里没有可刷新的基金。");
      return;
    }

    setIsRefreshingVisible(true);
    setRefreshMessage(`正在刷新当前结果中的 ${Math.min(fundCodes.length, 30)} 只基金，后端会逐只拉取最新盘后快照。`);
    try {
      const response = await fetch("/api/funds/refresh-visible", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fundCodes })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? payload.detail ?? "刷新当前基金失败");
      }
      setRefreshMessage(
        payload.failedCount
          ? `刷新完成：成功 ${payload.successCount} 只，失败 ${payload.failedCount} 只。失败项可稍后重试，避免接口反爬限制。`
          : `刷新完成：已更新 ${payload.successCount} 只基金。若昨日涨跌仍为空，通常表示净值接口尚未披露或历史点不足。`
      );
      router.refresh();
    } catch (error) {
      setRefreshMessage(error instanceof Error ? error.message : "刷新当前基金失败");
    } finally {
      setIsRefreshingVisible(false);
    }
  }

  async function toggleHoldings(fund: FundListItem) {
    if (expandedHoldingCode === fund.fundCode) {
      setExpandedHoldingCode(null);
      return;
    }

    setExpandedHoldingCode(fund.fundCode);
    if (holdingState[fund.fundCode]?.data || holdingState[fund.fundCode]?.loading) return;

    setHoldingState((current) => ({ ...current, [fund.fundCode]: { loading: true } }));
    try {
      const response = await fetch(`/api/funds/${encodeURIComponent(fund.fundCode)}/holdings`, { cache: "no-store" });
      const payload = (await response.json()) as FundHoldingView;
      if (!response.ok) {
        throw new Error(payload.disclaimer ?? "持仓数据读取失败");
      }
      setHoldingState((current) => ({ ...current, [fund.fundCode]: { loading: false, data: payload } }));
    } catch (error) {
      setHoldingState((current) => ({
        ...current,
        [fund.fundCode]: { loading: false, error: error instanceof Error ? error.message : "持仓数据读取失败" }
      }));
    }
  }

  const filteredFunds = useMemo(() => {
    const next = funds.filter((fund) => {
      const byTheme = queryState.theme === "全部" ? true : fund.theme === queryState.theme || fund.themeAliases?.includes(queryState.theme);
      const byType = queryState.fundType === "全部" ? true : fund.fundType === queryState.fundType;
      const byExchange = queryState.exchangeOnly ? fund.tradableOnExchange : true;
      const byFee = inFeeBand(fund, queryState.feeBand);
      const byAum = inAumBand(fund, queryState.aumBand);
      const byAge = inAgeBand(fund, queryState.ageBand);
      const byVolatility = inVolatilityBand(fund, queryState.volatilityBand);
      const byCompany = queryState.fundCompany === "全部" ? true : fund.fundCompany === queryState.fundCompany;
      return byTheme && byType && byExchange && byFee && byAum && byAge && byVolatility && byCompany;
    });

    return [...next].sort((left, right) => {
      if (queryState.sortKey === "feeRate") {
        return sortableValue(left, queryState.sortKey) - sortableValue(right, queryState.sortKey);
      }

      if (queryState.sortKey === "maxDrawdown") {
        return sortableValue(right, queryState.sortKey) - sortableValue(left, queryState.sortKey);
      }

      return sortableValue(right, queryState.sortKey) - sortableValue(left, queryState.sortKey);
    });
  }, [funds, queryState]);
  const themeSignals = useMemo(() => getThemeSignals(funds), [funds]);
  const visibleEstimate = useMemo(() => getVisibleEstimate(filteredFunds), [filteredFunds]);

  return (
    <div className="space-y-8">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="flex-1 text-sm font-medium text-ink/80">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">真实基金搜索</span>
            <input
              value={fundQuery}
              onChange={(event) => setFundQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void searchRealFunds();
              }}
              placeholder="输入基金名称或代码，例如 嘉实全球产业升级 / 南方北证50 / 017731"
              className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => void searchRealFunds()}
            disabled={searchState === "loading"}
            className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {searchState === "loading" ? "搜索中" : "搜索真实基金"}
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-mist/60 p-4 text-sm leading-7 text-ink/68">
          搜索结果来自 AKShare 基金目录。添加后会进入本机真实采集池，并尝试立即拉取主数据和日度指标；费用、赎回规则等字段若暂时缺失，会标记为待补充。
        </div>

        <div className="mt-3 rounded-xl border border-ink/10 bg-white p-4 text-sm leading-7 text-ink/68">
          标记口径：短期强势只代表近 1 月或近 3 月表现突出；主题回撤明显代表同主题候选池近 3 月平均跌幅较大；这些都是观察线索，不等于买入建议。
        </div>

        {searchError ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{searchError}</p> : null}

        {searchState === "ready" ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {searchResults.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink/15 p-5 text-sm text-ink/60">
                没有找到匹配基金。可以尝试输入基金代码，或换一个更短的关键词。
              </div>
            ) : (
              searchResults.map((item) => {
                const action = actionState[item.fundCode];
                const disabled = action === "adding" || action === "collecting";
                return (
                  <article key={item.fundCode} className="rounded-xl border border-ink/10 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.fundName}</p>
                        <p className="mt-1 text-xs text-ink/55">
                          {item.fundCode} / {item.fundType || "公募基金"} / {item.fundCompany || "基金公司待确认"}
                        </p>
                      </div>
                      <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-pine">
                        {getSearchStatusLabel(item, action)}
                      </span>
                    </div>
                    {item.lastErrorMessage ? <p className="mt-3 text-xs text-rose-700">{item.lastErrorMessage}</p> : null}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void addAndCollectFund(item)}
                      className="mt-4 rounded-full bg-pine px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {item.isAdded || action === "done" ? "重新触发采集" : "添加并采集"}
                    </button>
                  </article>
                );
              })
            )}
          </div>
        ) : null}
      </section>

      <section className="panel p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="rounded-xl bg-mist/70 p-4 text-sm font-medium text-ink/80">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">行业主题</span>
            <select
              value={queryState.theme}
              onChange={(event) => updateQuery("theme", event.target.value)}
              className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 outline-none"
            >
              {themes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="rounded-xl bg-mist/70 p-4 text-sm font-medium text-ink/80">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">基金类型</span>
            <select
              value={queryState.fundType}
              onChange={(event) => updateQuery("fundType", event.target.value as FundDiscoveryQueryState["fundType"])}
              className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 outline-none"
            >
              <option value="全部">全部</option>
              <option value="ETF">ETF</option>
              <option value="联接基金">联接基金</option>
              <option value="QDII">QDII</option>
              <option value="主动基金">主动基金</option>
            </select>
          </label>

          <label className="rounded-xl bg-mist/70 p-4 text-sm font-medium text-ink/80">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">排序方式</span>
            <select
              value={queryState.sortKey}
              onChange={(event) => updateQuery("sortKey", event.target.value as FundDiscoveryQueryState["sortKey"])}
              className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 outline-none"
            >
              <option value="return3m">按近 3 月收益</option>
              <option value="return1d">按昨日涨跌</option>
              <option value="return1m">按近 1 月收益</option>
              <option value="aum">按管理规模</option>
              <option value="feeRate">按费率</option>
              <option value="maxDrawdown">按最大回撤</option>
            </select>
          </label>

          <label className="rounded-xl bg-mist/70 p-4 text-sm font-medium text-ink/80">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">费率区间</span>
            <select
              value={queryState.feeBand}
              onChange={(event) => updateQuery("feeBand", event.target.value as FundDiscoveryQueryState["feeBand"])}
              className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 outline-none"
            >
              <option value="全部">全部</option>
              <option value="低费率">低费率</option>
              <option value="中费率">中费率</option>
              <option value="高费率">高费率</option>
            </select>
          </label>

          <label className="flex rounded-xl bg-mist/70 p-4 text-sm font-medium text-ink/80">
            <span className="mr-auto">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">场内交易</span>
              仅显示场内可交易基金
            </span>
            <input
              type="checkbox"
              checked={queryState.exchangeOnly}
              onChange={(event) => updateQuery("exchangeOnly", event.target.checked)}
              className="mt-1 h-5 w-5 accent-pine"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterSelect label="规模区间" value={queryState.aumBand} onChange={(value) => updateQuery("aumBand", value as FundDiscoveryQueryState["aumBand"])} options={["全部", "10亿以下", "10-50亿", "50亿以上"]} />
          <FilterSelect label="成立年限" value={queryState.ageBand} onChange={(value) => updateQuery("ageBand", value as FundDiscoveryQueryState["ageBand"])} options={["全部", "3年以内", "3-5年", "5年以上"]} />
          <FilterSelect label="波动率" value={queryState.volatilityBand} onChange={(value) => updateQuery("volatilityBand", value as FundDiscoveryQueryState["volatilityBand"])} options={["全部", "低波动", "中波动", "高波动"]} />
          <FilterSelect label="基金公司" value={queryState.fundCompany} onChange={(value) => updateQuery("fundCompany", value)} options={companies} />
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-ink/60">
          <span>结果数量：{filteredFunds.length}</span>
          <span>当前主题：{queryState.theme}</span>
          <span>排序口径：{queryState.sortKey}</span>
          <span>状态恢复：{searchParams.toString() ? "来自 URL 查询参数" : "默认状态"}</span>
          {searchParams.toString() ? (
            <button type="button" onClick={clearFilters} className="font-semibold text-pine underline-offset-4 hover:underline">
              清空筛选并查看全部
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void refreshVisibleFunds()}
            disabled={isRefreshingVisible}
            className="rounded-full bg-pine px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshingVisible ? "刷新中..." : "刷新当前结果最新数据"}
          </button>
          <div className="ml-auto flex rounded-full border border-ink/10 bg-white p-1">
            <button
              type="button"
              onClick={() => updateQuery("viewMode", "table")}
              className={`rounded-full px-3 py-1 font-semibold ${queryState.viewMode === "table" ? "bg-ink text-white" : "text-ink/65"}`}
            >
              表格视图
            </button>
            <button
              type="button"
              onClick={() => updateQuery("viewMode", "card")}
              className={`rounded-full px-3 py-1 font-semibold ${queryState.viewMode === "card" ? "bg-ink text-white" : "text-ink/65"}`}
            >
              卡片视图
            </button>
          </div>
        </div>
        {refreshMessage ? (
          <p className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-ink/65 ring-1 ring-ink/10">{refreshMessage}</p>
        ) : null}
      </section>

      {filteredFunds.length === 0 ? (
        <section className="panel p-10 text-center">
          <p className="text-lg font-semibold">当前筛选条件下暂无匹配基金</p>
          <p className="mt-3 text-sm text-ink/65">可以先搜索真实基金添加到采集池，或放宽行业、基金类型、费率区间。</p>
        </section>
      ) : queryState.viewMode === "table" ? (
        <>
        <section className="panel p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="eyebrow">Theme Estimate</p>
              <h2 className="mt-2 text-2xl font-semibold">当前主题昨日估值</h2>
              <p className="mt-2 text-sm leading-7 text-ink/60">
                这里按当前筛选结果中已披露的最新净值日增长率聚合；当前可用净值日为 {visibleEstimate.dateLabel}。如果今天盘后净值尚未披露，系统会自动使用数据源中上一条已披露净值，不再固定写死某一天。
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshVisibleFunds()}
              disabled={isRefreshingVisible}
              className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefreshingVisible ? "拉取中..." : "拉取当前主题最新涨跌"}
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            <MetricTile label="平均昨日涨跌" value={formatEstimatePercent(visibleEstimate.average)} />
            <MetricTile label="净值披露日" value={visibleEstimate.latestDate ?? "--"} />
            <MetricTile label="数据覆盖" value={`${visibleEstimate.coverage}%`} />
            <MetricTile label="上涨 / 下跌" value={`${visibleEstimate.risingCount} / ${visibleEstimate.fallingCount}`} />
            <MetricTile
              label="最强 / 最弱"
              value={`${visibleEstimate.strongest ? formatFundPercent(visibleEstimate.strongest, "return1d") : "--"} / ${visibleEstimate.weakest ? formatFundPercent(visibleEstimate.weakest, "return1d") : "--"}`}
            />
          </div>
        </section>
        <section className="panel overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-ink text-white">
                <tr>
                  <th className="px-5 py-4">基金</th>
                  <th className="px-5 py-4">主题</th>
                  <th className="px-5 py-4">昨日涨跌</th>
                  <th className="px-5 py-4">近 3 月</th>
                  <th className="px-5 py-4">最大回撤</th>
                  <th className="px-5 py-4">规模</th>
                  <th className="px-5 py-4">申购费</th>
                  <th className="px-5 py-4">30 天成本</th>
                  <th className="px-5 py-4">1 年成本</th>
                  <th className="px-5 py-4">动作</th>
                </tr>
              </thead>
              <tbody>
                {filteredFunds.map((fund) => (
                  <Fragment key={fund.fundId}>
                  <tr className="border-b border-ink/10 bg-white">
                    <td className="px-5 py-4">
                      <p className="font-semibold">{fund.fundName}</p>
                      <p className="mt-1 text-xs text-ink/55">
                        {fund.fundCode} / {fund.fundType} / {fund.trackingTarget}
                      </p>
                      <p className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getDataSourceTone(fund.dataSource)}`}>
                        {fund.dataSource ?? "演示样例"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {getFundSignals(fund, themeSignals.get(fund.theme)).map((signal) => (
                          <span key={signal.label} className={`rounded-full px-2 py-1 text-[11px] font-semibold ${signal.tone}`}>
                            {signal.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">{fund.theme}</td>
                    <td className={`px-5 py-4 font-semibold ${(fund.return1d ?? 0) >= 0 ? "text-pine" : "text-rose-700"}`}>
                      {formatFundPercent(fund, "return1d")}
                    </td>
                    <td className="px-5 py-4">{formatFundPercent(fund, "return3m")}</td>
                    <td className="px-5 py-4">{formatFundPercent(fund, "maxDrawdown")}</td>
                    <td className="px-5 py-4">{formatFundAum(fund)}</td>
                    <td className="px-5 py-4">
                      {formatRate(fund.feeRuleSummary?.purchaseFeeRate ?? fund.feeRuleSummary?.subscriptionFeeRate ?? fund.feeRate)}
                    </td>
                    <td className="px-5 py-4">{formatRate(getHoldingCost(fund, 30))}</td>
                    <td className="px-5 py-4">{formatRate(getHoldingCost(fund, 365))}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {fund.dataCompleteness === "pending" || fund.dataCompleteness === "failed" ? (
                          <button
                            type="button"
                            onClick={() => void collectListedFund(fund)}
                            disabled={actionState[fund.fundCode] === "collecting"}
                            className="rounded-full bg-pine px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionState[fund.fundCode] === "collecting" ? "采集中" : "触发采集"}
                          </button>
                        ) : null}
                        <StorageActionButton storageKey={STORAGE_KEYS.compare} itemId={fund.fundId} idleLabel="加入对比" activeLabel="已加入对比" maxItems={4} />
                        <StorageActionButton storageKey={STORAGE_KEYS.watchlist} itemId={fund.fundId} idleLabel="加入观察" activeLabel="已加入观察" />
                        <button
                          type="button"
                          onClick={() => void toggleHoldings(fund)}
                          className="rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-semibold"
                        >
                          {expandedHoldingCode === fund.fundCode ? "收起持仓" : "持仓/调仓"}
                        </button>
                        <Link
                          href={`/funds/${encodeURIComponent(fund.fundCode)}`}
                          className="rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-semibold"
                        >
                          详情复盘
                        </Link>
                      </div>
                    </td>
                  </tr>
                  {expandedHoldingCode === fund.fundCode ? (
                    <tr className="border-b border-ink/10 bg-mist/40">
                        <td colSpan={10} className="px-5 py-5">
                        <HoldingInsightPanel state={holdingState[fund.fundCode]} />
                      </td>
                    </tr>
                  ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        </>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {filteredFunds.map((fund) => (
            <article key={fund.fundId} className="panel p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{fund.fundName}</h3>
                  <p className="mt-1 text-sm text-ink/58">
                    {fund.fundCode} / {fund.fundType} / {fund.trackingTarget}
                  </p>
                  <p className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getDataSourceTone(fund.dataSource)}`}>
                    {fund.dataSource ?? "演示样例"}
                  </p>
                </div>
                <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-pine">{fund.theme}</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <MetricTile label="昨日涨跌 / 近 1 月" value={`${formatFundPercent(fund, "return1d")} / ${formatFundPercent(fund, "return1m")}`} />
                <MetricTile label="近 3 月 / 近 6 月" value={`${formatFundPercent(fund, "return3m")} / ${formatFundPercent(fund, "return6m")}`} />
                <MetricTile label="回撤 / 波动率" value={`${formatFundPercent(fund, "maxDrawdown")} / ${formatFundPercent(fund, "volatility")}`} />
                <MetricTile label="30 天 / 1 年成本" value={`${formatRate(getHoldingCost(fund, 30))} / ${formatRate(getHoldingCost(fund, 365))}`} />
                <MetricTile label="免赎回费门槛" value={fund.redemptionFeeFreeAfterDays ? `${fund.redemptionFeeFreeAfterDays} 天` : "待补充"} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {getFundSignals(fund, themeSignals.get(fund.theme)).map((signal) => (
                  <span key={signal.label} className={`rounded-full px-3 py-1 text-xs font-semibold ${signal.tone}`}>
                    {signal.label}
                  </span>
                ))}
                {fund.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-pine">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-ink/68">
                {getFundObservationText(fund)}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {fund.dataCompleteness === "pending" || fund.dataCompleteness === "failed" ? (
                  <button
                    type="button"
                    onClick={() => void collectListedFund(fund)}
                    disabled={actionState[fund.fundCode] === "collecting"}
                    className="rounded-full bg-pine px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionState[fund.fundCode] === "collecting" ? "采集中" : "触发采集"}
                  </button>
                ) : null}
                <StorageActionButton storageKey={STORAGE_KEYS.compare} itemId={fund.fundId} idleLabel="加入对比" activeLabel="已加入对比" maxItems={4} />
                <StorageActionButton storageKey={STORAGE_KEYS.watchlist} itemId={fund.fundId} idleLabel="加入观察" activeLabel="已加入观察" />
                <button
                  type="button"
                  onClick={() => void toggleHoldings(fund)}
                  className="rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-semibold"
                >
                  {expandedHoldingCode === fund.fundCode ? "收起持仓" : "持仓/调仓"}
                </button>
                <Link
                  href={`/funds/${encodeURIComponent(fund.fundCode)}`}
                  className="rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-semibold"
                >
                  详情复盘
                </Link>
              </div>
              {expandedHoldingCode === fund.fundCode ? <HoldingInsightPanel state={holdingState[fund.fundCode]} /> : null}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function HoldingInsightPanel({ state }: { state?: HoldingState[string] }) {
  if (!state || state.loading) {
    return <p className="text-sm text-ink/60">正在读取持仓与调仓推测...</p>;
  }

  if (state.error) {
    return <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{state.error}</p>;
  }

  const data = state.data;
  if (!data) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-xl bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">官方披露持仓</p>
            <p className="mt-1 text-xs text-ink/55">{data.holdingFreshness?.summary ?? "持仓披露数据待接入。"}</p>
          </div>
          <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-pine">
            {data.holdingFreshness?.label ?? "待接入"}
          </span>
        </div>
        <div className="mt-4 grid gap-2">
          {data.holdings.length === 0 ? (
            <p className="text-sm text-ink/60">暂无官方披露持仓。后续接入基金定期报告后会展示报告期、披露日和占比。</p>
          ) : (
            data.holdings.slice(0, 10).map((item) => (
              <div key={`${item.reportPeriod}-${item.holdingName}`} className="flex items-center justify-between gap-4 rounded-lg bg-mist/60 px-3 py-2 text-sm">
                <span className="font-medium">{item.holdingName}</span>
                <span className="text-ink/60">{item.weightPercent === null || item.weightPercent === undefined ? "占比待补" : `${item.weightPercent.toFixed(2)}%`}</span>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="rounded-xl bg-white p-4">
        <p className="text-sm font-semibold">调仓方向推测</p>
        <div className="mt-4 space-y-3">
          {data.rebalanceInference.map((item) => (
            <div key={item.label} className="rounded-lg bg-mist/60 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{item.label}</span>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-pine">置信度 {item.confidence}</span>
              </div>
              <p className="mt-2 leading-6 text-ink/65">{item.evidence}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-6 text-ink/55">{data.disclaimer}</p>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-xl bg-mist/70 p-4 text-sm font-medium text-ink/80">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 outline-none">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-mist/65 p-4">
      <p className="text-ink/55">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}
