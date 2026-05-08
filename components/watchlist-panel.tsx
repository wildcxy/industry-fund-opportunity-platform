"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { buildWatchlistItems, readWatchlistIds, readWatchlistItems } from "@/lib/storage";
import { WatchlistItem } from "@/types";

type WatchlistSummaryResponse = {
  snapshot?: {
    items?: Array<{
      itemType: "industry" | "fund";
      itemId: string;
      statusLabel: string;
      latestChange: string;
      updatedAt?: string;
    }>;
  };
};

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
        const merged = buildWatchlistItems(ids, payload.snapshot?.items ?? []).slice(0, 3);

        if (!cancelled) {
          setItems(merged);
        }
      } catch {
        if (!cancelled) {
          setItems(readWatchlistItems().slice(0, 3));
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
              key={item.itemId}
              href={item.entryLink}
              className="block rounded-2xl border border-ink/10 bg-mist/70 p-4 transition hover:border-pine/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold">{item.displayName}</p>
                  <p className="mt-1 text-sm text-ink/65">{item.latestChange}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-pine">
                  {item.statusLabel}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
