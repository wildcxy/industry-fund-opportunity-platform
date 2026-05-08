"use client";

import { useEffect, useRef, useState } from "react";

type RefreshState = "idle" | "loading" | "success" | "error";

export function IndustryTopFundRefreshButton() {
  const [state, setState] = useState<RefreshState>("idle");
  const [message, setMessage] = useState("");
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) {
        clearTimeout(pollTimer.current);
      }
    };
  }, []);

  async function pollRefreshStatus(attempt = 0) {
    try {
      const response = await fetch("/api/industries/refresh-top-funds", {
        method: "GET",
        cache: "no-store"
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? payload.detail ?? "行业 Top10 基金池状态查询失败");
      }

      if (payload.status === "success") {
        setState("success");
        setMessage(payload.message ?? "行业 Top10 基金池刷新完成，刷新页面即可查看最新排名。");
        return;
      }

      if (payload.status === "failed") {
        setState("error");
        setMessage(payload.error ? `刷新失败：${payload.error}` : payload.message ?? "行业 Top10 基金池刷新失败");
        return;
      }

      if (attempt >= 90) {
        setState("loading");
        setMessage("后台任务仍在运行。你可以稍后刷新页面，或查看后端日志确认进度。");
        return;
      }

      setState("loading");
      setMessage(payload.message ?? "后台正在刷新行业 Top10 基金池，请稍候...");
      pollTimer.current = setTimeout(() => void pollRefreshStatus(attempt + 1), 8000);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "行业 Top10 基金池状态查询失败");
    }
  }

  async function refreshTopFunds() {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
    }
    setState("loading");
    setMessage("正在提交后台任务。行业 Top10 会逐只拉取数据，通常需要几分钟...");
    try {
      const response = await fetch("/api/industries/refresh-top-funds", {
        method: "POST",
        cache: "no-store"
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? payload.detail ?? "行业 Top10 基金池刷新失败");
      }
      setState("loading");
      setMessage(payload.message ?? "后台刷新任务已提交，正在查询进度...");
      pollTimer.current = setTimeout(() => void pollRefreshStatus(), 2000);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "行业 Top10 基金池刷新失败");
    }
  }

  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold">盘后行业 Top10 基金池</p>
          <p className="mt-1 text-xs leading-5 text-ink/55">
            点击后提交后台任务，按行业自动搜索基金、拉取净值、计算评分并更新每个行业前 10 名。评分用于观察排序，不是收益承诺。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshTopFunds()}
          disabled={state === "loading"}
          className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === "loading" ? "刷新中..." : "盘后刷新行业Top10"}
        </button>
      </div>
      {message ? (
        <p className={`mt-3 rounded-2xl px-4 py-3 text-sm leading-6 ${state === "error" ? "bg-rose-50 text-rose-700" : "bg-mist text-ink/65"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
