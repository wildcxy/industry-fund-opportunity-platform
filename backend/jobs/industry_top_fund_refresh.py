from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from typing import Any

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from db.connection import get_connection
from jobs.shared import build_batch_id, get_trade_archive_raw_dir, log_job_end, log_job_start, resolve_trade_date
from providers import FundUniverseItem, ProProvider


JOB_NAME = "industry_top_fund_refresh"
DATA_VERSION = "tushare-industry-top10-v1"
MAX_FUNDS_PER_INDUSTRY = 10
MAX_CANDIDATES_PER_INDUSTRY = 80


@dataclass(frozen=True)
class IndustryProfile:
    industry_id: str
    theme: str
    keywords: tuple[str, ...]
    preferred_keywords: tuple[str, ...] = ()
    exclude_keywords: tuple[str, ...] = (
        "货币",
        "现金",
        "债券",
        "短债",
        "中短债",
        "纯债",
        "同业存单",
        "养老",
        "FOF",
        "REIT",
    )


INDUSTRY_PROFILES: tuple[IndustryProfile, ...] = (
    IndustryProfile("semiconductor", "半导体", ("半导体", "芯片", "集成电路"), ("ETF", "指数", "联接")),
    IndustryProfile("memory-chip", "芯片存储", ("存储", "芯片", "半导体"), ("存储", "芯片", "ETF", "指数")),
    IndustryProfile("ai-infra", "AI算力基础设施", ("人工智能", "AI", "算力", "CPO", "云计算", "机器人"), ("AI", "人工智能", "ETF", "指数")),
    IndustryProfile("robotics", "机器人", ("机器人", "智能制造", "高端制造"), ("机器人", "ETF", "指数")),
    IndustryProfile("defense-military", "军工", ("军工", "国防", "军民", "中航", "航天", "航空"), ("军工", "国防", "ETF", "指数")),
    IndustryProfile("commercial-space", "商业卫星", ("商业航天", "卫星", "航天", "军工"), ("卫星", "航天", "军工", "ETF", "指数")),
    IndustryProfile("aerospace", "航天航空", ("航天", "航空", "军工", "高端装备"), ("航天", "航空", "ETF", "指数")),
    IndustryProfile("low-altitude", "低空经济", ("低空", "航空", "无人机", "军工", "高端装备"), ("低空", "航空", "无人机")),
    IndustryProfile("new-energy", "新能源", ("新能源", "电池", "光伏", "储能", "风电", "环保"), ("新能源", "ETF", "指数")),
    IndustryProfile("ev-battery", "新能源车与电池", ("新能源车", "电池", "锂电", "汽车"), ("新能源车", "电池", "ETF", "指数")),
    IndustryProfile("photovoltaic", "光伏", ("光伏", "太阳能", "新能源"), ("光伏", "ETF", "指数")),
    IndustryProfile("energy-storage", "储能", ("储能", "电池", "新能源"), ("储能", "电池")),
    IndustryProfile("innovative-medicine", "创新药", ("创新药", "生物医药", "医药", "医疗"), ("创新药", "ETF", "指数")),
    IndustryProfile("chemical", "化工新材料", ("化工", "材料", "新材料", "有色"), ("化工", "材料", "ETF", "指数")),
    IndustryProfile("gaming", "游戏传媒", ("游戏", "传媒", "文娱", "动漫"), ("游戏", "传媒", "ETF", "指数")),
    IndustryProfile("global-qdii", "全球科技QDII", ("QDII", "全球", "海外", "纳斯达克", "标普", "亚洲", "新兴市场"), ("QDII", "纳斯达克", "标普", "全球")),
)

SUPPLEMENTAL_PROFILE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "global-qdii": (
        "QDII",
        "纳斯达克",
        "标普",
        "美国",
        "全球",
        "海外",
        "港股",
        "恒生科技",
        "互联网",
        "日经",
        "印度",
        "越南",
        "德国",
        "亚洲",
        "新兴市场",
    ),
    "low-altitude": (
        "低空",
        "航空",
        "无人机",
        "高端装备",
        "智能制造",
        "军工",
    ),
    "defense-military": (
        "军工",
        "国防",
        "中航",
        "航天",
        "航空",
        "高端装备",
    ),
}


def _normalize_code(value: Any) -> str:
    return str(value or "").strip().split(".")[0].zfill(6)


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number != number:
        return None
    return number


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _metric_score(value: float | None, low: float, high: float) -> float:
    if value is None:
        return 45.0
    return _clamp((value - low) / (high - low) * 100.0)


def _drawdown_score(value: float | None) -> float:
    if value is None:
        return 45.0
    return _clamp(100.0 + value * 3.0)


def _volatility_score(value: float | None) -> float:
    if value is None:
        return 45.0
    return _clamp(100.0 - max(value - 12.0, 0.0) * 2.8)


