"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { buildWatchlistItems, mergeWatchlistStrategyStates, readWatchlistIds, readWatchlistItems } from "@/lib/storage";
import { WatchlistItem, WatchlistStrategyStage } from "@/types";

const PANEL_ITEM_LIMIT = 4;

const STAGE_LABELS: Record<WatchlistStrategyStage, string> = {
  watching: "普通观察",
  scoring: "评分中",
  buy_plan_draft: "计划草稿",
  paused: "暂停观察",
  removed: "移出池"
};

const RISK_LABELS = {
  low: "低风险",
  medium: "中风险",
  high: "高风险"
} as const;

const STAGE_PRIORITY: Record<WatchlistStrategyStage, number> = {
  buy_plan_draft: 0,
  paused: 1,
  scoring: 2,
  watching: 3,
  removed: 6
};

type WatchlistSummaryResponse = {
  snapshot?: {
    items?: Array<{
      itemType: "industry" | "fund";
      itemId: string;
      fundCode?: string | null;
      statusLabel: string;
      latestChange: string;
      updatedAt?: string;
    }>;
  };
};

function strategyStage(item: WatchlistItem): WatchlistStrategyStage {
  return item.strategyState?.stage ?? "watching";
}

function itemPriority(item: WatchlistItem) {
  if (item.itemType === "industry") {
    return 4;
  }

  return STAGE_PRIORITY[strategyStage(item)];
}

function highPriorityItems(items: WatchlistItem[]) {
  return [...items]
    .sort((left, right) => itemPriority(left) - itemPriority(right) || right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, PANEL_ITEM_LIMIT);
}

function StrategyBadge({ item }: { item: WatchlistItem }) {
  if (item.itemType === "industry") {
    return <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-pine">{item.statusLabel}</span>;
  }

  const state = item.strategyState;
  const stage = strategyStage(item);

  return (
    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-pine">
      {STAGE_LABELS[stage]}
      {state?.riskLevel ? ` / ${RISK_LABELS[state.riskLevel]}` : ""}
    </span>
  );
}

function StrategyLine({ item }: { item: WatchlistItem }) {
  if (item.itemType === "industry") {
    return <p className="mt-1 text-sm text-ink/65">{item.latestChange}</p>;
  }

  const state = item.strategyState;
  if (!state) {
    return <p className="mt-1 text-sm text-ink/65">暂未生成策略评分，保留普通观察。</p>;
  }

  if (state.riskVetoes?.length) {
    return <p className="mt-1 text-sm text-rose-700">风险 veto：{state.riskVetoes.slice(0, 2).join("；")}</p>;
  }

  return <p className="mt-1 text-sm text-ink/65">{state.nextAction ?? state.reason ?? item.latestChange}</p>;
}

export function WatchlistPanel() {
  const [items, setItems] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      const ids = readWatchlistIds();
      if (!ids.length) {
        if (!cancelled) {
          setItems([]);
        }
        return;
      }

      try {
        const response = await fetch("/api/watchlist-summary", { cache: "no-store" });
        const payload = (await response.json()) as WatchlistSummaryResponse;
        const merged = highPriorityItems(mergeWatchlistStrategyStates(buildWatchlistItems(ids, payload.snapshot?.items ?? [])));

        if (!cancelled) {
          setItems(merged);
        }
      } catch {
        if (!cancelled) {
          setItems(highPriorityItems(readWatchlistItems()));
        }
      }
    }

    loadItems();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Watchlist</p>
          <h3 className="mt-2 text-lg font-semibold">我的观察重点</h3>
        </div>
        <Link href="/watchlist" className="text-sm font-semibold text-pine">
          查看全部
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="观察清单为空"
            description="可以从首页、行业详情页或基金发现页添加观察项，这里会优先展示你最近关注的行业和基金。"
            primaryHref="/"
            primaryLabel="前往首页"
            secondaryHref="/funds"
            secondaryLabel="进入基金发现"
          />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <Link
              key={`${item.itemType}:${item.fundCode ?? item.itemId}`}
              href={item.entryLink}
              className="block rounded-2xl border border-ink/10 bg-mist/70 p-4 transition hover:border-pine/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-base font-semibold">{item.displayName}</p>
                  <StrategyLine item={item} />
                </div>
                <StrategyBadge item={item} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
