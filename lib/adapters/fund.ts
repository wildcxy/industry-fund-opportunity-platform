import { fetchBackendJson } from "@/lib/backend-api";
import { isDemoMode } from "@/lib/data-mode";
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
  return (theme ? funds.filter((fund) => fund.theme === theme || fund.themeAliases?.includes(theme)) : funds).map((fund) => ({
    ...fund,
    dataSource: "演示样例"
  }));
}

function withFundTags(fund: FundListItem, fallback?: FundListItem): FundListItem {
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
    return1d: item.return1d ?? (isDemoMode() ? fallbackItem?.return1d : null),
    return1m: item.return1m ?? (isDemoMode() ? fallbackItem?.return1m : null),
    return3m: item.return3m ?? (isDemoMode() ? fallbackItem?.return3m : null),
    return6m: item.return6m ?? (isDemoMode() ? fallbackItem?.return6m : null),
    maxDrawdown: item.maxDrawdown ?? (isDemoMode() ? fallbackItem?.maxDrawdown : null),
    volatility: item.volatility ?? (isDemoMode() ? fallbackItem?.volatility : null),
    aum: item.aum ?? (isDemoMode() ? fallbackItem?.aum : null),
    latestNav: item.latestNav ?? (isDemoMode() ? fallbackItem?.latestNav : undefined),
    previousNav: item.previousNav ?? (isDemoMode() ? fallbackItem?.previousNav : undefined),
    latestNavDate: item.latestNavDate ?? (isDemoMode() ? fallbackItem?.latestNavDate : undefined),
    previousNavDate: item.previousNavDate ?? (isDemoMode() ? fallbackItem?.previousNavDate : undefined),
    metricTradeDate: item.metricTradeDate ?? (isDemoMode() ? fallbackItem?.metricTradeDate : undefined),
    metricUpdatedAt: item.metricUpdatedAt ?? (isDemoMode() ? fallbackItem?.metricUpdatedAt : undefined),
    metricDataVersion: item.metricDataVersion ?? (isDemoMode() ? fallbackItem?.metricDataVersion : undefined),
    feeRate: item.feeRate ?? (isDemoMode() ? fallbackItem?.feeRate : null),
    tradableOnExchange: item.tradableOnExchange ?? (isDemoMode() ? fallbackItem?.tradableOnExchange : undefined) ?? (fundCode.startsWith("1") || fundCode.startsWith("5")),
    tags: isDemoMode() ? fallbackItem?.tags ?? [] : [],
    foundedYears: item.foundedYears ?? (isDemoMode() ? fallbackItem?.foundedYears : undefined),
    fundCompany: item.fundCompany ?? (isDemoMode() ? fallbackItem?.fundCompany : undefined),
    feeRuleSummary: item.feeRuleSummary ?? (isDemoMode() ? fallbackItem?.feeRuleSummary : undefined),
    holdingCostSummary: item.holdingCostSummary ?? (isDemoMode() ? fallbackItem?.holdingCostSummary : undefined) ?? [],
    redemptionFeeFreeAfterDays: item.redemptionFeeFreeAfterDays ?? (isDemoMode() ? fallbackItem?.redemptionFeeFreeAfterDays : undefined),
    dataSource: item.dataSource ?? (isDemoMode() ? fallbackItem?.dataSource : undefined) ?? "真实快照",
    dataCompleteness: item.dataCompleteness ?? (isDemoMode() ? fallbackItem?.dataCompleteness : undefined) ?? "complete",
    missingMetrics: item.missingMetrics ?? (isDemoMode() ? fallbackItem?.missingMetrics : undefined) ?? []
  }, isDemoMode() ? fallbackItem : undefined);
}

function isDemoFundItem(fund: FundListItem) {
  return String(fund.dataSource ?? "") === "演示样例" || /^f\d+$/i.test(fund.fundId);
}

function fundIdentityKeys(fund: Pick<FundListItem, "fundId" | "fundCode">) {
  return [fund.fundId, fund.fundCode, fund.fundCode ? `user-${fund.fundCode}` : null, fund.fundCode ? `code-${fund.fundCode}` : null].filter(Boolean) as string[];
}

function hasBackendEquivalent(fund: FundListItem, backendKeys: Set<string>) {
  return fundIdentityKeys(fund).some((key) => backendKeys.has(key));
}

export async function getFundListView(theme?: string): Promise<FundListItem[]> {
  const tagFallback = buildFallbackFundList(theme);
  const allFallback = buildFallbackFundList();
  const fallbackById = new Map(allFallback.flatMap((fund) => fundIdentityKeys(fund).map((key) => [key, fund])));
  const demoMode = isDemoMode();

  try {
    const response = await fetchBackendJson<FundsResponse>("/api/funds", { revalidate: 60 });
    const items = response.snapshot?.items;

    if (!items || items.length === 0) {
      return demoMode ? tagFallback : [];
    }

    const normalized = items.map((item) => {
      const fallbackItem = [item.fundId, item.fundCode]
        .filter(Boolean)
        .map((key) => fallbackById.get(key as string))
        .find(Boolean);

      return buildBackendFundItem(item, demoMode ? fallbackItem : undefined);
    });

    const filtered = normalized.filter((item): item is FundListItem => Boolean(item) && !isDemoFundItem(item));
    const merged = demoMode
      ? (() => {
          const backendKeys = new Set(filtered.flatMap(fundIdentityKeys));
          const fallbackOnly = tagFallback.filter((fund) => !hasBackendEquivalent(fund, backendKeys));
          return [...filtered, ...fallbackOnly];
        })()
      : filtered;

    return theme ? merged.filter((fund) => fund.theme === theme || fund.themeAliases?.includes(theme)) : merged;
  } catch {
    return demoMode ? tagFallback : [];
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