def _age_score(value: int | None) -> float:
    if value is None:
        return 45.0
    return _clamp(value / 5.0 * 100.0)


def _candidate_text(row: dict[str, Any]) -> str:
    return f"{row.get('ts_code') or ''} {row.get('name') or ''} {row.get('fund_type') or ''} {row.get('management') or ''}".upper()


def _is_excluded(text: str, profile: IndustryProfile) -> bool:
    return any(keyword.upper() in text for keyword in profile.exclude_keywords)


def _match_candidate_score(row: dict[str, Any], profile: IndustryProfile) -> float:
    text = _candidate_text(row)
    if _is_excluded(text, profile):
        return -999.0
    score = 0.0
    theme_hits = 0
    for keyword in profile.keywords + SUPPLEMENTAL_PROFILE_KEYWORDS.get(profile.industry_id, ()):
        if keyword.upper() in text:
            theme_hits += 1
            score += 12.0
    if theme_hits == 0:
        return -999.0
    for keyword in profile.preferred_keywords:
        if keyword.upper() in text:
            score += 6.0
    if "ETF" in text:
        score += 5.0
    if "指数" in text or "联接" in text:
        score += 4.0
    if "C" in str(row.get("name") or "")[-2:]:
        score += 1.0
    return score


def _rank_score(daily: dict[str, object], founded_years: int | None, name_score: float) -> tuple[float, dict[str, float]]:
    return_1m = _as_float(daily.get("return_1m"))
    return_3m = _as_float(daily.get("return_3m"))
    return_6m = _as_float(daily.get("return_6m"))
    max_drawdown = _as_float(daily.get("max_drawdown"))
    volatility = _as_float(daily.get("volatility"))

    components = {
        "trend3m": _metric_score(return_3m, -15.0, 30.0),
        "trend1m": _metric_score(return_1m, -8.0, 18.0),
        "trend6m": _metric_score(return_6m, -20.0, 45.0),
        "drawdown": _drawdown_score(max_drawdown),
        "volatility": _volatility_score(volatility),
        "age": _age_score(founded_years),
        "match": _clamp(name_score * 3.0),
    }
    score = (
        components["trend3m"] * 0.28
        + components["trend1m"] * 0.16
        + components["trend6m"] * 0.16
        + components["drawdown"] * 0.16
        + components["volatility"] * 0.10
        + components["age"] * 0.08
        + components["match"] * 0.06
    )
    return round(_clamp(score), 2), {key: round(value, 2) for key, value in components.items()}


def _signal_for_score(score: float, daily: dict[str, object]) -> str:
    return_1m = _as_float(daily.get("return_1m"))
    max_drawdown = _as_float(daily.get("max_drawdown"))
    if max_drawdown is not None and max_drawdown <= -25:
        return "高回撤观察"
    if return_1m is not None and return_1m >= 18:
        return "短期强势不追高"
    if score >= 75:
        return "优先观察"
    if score >= 65:
        return "分批配置观察"
    if score >= 55:
        return "继续跟踪"
    return "数据或趋势待验证"


def _load_existing_fund_ids(cur) -> dict[str, str]:
    cur.execute("select fund_code, fund_id from fund_master")
    return {row["fund_code"]: row["fund_id"] for row in cur.fetchall()}


def _upsert_fund_master(cur, row: dict[str, object]) -> None:
    cur.execute(
        """
        insert into fund_master (
            fund_id, fund_code, fund_name, fund_type, theme, tracking_target,
            fund_company, tradable_on_exchange, fee_rate, inception_date, created_at, updated_at
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
        on conflict (fund_code) do update
        set fund_name = excluded.fund_name,
            fund_type = excluded.fund_type,
            theme = excluded.theme,
            tracking_target = excluded.tracking_target,
            fund_company = excluded.fund_company,
            tradable_on_exchange = excluded.tradable_on_exchange,
            fee_rate = excluded.fee_rate,
            inception_date = excluded.inception_date,
            updated_at = now()
        """,
        (
            row["fund_id"],
            row["fund_code"],
            row["fund_name"],
            row["fund_type"],
            row["theme"],
            row["tracking_target"],
            row["fund_company"],
            row["tradable_on_exchange"],
            row["fee_rate"],
            row["inception_date"],
        ),
    )


def _upsert_industry_mapping(cur, industry_id: str, fund_id: str, rank: int) -> None:
    cur.execute(
        """
        insert into industry_fund_mapping (
            industry_id, fund_id, mapping_type, priority_rank, created_at, updated_at
        )
        values (%s, %s, 'top10-auto', %s, now(), now())
        on conflict (industry_id, fund_id) do update
        set mapping_type = excluded.mapping_type,
            priority_rank = excluded.priority_rank,
            updated_at = now()
        """,
        (industry_id, fund_id, rank),
    )


