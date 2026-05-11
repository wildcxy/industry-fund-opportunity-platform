from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date
from typing import Any

from psycopg.rows import dict_row

from db.connection import get_connection
from jobs.page_snapshot_build import main as rebuild_page_snapshots
from jobs.shared import build_batch_id, log_job_end, log_job_start, resolve_trade_date
from providers import CailianpressNewsProvider, Jin10NewsProvider, NewsItem, NewsProviderError


JOB_NAME = "industry_news_event_refresh"
DATA_VERSION = "manual-drop-v1"
MAX_EVENTS_PER_INDUSTRY = 3
HOT_KEYWORDS = (
    "突破",
    "订单",
    "涨停",
    "创新高",
    "大涨",
    "政策",
    "发布",
    "签约",
    "中标",
    "扩产",
    "降价",
    "涨价",
    "业绩",
    "财报",
    "出口",
    "需求",
    "风险",
    "制裁",
    "监管",
)


@dataclass(frozen=True)
class IndustryRule:
    industry_id: str
    keywords: tuple[str, ...]


INDUSTRY_RULES: tuple[IndustryRule, ...] = (
    IndustryRule("semiconductor", ("半导体", "芯片", "集成电路", "晶圆", "先进封装", "国产替代")),
    IndustryRule("memory-chip", ("存储", "DRAM", "NAND", "HBM", "存储芯片")),
    IndustryRule("ai-infra", ("AI", "人工智能", "算力", "数据中心", "GPU", "服务器", "云计算")),
    IndustryRule("cpo-optical-communication", ("CPO", "光模块", "光通信", "光芯片", "光器件", "800G", "1.6T")),
    IndustryRule("robotics", ("机器人", "人形机器人", "智能制造", "减速器", "伺服")),
    IndustryRule("defense-military", ("军工", "国防", "军贸", "航空发动机")),
    IndustryRule("commercial-space", ("商业航天", "卫星互联网", "火箭", "星链")),
    IndustryRule("aerospace", ("航空", "航天", "大飞机", "低轨卫星")),
    IndustryRule("low-altitude", ("低空经济", "eVTOL", "无人机", "通航")),
    IndustryRule("new-energy", ("新能源", "风电", "电动车", "新能源车")),
    IndustryRule("ev-battery", ("动力电池", "锂电", "固态电池", "电池材料", "碳酸锂")),
    IndustryRule("photovoltaic", ("光伏", "硅料", "组件", "逆变器", "TOPCon", "HJT")),
    IndustryRule("energy-storage", ("储能", "储能电池", "储能招标", "虚拟电厂")),
    IndustryRule("innovative-medicine", ("创新药", "医药", "医疗", "生物科技", "临床", "获批")),
    IndustryRule("chemical", ("化工", "新材料", "有色", "稀土", "氟化工", "钛白粉")),
    IndustryRule("gaming", ("游戏", "传媒", "版号", "影视", "短剧")),
    IndustryRule("global-qdii", ("美股", "纳斯达克", "标普", "港股", "海外", "日经", "QDII")),
)


def _contains(text: str, keyword: str) -> bool:
    return keyword.lower() in text.lower()


def classify_news(item: NewsItem) -> list[dict[str, Any]]:
    text = f"{item.title} {item.summary}"
    hot_score = sum(1 for keyword in HOT_KEYWORDS if _contains(text, keyword))
    matches = []
    for rule in INDUSTRY_RULES:
        matched_keywords = [keyword for keyword in rule.keywords if _contains(text, keyword)]
        if not matched_keywords:
            continue
        relevance = len(matched_keywords) * 10 + hot_score * 3
        if relevance < 10:
            continue
        matches.append(
            {
                "industryId": rule.industry_id,
                "relevance": relevance,
                "matchedKeywords": matched_keywords,
            }
        )
    matches.sort(key=lambda row: row["relevance"], reverse=True)
    return matches[:2]


