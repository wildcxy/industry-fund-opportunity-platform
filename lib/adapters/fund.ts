import { fetchBackendJson } from "@/lib/backend-api";
import { compareItems, funds } from "@/mock/data";
import { FundCompareItem, FundDiscoveryQueryState, FundListItem } from "@/types";

type FundsResponse = {
  snapshot?: {
    items?: Array<Partial<FundListItem>>;
  };
};

function normalizeFundType(rawType: string | undefined, trackingTarget?: string): FundListItem["fundType"] {
  const value = (rawType ?? "").toUpperCase();
  const target = (trackingTarget ?? "").toUpperCase();

  if (value.includes("QDII") || target.includes("纳斯达克") || target.includes("标普") || target.includes("全球")) {
    return "QDII";
  }
  if (value.includes("ETF")) {
    return "ETF";
  }
  if (value.includes("联接")) {
    return "联接基金";
  }

  return "主动基金";
}

function buildFallbackFundList(theme?: string): FundListItem[] {
  return (theme ? funds.filter((fund) => fund.theme === theme) : funds).map((fund) => ({
    ...fund,
    dataSource: "演示样例"
  }));
}

function withFundTags(fund: FundListItem): FundListItem {
  const fallback = funds.find((item) => item.fundId === fund.fundId);

  return {
    ...fund,
    tags:
      fallback?.tags ??
      [
        fund.tradableOnExchange ? "场内可交易" : "场外观察",
        fund.fundType === "ETF"
          ? "指数表达"
          : fund.fundType === "联接基金"
            ? "联接配置"
            : fund.fundType === "QDII"
              ? "海外配置"
              : "主动增强"
      ]
  };
}

function buildBackendFundItem(item: Partial<FundListItem>, fallbackItem?: FundListItem): FundListItem {
  const fundCode = item.fundCode ?? fallbackItem?.fundCode ?? item.fundId ?? "";
  const fundName = item.fundName ?? fallbackItem?.fundName ?? fundCode;
  const trackingTarget = item.trackingTarget ?? fallbackItem?.trackingTarget ?? fundName;

  return withFundTags({
    fundId: item.fundId ?? fallbackItem?.fundId ?? `user-${fundCode}`,
    fundName,
    fundCode,
    fundType: normalizeFundType(item.fundType, trackingTarget),
    theme: item.theme ?? fallbackItem?.theme ?? "自选基金",
    themeAliases: item.themeAliases ?? fallbackItem?.themeAliases ?? [item.theme ?? fallbackItem?.theme ?? "自选基金"],
    trackingTarget,
    return1d: item.return1d ?? fallbackItem?.return1d,
    return1m: item.return1m ?? fallbackItem?.return1m ?? 0,
    return3m: item.return3m ?? fallbackItem?.return3m ?? 0,
    return6m: item.return6m ?? fallbackItem?.return6m ?? 0,
    maxDrawdown: item.maxDrawdown ?? fallbackItem?.maxDrawdown ?? 0,
    volatility: item.volatility ?? fallbackItem?.volatility ?? 0,
    aum: item.aum ?? fallbackItem?.aum ?? 0,
    latestNav: item.latestNav ?? fallbackItem?.latestNav,
    previousNav: item.previousNav ?? fallbackItem?.previousNav,
    latestNavDate: item.latestNavDate ?? fallbackItem?.latestNavDate,
    previousNavDate: item.previousNavDate ?? fallbackItem?.previousNavDate,
    metricTradeDate: item.metricTradeDate ?? fallbackItem?.metricTradeDate,
    metricUpdatedAt: item.metricUpdatedAt ?? fallbackItem?.metricUpdatedAt,
    metricDataVersion: item.metricDataVersion ?? fallbackItem?.metricDataVersion,
    feeRate: item.feeRate ?? fallbackItem?.feeRate ?? 0,
    tradableOnExchange: item.tradableOnExchange ?? fallbackItem?.tradableOnExchange ?? (fundCode.startsWith("1") || fundCode.startsWith("5")),
    tags: fallbackItem?.tags ?? [],
    foundedYears: item.foundedYears ?? fallbackItem?.foundedYears,
    fundCompany: item.fundCompany ?? fallbackItem?.fundCompany,
    feeRuleSummary: item.feeRuleSummary ?? fallbackItem?.feeRuleSummary,
    holdingCostSummary: item.holdingCostSummary ?? fallbackItem?.holdingCostSummary ?? [],
    redemptionFeeFreeAfterDays: item.redemptionFeeFreeAfterDays ?? fallbackItem?.redemptionFeeFreeAfterDays,
    dataSource: item.dataSource ?? fallbackItem?.dataSource ?? "真实快照",
    dataCompleteness: item.dataCompleteness ?? fallbackItem?.dataCompleteness ?? "complete",
    missingMetrics: item.missingMetrics ?? fallbackItem?.missingMetrics ?? []
  });
}

function isDemoFundItem(fund: FundListItem) {
  return String(fund.dataSource ?? "") === "演示样例" || /^f\d+$/i.test(fund.fundId);
}

export async function getFundListView(theme?: string): Promise<FundListItem[]> {
  const tagFallback = buildFallbackFundList(theme);

  try {
    const response = await fetchBackendJson<FundsResponse>("/api/funds");
    const items = response.snapshot?.items;

    if (!items || items.length === 0) {
      return [];
    }

    const normalized = items.map((item) => {
      const fallbackItem = tagFallback.find((fund) => fund.fundId === item.fundId) ?? buildFallbackFundList().find((fund) => fund.fundId === item.fundId);

      return buildBackendFundItem(item, fallbackItem);
    });

    const filtered = normalized.filter((item): item is FundListItem => Boolean(item) && !isDemoFundItem(item));

    return theme ? filtered.filter((fund) => fund.theme === theme || fund.themeAliases?.includes(theme)) : filtered;
  } catch {
    return [];
  }
}

export function getFundCompareFallback(ids: string[]): FundCompareItem[] {
  return compareItems.filter((item) => ids.includes(item.fundId)).slice(0, 4);
}

export function toFundDiscoveryQueryState(searchParams: URLSearchParams, initialTheme?: string): FundDiscoveryQueryState {
  return {
    theme: searchParams.get("theme") ?? initialTheme ?? "全部",
    fundType: (searchParams.get("fundType") as FundDiscoveryQueryState["fundType"]) ?? "全部",
    sortKey: (searchParams.get("sortKey") as FundDiscoveryQueryState["sortKey"]) ?? "return3m",
    viewMode: (searchParams.get("viewMode") as FundDiscoveryQueryState["viewMode"]) ?? "table",
    exchangeOnly: searchParams.get("exchangeOnly") === "true",
    feeBand: (searchParams.get("feeBand") as FundDiscoveryQueryState["feeBand"]) ?? "全部",
    aumBand: (searchParams.get("aumBand") as FundDiscoveryQueryState["aumBand"]) ?? "全部",
    ageBand: (searchParams.get("ageBand") as FundDiscoveryQueryState["ageBand"]) ?? "全部",
    volatilityBand: (searchParams.get("volatilityBand") as FundDiscoveryQueryState["volatilityBand"]) ?? "全部",
    fundCompany: searchParams.get("fundCompany") ?? "全部"
  };
}