def _upsert_fund_daily_metrics(cur, trade_date: date, batch_id: str, row: dict[str, object], score: float, components: dict[str, float]) -> None:
    note = (
        f"行业Top10评分 {score:.2f}；"
        f"趋势3月 {components['trend3m']:.0f}，回撤 {components['drawdown']:.0f}，波动 {components['volatility']:.0f}。"
        "评分用于盘后观察排序，不构成买入承诺。"
    )
    cur.execute(
        """
        insert into fund_daily_metrics (
            trade_date, fund_id, return_1d, return_1m, return_3m, return_6m, max_drawdown,
            volatility, aum, latest_nav, previous_nav, latest_nav_date, previous_nav_date, founded_years, top_holdings_json, concentration_label,
            tracking_deviation_note, source_batch_id, data_version, created_at, updated_at
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
        on conflict (trade_date, fund_id, data_version) do update
        set return_1d = excluded.return_1d,
            return_1m = excluded.return_1m,
            return_3m = excluded.return_3m,
            return_6m = excluded.return_6m,
            max_drawdown = excluded.max_drawdown,
            volatility = excluded.volatility,
            aum = excluded.aum,
            latest_nav = excluded.latest_nav,
            previous_nav = excluded.previous_nav,
            latest_nav_date = excluded.latest_nav_date,
            previous_nav_date = excluded.previous_nav_date,
            founded_years = excluded.founded_years,
            top_holdings_json = excluded.top_holdings_json,
            concentration_label = excluded.concentration_label,
            tracking_deviation_note = excluded.tracking_deviation_note,
            source_batch_id = excluded.source_batch_id,
            updated_at = now()
        """,
        (
            trade_date,
            row["fund_id"],
            row["return_1d"],
            row["return_1m"],
            row["return_3m"],
            row["return_6m"],
            row["max_drawdown"],
            row["volatility"],
            row["aum"],
            row["latest_nav"],
            row["previous_nav"],
            row.get("latest_nav_date"),
            row.get("previous_nav_date"),
            row["founded_years"],
            Jsonb([]),
            f"Top10评分 {score:.2f}",
            note,
            batch_id,
            DATA_VERSION,
        ),
    )


def _candidate_rows(
    market_records: list[dict[str, Any]], profile: IndustryProfile
) -> tuple[list[tuple[float, dict[str, Any]]], int]:
    rows = []
    for row in market_records:
        score = _match_candidate_score(row, profile)
        if score > 0:
            rows.append((score, row))
    rows.sort(key=lambda item: item[0], reverse=True)
    return rows[:MAX_CANDIDATES_PER_INDUSTRY], len(rows)