def _provider(name: str):
    if name == "jin10":
        return Jin10NewsProvider()
    if name in {"cls", "cailianpress"}:
        return CailianpressNewsProvider()
    raise NewsProviderError(f"暂不支持的新闻源：{name}")


def _event_summary(item: NewsItem, match: dict[str, Any]) -> str:
    keywords = "、".join(match["matchedKeywords"][:4])
    return (
        f"{item.source_name}快讯匹配到关键词：{keywords}。摘要：{item.summary} "
        "该事件仅作为行业逻辑验证线索，需结合趋势、资金、估值和风险规则复核。"
    )[:900]


def refresh_industry_news_events(trade_date: date, provider_name: str = "jin10", limit: int = 80) -> dict[str, Any]:
    provider = _provider(provider_name)
    batch_id = build_batch_id(trade_date)
    news_items = provider.fetch_latest(limit=limit)
    grouped: dict[str, list[tuple[NewsItem, dict[str, Any]]]] = {}
    scanned_count = 0
    for item in news_items:
        scanned_count += 1
        for match in classify_news(item):
            grouped.setdefault(match["industryId"], []).append((item, match))

    saved_events: list[dict[str, Any]] = []
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "delete from industry_events_daily where trade_date = %s and data_version = %s and source_batch_id like %s",
                (trade_date, DATA_VERSION, "news-auto-%"),
            )
            priority = 1
            for industry_id, items in grouped.items():
                seen_titles: set[str] = set()
                for item, match in sorted(items, key=lambda pair: pair[1]["relevance"], reverse=True):
                    if item.title in seen_titles:
                        continue
                    seen_titles.add(item.title)
                    if len(seen_titles) > MAX_EVENTS_PER_INDUSTRY:
                        break
                    source_batch_id = f"news-auto-{provider_name}-{batch_id}"
                    cur.execute(
                        """
                        insert into industry_events_daily (
                            trade_date, industry_id, event_date, event_title, event_summary, event_type, priority_rank,
                            source_batch_id, data_version, created_at, updated_at
                        )
                        values (%s, %s, %s, %s, %s, 'news_auto', %s, %s, %s, now(), now())
                        """,
                        (
                            trade_date,
                            industry_id,
                            item.published_at.date(),
                            item.title[:255],
                            _event_summary(item, match),
                            priority,
                            source_batch_id,
                            DATA_VERSION,
                        ),
                    )
                    saved_events.append(
                        {
                            "industryId": industry_id,
                            "title": item.title,
                            "sourceName": item.source_name,
                            "matchedKeywords": match["matchedKeywords"],
                            "relevance": match["relevance"],
                        }
                    )
                    priority += 1
        conn.commit()

    rebuild_page_snapshots()
    return {
        "provider": provider_name,
        "tradeDate": trade_date.isoformat(),
        "scannedCount": scanned_count,
        "matchedIndustryCount": len(grouped),
        "savedCount": len(saved_events),
        "events": saved_events[:20],
    }


def main() -> None:
    trade_date = resolve_trade_date(os.getenv("TRADE_DATE"))
    provider_name = os.getenv("NEWS_PROVIDER", "jin10")
    limit = int(os.getenv("NEWS_LIMIT", "80"))
    batch_id = build_batch_id(trade_date)
    log_job_start(JOB_NAME, batch_id, trade_date)
    processed_count = 0
    try:
        report = refresh_industry_news_events(trade_date, provider_name=provider_name, limit=limit)
        processed_count = int(report["savedCount"])
        print(f"Industry news events refreshed: {report}")
        log_job_end(JOB_NAME, batch_id, trade_date, run_status="success", processed_count=processed_count)
    except Exception as exc:
        log_job_end(JOB_NAME, batch_id, trade_date, run_status="failed", processed_count=processed_count, error_message=str(exc))
        raise


if __name__ == "__main__":
    main()
