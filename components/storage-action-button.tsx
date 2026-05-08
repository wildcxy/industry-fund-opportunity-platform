"use client";

import { useEffect, useState } from "react";

import { readJsonArray, writeJsonArray } from "@/lib/storage";

export function StorageActionButton({
  storageKey,
  itemId,
  idleLabel,
  activeLabel,
  maxItems
}: {
  storageKey: string;
  itemId: string;
  idleLabel: string;
  activeLabel: string;
  maxItems?: number;
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(readJsonArray(storageKey).includes(itemId));
  }, [itemId, storageKey]);

  function toggle() {
    const current = readJsonArray(storageKey);
    if (current.includes(itemId)) {
      const next = current.filter((value) => value !== itemId);
      writeJsonArray(storageKey, next);
      setActive(false);
      return;
    }

    const next = maxItems ? [...current.slice(-(maxItems - 1)), itemId] : [...current, itemId];
    writeJsonArray(storageKey, Array.from(new Set(next)));
    setActive(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-pine text-white" : "bg-ink text-white hover:bg-pine"
      }`}
    >
      {active ? activeLabel : idleLabel}
    </button>
  );
}
