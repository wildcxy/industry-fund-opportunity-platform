import { compareItems, funds, industryCards } from "@/mock/data";
import { FundCompareItem, PortfolioPosition, WatchlistItem } from "@/types";

export const STORAGE_KEYS = {
  watchlist: "industry-fund-watchlist",
  compare: "industry-fund-compare",
  portfolio: "industry-fund-portfolio"
} as const;

type WatchlistSummaryItem = {
  itemType: "industry" | "fund";
  itemId: string;
  fundCode?: string | null;
  statusLabel: string;
  latestChange: string;
  updatedAt?: string;
};

export function readJsonArray(key: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeJsonArray(key: string, value: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readCompareItems(): FundCompareItem[] {
  const ids = readJsonArray(STORAGE_KEYS.compare);
  return compareItems.filter((item) => ids.includes(item.fundId)).slice(0, 4);
}

export function readWatchlistIds(): string[] {
  return readJsonArray(STORAGE_KEYS.watchlist);
}

export function readPortfolioPositions(): PortfolioPosition[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.portfolio);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.fundName === "string") : [];
  } catch {
    return [];
  }
}

function buildWatchlistBaseItems(ids: string[]): WatchlistItem[] {
  const industryItems = industryCards
    .filter((item) => ids.includes(item.industryId))
    .map<WatchlistItem>((item) => ({
      itemId: item.industryId,
      itemType: "industry",
      displayName: item.industryName,
      statusLabel: item.label,
      latestChange: item.summary,
      updatedAt: "2026-04-21 10:00",
      entryLink: `/industries/${item.industryId}`
    }));

  const fundItems = funds
    .filter((item) => ids.includes(item.fundId))
    .map<WatchlistItem>((item) => ({
      itemId: item.fundId,
      itemType: "fund",
      fundCode: item.fundCode,
      displayName: item.fundName,
      statusLabel: item.tags[0] ?? "观察中",
      latestChange: `${item.theme} 主题关注度仍在改善`,
      updatedAt: "2026-04-21 10:00",
      entryLink: `/funds/${item.fundCode}`
    }));

  return [...industryItems, ...fundItems];
}

export function buildWatchlistItems(ids: string[], summaryItems: WatchlistSummaryItem[] = []): WatchlistItem[] {
  const baseItems = buildWatchlistBaseItems(ids);
  const summaryMap = new Map(summaryItems.map((item) => [`${item.itemType}:${item.itemId}`, item]));
  const usedIds = new Set(baseItems.map((item) => item.itemId));
  const summaryOnlyItems = summaryItems
    .filter((item) => {
      const aliases = [item.itemId, item.fundCode, item.fundCode ? `user-${item.fundCode}` : null, item.fundCode ? `code-${item.fundCode}` : null].filter(Boolean) as string[];
      return aliases.some((id) => ids.includes(id)) && !usedIds.has(item.itemId);
    })
    .map<WatchlistItem>((item) => ({
      itemId: item.itemId,
      itemType: item.itemType,
      fundCode: item.fundCode,
      displayName: item.latestChange.split("：")[0] || item.itemId,
      statusLabel: item.statusLabel,
      latestChange: item.latestChange,
      updatedAt: item.updatedAt || new Date().toISOString(),
      entryLink: item.itemType === "fund" ? (item.fundCode ? `/funds/${item.fundCode}` : "/funds") : `/industries/${item.itemId}`
    }));

  const mergedBase = baseItems.map((item) => {
    const summary = summaryMap.get(`${item.itemType}:${item.itemId}`);
    if (!summary) {
      return item;
    }

    return {
      ...item,
      fundCode: summary.fundCode ?? item.fundCode,
      statusLabel: summary.statusLabel || item.statusLabel,
      latestChange: summary.latestChange || item.latestChange,
      updatedAt: summary.updatedAt || item.updatedAt,
      entryLink: summary.fundCode ? `/funds/${summary.fundCode}` : item.entryLink
    };
  });

  return [...mergedBase, ...summaryOnlyItems];
}

export function readWatchlistItems(): WatchlistItem[] {
  const ids = readWatchlistIds();
  if (!ids.length) {
    return [];
  }

  return buildWatchlistItems(ids);
}