def refresh_industry_top_funds(trade_date: date) -> dict[str, Any]:
    provider = ProProvider()
    if not provider.enabled:
        raise RuntimeError("Tushare is not enabled. Set TUSHARE_ENABLE=true and TUSHARE_TOKEN.")

    batch_id = build_batch_id(trade_date)
    report: dict[str, Any] = {
        "tradeDate": trade_date.isoformat(),
        "dataVersion": DATA_VERSION,
        "industries": [],
    }
    market_records = provider.get_fund_basic_records()
    report["marketFundCount"] = len(market_records)
    report["maxCandidatesPerIndustry"] = MAX_CANDIDATES_PER_INDUSTRY

    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            existing_fund_ids = _load_existing_fund_ids(cur)
            for profile in INDUSTRY_PROFILES:
                ranked: list[dict[str, Any]] = []
                failures: list[dict[str, str]] = []
                candidates, matched_count = _candidate_rows(market_records, profile)
                print(
                    f"[industry_top10] industry={profile.industry_id} matched={matched_count} selected={len(candidates)}",
                    flush=True,
                )
                for name_score, raw in candidates:
                    code = _normalize_code(raw.get("ts_code"))
                    if not code:
                        continue
                    fund_id = existing_fund_ids.get(code) or f"top10-{code}"
                    item = FundUniverseItem(
                        fund_id=fund_id,
                        fund_code=code,
                        industry_id=profile.industry_id,
                        theme=profile.theme,
                        tracking_target=str(raw.get("name") or profile.theme),
                    )
                    try:
                        master = provider.build_master_row(item).to_csv_row()
                        daily = provider.build_daily_metrics_row(item, trade_date, include_aum=False).to_csv_row()
                    except Exception as exc:
                        print(f"[industry_top10 skip] industry={profile.industry_id} fund={code} error={exc}")
                        failures.append(
                            {
                                "fundCode": code,
                                "fundName": str(raw.get("name") or ""),
                                "reason": str(exc),
                            }
                        )
                        continue

                    score, components = _rank_score(daily, daily.get("founded_years"), name_score)
                    missing_metrics = [
                        key
                        for key in ("latest_nav", "return_1m", "return_3m", "return_6m", "aum")
                        if daily.get(key) is None
                    ]
                    ranked.append(
                        {
                            "score": score,
                            "components": components,
                            "signal": _signal_for_score(score, daily),
                            "master": master,
                            "daily": daily,
                            "missingMetrics": missing_metrics,
                        }
                    )

                ranked.sort(key=lambda item: item["score"], reverse=True)
                top_items = ranked[:MAX_FUNDS_PER_INDUSTRY]
                cur.execute(
                    "delete from industry_fund_mapping where industry_id = %s and mapping_type = 'top10-auto'",
                    (profile.industry_id,),
                )
                for rank, result in enumerate(top_items, start=1):
                    master = result["master"]
                    daily = result["daily"]
                    if daily.get("aum") is None and daily.get("latest_nav") is not None:
                        try:
                            daily["aum"] = provider.get_latest_fund_share_aum(
                                str(master["fund_code"]), trade_date, float(daily["latest_nav"])
                            )
                            if daily["aum"] is not None and "aum" in result["missingMetrics"]:
                                result["missingMetrics"].remove("aum")
                        except Exception as exc:
                            if "aum" not in result["missingMetrics"]:
                                result["missingMetrics"].append("aum")
                            failures.append(
                                {
                                    "fundCode": str(master["fund_code"]),
                                    "fundName": str(master["fund_name"]),
                                    "reason": f"fund_share aum failed: {exc}",
                                }
                            )
                    if daily.get("aum") is None:
                        try:
                            fallback_aum = provider.get_eastmoney_aum_yi(str(master["fund_code"]))
                            daily["aum"] = fallback_aum
                            if fallback_aum is not None and "aum" in result["missingMetrics"]:
                                result["missingMetrics"].remove("aum")
                        except Exception as exc:
                            if "aum" not in result["missingMetrics"]:
                                result["missingMetrics"].append("aum")
                            failures.append(
                                {
                                    "fundCode": str(master["fund_code"]),
                                    "fundName": str(master["fund_name"]),
                                    "reason": f"eastmoney aum failed: {exc}",
                                }
                            )
                    _upsert_fund_master(cur, master)
                    _upsert_industry_mapping(cur, profile.industry_id, str(master["fund_id"]), rank)
                    _upsert_fund_daily_metrics(cur, trade_date, batch_id, daily, result["score"], result["components"])

                report["industries"].append(
                    {
                        "industryId": profile.industry_id,
                        "industryName": profile.theme,
                        "matchedCandidateCount": matched_count,
                        "selectedCandidateCount": len(candidates),
                        "candidateCount": len(ranked),
                        "partialDataCount": sum(1 for item in ranked if item["missingMetrics"]),
                        "failedCount": len(failures),
                        "failedSamples": failures[:8],
                        "savedCount": len(top_items),
                        "topFunds": [
                            {
                                "rank": index,
                                "fundCode": item["master"]["fund_code"],
                                "fundName": item["master"]["fund_name"],
                                "score": item["score"],
                                "signal": item["signal"],
                                "missingMetrics": item["missingMetrics"],
                            }
                            for index, item in enumerate(top_items, start=1)
                        ],
                    }
                )
        conn.commit()

    output_dir = get_trade_archive_raw_dir(trade_date)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "industry_top_fund_refresh.json"
    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    report["outputPath"] = str(output_path)
    return report


def main() -> None:
    trade_date = resolve_trade_date()
    batch_id = build_batch_id(trade_date)
    log_job_start(JOB_NAME, batch_id, trade_date)
    try:
        report = refresh_industry_top_funds(trade_date)
    except Exception as exc:
        log_job_end(JOB_NAME, batch_id, trade_date, run_status="failed", error_message=str(exc))
        raise
    processed_count = sum(item["savedCount"] for item in report["industries"])
    log_job_end(JOB_NAME, batch_id, trade_date, processed_count=processed_count)
    print(
        json.dumps(
            {
                "status": "ok",
                "tradeDate": report["tradeDate"],
                "dataVersion": report["dataVersion"],
                "marketFundCount": report.get("marketFundCount"),
                "maxCandidatesPerIndustry": report.get("maxCandidatesPerIndustry"),
                "processedCount": processed_count,
                "outputPath": report["outputPath"],
                "industries": [
                    {
                        "industryId": item["industryId"],
                        "matchedCandidateCount": item["matchedCandidateCount"],
                        "selectedCandidateCount": item["selectedCandidateCount"],
                        "candidateCount": item["candidateCount"],
                        "failedCount": item["failedCount"],
                        "partialDataCount": item["partialDataCount"],
                        "savedCount": item["savedCount"],
                        "topFunds": item["topFunds"][:3],
                    }
                    for item in report["industries"]
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
