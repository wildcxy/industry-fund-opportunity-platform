"use client";

import { useEffect, useRef, useState } from "react";

type RefreshState = "idle" | "loading" | "success" | "error";

export function IndustryNewsEventRefreshButton() {
  const [state, setState] = useState<RefreshState>("idle");
  const [message, setMessage] = useState("");
  const [provider, setProvider] = useState("jin10");
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
      const response = await fetch("/api/industries/refresh-news-events", {
        method: "GET",
        cache: "no-store"
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? payload.detail ?? "行业新闻事件状态查询失败");
      }

      if (payload.status === "success") {
        setState("success");
        setMessage(payload.message ?? "行业新闻事件刷新完成，刷新页面即可查看最新事件。");
        return;
      }

      if (payload.status === "failed") {
        setState("error");
        setMessage(payload.error ? `刷新失败：${payload.error}` : payload.message ?? "行业新闻事件刷新失败");
        return;
      }

      if (attempt >= 30) {
        setState("loading");
        setMessage("后台任务仍在运行。你可以稍后刷新页面，或查看后端日志确认进度。");
        return;
      }

      setState("loading");
      setMessage(payload.message ?? "后台正在拉取热点新闻并筛选行业事件，请稍候...");
      pollTimer.current = setTimeout(() => void pollRefreshStatus(attempt + 1), 4000);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "行业新闻事件状态查询失败");
    }
  }

  async function refreshNewsEvents() {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
    }
    setState("loading");
    setMessage("正在提交后台任务。系统会拉取热点新闻、匹配行业关键词并更新事件快照...");
    try {
      const response = await fetch("/api/industries/refresh-news-events", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ provider, limit: 80 })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? payload.detail ?? "行业新闻事件刷新失败");
      }
      setState("loading");
      setMessage(payload.message ?? "后台刷新任务已提交，正在查询进度...");
      pollTimer.current = setTimeout(() => void pollRefreshStatus(), 1500);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "行业新闻事件刷新失败");
    }
  }

  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold">热点新闻事件自动补充</p>
          <p className="mt-1 text-xs leading-5 text-ink/55">
            拉取最新财经快讯，按行业关键词筛选热点新闻并写入事件池。事件只用于验证行业逻辑和风险，不直接生成买入结论。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            disabled={state === "loading"}
            className="rounded-full border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="jin10">金十数据</option>
            <option value="cailianpress">财联社</option>
          </select>
          <button
            type="button"
            onClick={() => void refreshNewsEvents()}
            disabled={state === "loading"}
            className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === "loading" ? "拉取中..." : "拉取热点新闻"}
          </button>
        </div>
      </div>
      {message ? (
        <p className={`mt-3 rounded-2xl px-4 py-3 text-sm leading-6 ${state === "error" ? "bg-rose-50 text-rose-700" : "bg-mist text-ink/65"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
