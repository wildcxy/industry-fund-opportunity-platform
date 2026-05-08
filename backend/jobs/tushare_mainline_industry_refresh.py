from __future__ import annotations

import json
import math
import time
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from db.connection import get_connection
from jobs.shared import build_batch_id, get_trade_archive_raw_dir, log_job_end, log_job_start, resolve_trade_date
from providers import ProProvider


JOB_NAME = "tushare_mainline_industry_refresh"
DATA_VERSION = "tushare-mainline-v1"
LOOKBACK_DAYS = 190
MAX_FUNDS_PER_INDUSTRY = 12
MAX_STOCKS_PER_INDUSTRY = 80
FUND_PORTFOLIO_INTERVAL_SECONDS = 1.15
_LAST_FUND_PORTFOLIO_CALL_AT = 0.0


THEME_KEYWORDS: dict[str, tuple[str, ...]] = {
    "semiconductor": ("半导体", "芯片", "集成电路", "晶圆", "封测", "材料", "设备"),
    "memory-chip": ("存储", "DRAM", "NAND", "HBM", "闪存", "内存", "芯片"),
    "ai-infra": ("CPO", "光模块", "算力", "人工智能", "AI", "服务器", "通信设备", "云计算"),
    "new-energy": ("新能源", "锂电", "电池", "光伏", "储能", "风电"),
    "defense-military": ("军工", "国防", "航空", "航天", "卫星", "船舶"),
    "commercial-space": ("商业航天", "卫星", "航天", "火箭", "低空"),
    "aerospace": ("航空", "航天", "大飞机", "飞机"),
}


def _records(frame: Any) -> list[dict[str, Any]]:
    if frame is None or not hasattr(frame, "to_dict"):
        return []
    return [{str(key): value for key, value in row.items()} for row in frame.to_dict("records")]


def _optional_records(provider: ProProvider, api_name: str, **kwargs) -> list[dict[str, Any]]:
    try:
        return _records(getattr(provider, api_name)(**kwargs))
    except Exception as exc:
        print(f"[optional tushare api skipped] api={api_name} error={exc}")
        return []


def _float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return number


def _date(value: Any) -> date | None:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw or raw in {"nan", "None", "--"}:
        return None
    for fmt in ("%Y%m%d", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def _score_range(value: float | None, low: float, high: float, missing: float = 45.0) -> float:
    if value is None:
        return missing
    if high == low:
        return missing
    return max(0.0, min(100.0, (value - low) / (high - low) * 100.0))


def _avg(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 4) if values else None


def _median(values: list[float]) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    mid = len(ordered) // 2
    if len(ordered) % 2:
        return round(ordered[mid], 4)
    return round((ordered[mid - 1] + ordered[mid]) / 2, 4)


def _bar_return(points: list[dict[str, Any]], bars: int) -> float | None:
    if len(points) <= bars:
        return None
    latest = _float(points[-1].get("close"))
    base = _float(points[-bars - 1].get("close"))
    if latest is None or base in (None, 0):
        return None
    return round((latest / base - 1.0) * 100.0, 4)


def _max_drawdown(points: list[dict[str, Any]]) -> float | None:
    closes = [_float(point.get("close")) for point in points]
    values = [value for value in closes if value is not None and value > 0]
    if len(values) < 8:
        return None
    peak = values[0]
    drawdown = 0.0
    for value in values:
        peak = max(peak, value)
        drawdown = min(drawdown, value / peak - 1.0)
    return round(drawdown * 100.0, 4)


def _volatility(points: list[dict[str, Any]]) -> float | None:
    returns: list[float] = []
    for index in range(1, len(points)):
        previous = _float(points[index - 1].get("close"))
        current = _float(points[index].get("close"))
        if previous and current and previous > 0 and current > 0:
            returns.append(math.log(current / previous))
    if len(returns) < 12:
        return None
    mean = sum(returns) / len(returns)
    variance = sum((item - mean) ** 2 for item in returns) / max(len(returns) - 1, 1)
    return round((variance**0.5) * (252**0.5) * 100.0, 4)


def _normalize_stock_code(value: Any) -> str | None:
    raw = str(value or "").strip().upper()
    if not raw:
        return None
    if "." in raw:
        code, exchange = raw.split(".", 1)
        if exchange in {"SH", "SZ", "BJ"}:
            return f"{code.zfill(6)}.{exchange}"
    digits = "".join(ch for ch in raw if ch.isdigit())
    if len(digits) < 6:
        return None
    code = digits[:6]
    if code.startswith(("6", "9")):
        exchange = "SH"
    elif code.startswith(("8", "4")):
        exchange = "BJ"
    else:
        exchange = "SZ"
    return f"{code}.{exchange}"


def _load_industry_funds() -> list[dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select im.industry_id, im.industry_name, coalesce(im.display_name, im.industry_name) as display_name,
                       fm.fund_id, fm.fund_code, fm.fund_name, fm.theme, ifm.priority_rank
                from industry_master im
                left join industry_fund_mapping ifm on ifm.industry_id = im.industry_id
                left join fund_master fm on fm.fund_id = ifm.fund_id
                where im.active_flag = true
                order by im.sort_order asc, im.industry_id, ifm.priority_rank asc nulls last
                """
            )
            return cur.fetchall()


def _fund_ts_code(fund_code: str | None) -> str | None:
    if not fund_code:
        return None
    return f"{str(fund_code).strip().split('.')[0].zfill(6)}.OF"


def _latest_portfolio_holdings(provider: ProProvider, fund_code: str) -> list[dict[str, Any]]:
    global _LAST_FUND_PORTFOLIO_CALL_AT
    ts_code = _fund_ts_code(fund_code)
    if not ts_code:
        return []
    wait_seconds = FUND_PORTFOLIO_INTERVAL_SECONDS - (time.monotonic() - _LAST_FUND_PORTFOLIO_CALL_AT)
    if wait_seconds > 0:
        time.sleep(wait_seconds)
    _LAST_FUND_PORTFOLIO_CALL_AT = time.monotonic()
    rows = _optional_records(
        provider,
        "fund_portfolio",
        ts_code=ts_code,
        fields="ts_code,ann_date,end_date,symbol,mkv,amount,stk_mkv_ratio,stk_float_ratio",
    )
    grouped: dict[date, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        end_date = _date(row.get("end_date") or row.get("ann_date"))
        stock_code = _normalize_stock_code(row.get("symbol"))
        if end_date and stock_code:
            grouped[end_date].append({**row, "stockCode": stock_code})
    if not grouped:
        return []
    latest_date = max(grouped)
    return grouped[latest_date]


def _keyword_candidates(
    industry_id: str,
    industry_name: str,
    stock_basic: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    keywords = set(THEME_KEYWORDS.get(industry_id, ()))
    keywords.update(part for part in industry_name.replace("/", " ").replace("-", " ").split() if len(part) >= 2)
    if not keywords:
        return []
    candidates = []
    for row in stock_basic:
        text = f"{row.get('name') or ''} {row.get('industry') or ''}".upper()
        if any(keyword.upper() in text for keyword in keywords):
            stock_code = _normalize_stock_code(row.get("ts_code"))
            if stock_code:
                candidates.append({"stockCode": stock_code, "weight": 1.0, "source": "stock_keyword"})
    return candidates[:MAX_STOCKS_PER_INDUSTRY]


def _build_stock_universe(provider: ProProvider, industries: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    stock_basic = _optional_records(
        provider,
        "stock_basic",
        exchange="",
        list_status="L",
        fields="ts_code,symbol,name,area,industry,market,list_date",
    )
    stock_name_by_code = {
        _normalize_stock_code(row.get("ts_code")): {"name": row.get("name"), "industry": row.get("industry")}
        for row in stock_basic
        if _normalize_stock_code(row.get("ts_code"))
    }
    grouped_funds: dict[str, list[dict[str, Any]]] = defaultdict(list)
    industry_names: dict[str, str] = {}
    for row in industries:
        industry_id = row["industry_id"]
        industry_names[industry_id] = row["display_name"] or row["industry_name"]
        if row.get("fund_code"):
            grouped_funds[industry_id].append(row)

    result: dict[str, list[dict[str, Any]]] = {}
    for industry_id, industry_name in industry_names.items():
        weights: dict[str, float] = defaultdict(float)
        sources: dict[str, str] = {}
        for fund in grouped_funds.get(industry_id, [])[:MAX_FUNDS_PER_INDUSTRY]:
            holdings = _latest_portfolio_holdings(provider, fund["fund_code"])
            for holding in holdings:
                stock_code = holding["stockCode"]
                weight = _float(holding.get("stk_mkv_ratio")) or _float(holding.get("stk_float_ratio")) or 1.0
                weights[stock_code] += max(weight, 0.1)
                sources[stock_code] = "fund_portfolio"
        if len(weights) < 12:
            for candidate in _keyword_candidates(industry_id, industry_name, stock_basic):
                stock_code = candidate["stockCode"]
                weights[stock_code] += float(candidate["weight"])
                sources.setdefault(stock_code, str(candidate["source"]))

        ranked = sorted(weights.items(), key=lambda item: item[1], reverse=True)[:MAX_STOCKS_PER_INDUSTRY]
        total_weight = sum(weight for _, weight in ranked) or 1.0
        result[industry_id] = [
            {
                "stockCode": stock_code,
                "stockName": (stock_name_by_code.get(stock_code) or {}).get("name"),
                "stockIndustry": (stock_name_by_code.get(stock_code) or {}).get("industry"),
                "weight": weight / total_weight,
                "source": sources.get(stock_code, "mixed"),
            }
            for stock_code, weight in ranked
        ]
    return result


def _load_price_points(provider: ProProvider, stock_codes: set[str], end_date: date) -> dict[str, list[dict[str, Any]]]:
    start = (end_date - timedelta(days=LOOKBACK_DAYS)).strftime("%Y%m%d")
    end = end_date.strftime("%Y%m%d")
    result: dict[str, list[dict[str, Any]]] = {}
    for index, stock_code in enumerate(sorted(stock_codes), start=1):
        if index % 50 == 0:
            print(f"[tushare mainline] loaded price history for {index}/{len(stock_codes)} stocks")
        rows = _optional_records(
            provider,
            "daily",
            ts_code=stock_code,
            start_date=start,
            end_date=end,
            fields="ts_code,trade_date,open,high,low,close,pct_chg,vol,amount",
        )
        points = [row for row in rows if _date(row.get("trade_date")) and _float(row.get("close")) is not None]
        result[stock_code] = sorted(points, key=lambda row: _date(row.get("trade_date")) or date.min)
    return result


def _load_benchmark_returns(provider: ProProvider, end_date: date) -> dict[str, float | None]:
    start = (end_date - timedelta(days=LOOKBACK_DAYS)).strftime("%Y%m%d")
    end = end_date.strftime("%Y%m%d")
    benchmark_codes = ("000300.SH", "000905.SH", "399006.SZ", "000985.CSI")
    benchmark_points: list[list[dict[str, Any]]] = []
    for code in benchmark_codes:
        rows = _optional_records(
            provider,
            "index_daily",
            ts_code=code,
            start_date=start,
            end_date=end,
            fields="ts_code,trade_date,close,pct_chg,vol,amount",
        )
        points = [row for row in rows if _date(row.get("trade_date")) and _float(row.get("close")) is not None]
        if points:
            benchmark_points.append(sorted(points, key=lambda row: _date(row.get("trade_date")) or date.min))

    def average_return(bars: int) -> float | None:
        values = [value for points in benchmark_points if (value := _bar_return(points, bars)) is not None]
        return _avg(values)

    if not benchmark_points:
        print("[tushare mainline] benchmark index_daily returned no usable data; relative momentum uses neutral defaults.")

    return {
        "return5d": average_return(5),
        "return20d": average_return(20),
        "return60d": average_return(60),
        "return120d": average_return(120),
        "benchmarkCount": float(len(benchmark_points)),
    }


def _by_code(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    result = {}
    for row in rows:
        stock_code = _normalize_stock_code(row.get("ts_code"))
        if stock_code:
            result[stock_code] = row
    return result


def _load_latest_auxiliary(provider: ProProvider, trade_date: date) -> dict[str, dict[str, dict[str, Any]]]:
    raw_date = trade_date.strftime("%Y%m%d")
    daily_basic = _optional_records(
        provider,
        "daily_basic",
        trade_date=raw_date,
        fields="ts_code,trade_date,turnover_rate,volume_ratio,pe_ttm,pb,total_mv,circ_mv",
    )
    moneyflow = _optional_records(
        provider,
        "moneyflow",
        trade_date=raw_date,
        fields=(
            "ts_code,trade_date,buy_sm_amount,sell_sm_amount,buy_md_amount,sell_md_amount,"
            "buy_lg_amount,sell_lg_amount,buy_elg_amount,sell_elg_amount,net_mf_amount"
        ),
    )
    limits = _optional_records(provider, "stk_limit", trade_date=raw_date, fields="ts_code,trade_date,up_limit,down_limit")
    top_list = _optional_records(
        provider,
        "top_list",
        trade_date=raw_date,
        fields="trade_date,ts_code,name,pct_change,amount,buy,sell,net_amount,reason",
    )
    return {
        "dailyBasic": _by_code(daily_basic),
        "moneyflow": _by_code(moneyflow),
        "limit": _by_code(limits),
        "topList": _by_code(top_list),
    }


def _stock_snapshot(
    stock: dict[str, Any],
    points: list[dict[str, Any]],
    auxiliary: dict[str, dict[str, dict[str, Any]]],
) -> dict[str, Any] | None:
    if len(points) < 20:
        return None
    stock_code = stock["stockCode"]
    latest = points[-1]
    close = _float(latest.get("close"))
    latest_date = _date(latest.get("trade_date"))
    if close is None or latest_date is None:
        return None
    limit_row = auxiliary["limit"].get(stock_code) or {}
    up_limit = _float(limit_row.get("up_limit"))
    daily_basic = auxiliary["dailyBasic"].get(stock_code) or {}
    moneyflow = auxiliary["moneyflow"].get(stock_code) or {}
    top_row = auxiliary["topList"].get(stock_code)
    ret20 = _bar_return(points, 20)
    ret60 = _bar_return(points, 60)
    recent_high = max((_float(point.get("close")) or 0.0) for point in points[-60:])
    return {
        **stock,
        "tradeDate": latest_date,
        "close": close,
        "return5d": _bar_return(points, 5),
        "return20d": ret20,
        "return60d": ret60,
        "return120d": _bar_return(points, 120),
        "pctChg": _float(latest.get("pct_chg")),
        "amount": _float(latest.get("amount")),
        "maxDrawdown": _max_drawdown(points[-120:]),
        "volatility": _volatility(points[-80:]),
        "nearHigh60d": recent_high > 0 and close >= recent_high * 0.95,
        "limitUp": bool(up_limit and close >= up_limit * 0.995),
        "turnoverRate": _float(daily_basic.get("turnover_rate")),
        "volumeRatio": _float(daily_basic.get("volume_ratio")),
        "peTtm": _float(daily_basic.get("pe_ttm")),
        "pb": _float(daily_basic.get("pb")),
        "netMfAmount": _float(moneyflow.get("net_mf_amount")),
        "topListReason": top_row.get("reason") if top_row else None,
    }


def _weighted_average(items: list[dict[str, Any]], key: str) -> float | None:
    values = [(item.get(key), item.get("weight") or 0.0) for item in items if item.get(key) is not None]
    total_weight = sum(float(weight) for _, weight in values)
    if total_weight <= 0:
        return None
    return round(sum(float(value) * float(weight) for value, weight in values) / total_weight, 4)


def _weighted_ratio(items: list[dict[str, Any]], predicate) -> float:
    total = sum(float(item.get("weight") or 0.0) for item in items)
    if total <= 0:
        return 0.0
    return round(sum(float(item.get("weight") or 0.0) for item in items if predicate(item)) / total * 100.0, 4)


def _build_industry_metric(industry: dict[str, Any], stocks: list[dict[str, Any]]) -> dict[str, Any]:
    ret5 = _weighted_average(stocks, "return5d")
    ret20 = _weighted_average(stocks, "return20d")
    ret60 = _weighted_average(stocks, "return60d")
    ret120 = _weighted_average(stocks, "return120d")
    avg_drawdown = _weighted_average(stocks, "maxDrawdown")
    avg_volatility = _weighted_average(stocks, "volatility")
    advance20 = _weighted_ratio(stocks, lambda item: (item.get("return20d") or -999) > 0)
    near_high = _weighted_ratio(stocks, lambda item: bool(item.get("nearHigh60d")))
    limit_up = _weighted_ratio(stocks, lambda item: bool(item.get("limitUp")))
    top_list_count = sum(1 for item in stocks if item.get("topListReason"))

    money_values = [float(item["netMfAmount"]) for item in stocks if item.get("netMfAmount") is not None]
    amount_values = [abs(float(item["amount"])) for item in stocks if item.get("amount") is not None]
    money_ratio = (sum(money_values) / sum(amount_values) * 10.0) if amount_values and sum(amount_values) else None
    turnover = _avg([float(item["turnoverRate"]) for item in stocks if item.get("turnoverRate") is not None])
    volume_ratio = _avg([float(item["volumeRatio"]) for item in stocks if item.get("volumeRatio") is not None])
    median_pb = _median([float(item["pb"]) for item in stocks if item.get("pb") is not None and 0 < float(item["pb"]) < 50])
    median_pe = _median([float(item["peTtm"]) for item in stocks if item.get("peTtm") is not None and 0 < float(item["peTtm"]) < 250])

    momentum_score = (
        _score_range(ret20, -8.0, 18.0) * 0.45
        + _score_range(ret60, -15.0, 32.0) * 0.35
        + _score_range(ret120, -22.0, 45.0) * 0.20
    )
    breadth_score = advance20 * 0.52 + near_high * 0.28 + limit_up * 0.20
    capital_score = (
        _score_range(money_ratio, -8.0, 8.0) * 0.45
        + _score_range(turnover, 0.5, 8.0) * 0.22
        + _score_range(volume_ratio, 0.7, 2.5) * 0.18
        + _score_range(float(top_list_count), 0.0, 6.0) * 0.15
    )
    valuation_score = (
        _score_range(median_pb, 12.0, 1.2, 50.0) * 0.55
        + _score_range(median_pe, 90.0, 15.0, 50.0) * 0.45
    )
    overheat = max(0.0, _score_range(ret20, 10.0, 30.0, 0.0) - 40.0)
    risk_score = (
        _score_range(avg_volatility, 18.0, 55.0, 55.0) * 0.35
        + _score_range(avg_drawdown, -8.0, -35.0, 55.0) * 0.35
        + overheat * 0.20
        + _score_range(limit_up, 0.0, 25.0, 0.0) * 0.10
    )
    trend_score = momentum_score * 0.62 + breadth_score * 0.28 + _score_range(ret5, -4.0, 9.0) * 0.10
    opportunity_score = trend_score * 0.36 + capital_score * 0.28 + valuation_score * 0.16 + (100.0 - risk_score) * 0.20

    risk_level = "高" if risk_score >= 75 else "中" if risk_score >= 52 else "低"
    if opportunity_score >= 78 and trend_score >= 68 and risk_score < 72:
        label = "机会增强"
    elif trend_score >= 76 and risk_score >= 72:
        label = "高热观察"
    elif trend_score >= 62:
        label = "趋势确认"
    elif valuation_score >= 70:
        label = "低位关注"
    else:
        label = "继续验证"

    industry_name = industry["display_name"] or industry["industry_name"]
    summary = (
        f"{industry_name}主线分 {opportunity_score:.0f}，趋势 {trend_score:.0f}，资金 {capital_score:.0f}，"
        f"20日表现 {ret20 or 0:.2f}%，上涨扩散 {advance20:.0f}%。"
    )
    focus_reason = (
        "用基金最新披露持仓反推主题股票池，并结合 Tushare 2000 积分可用的日线、每日指标、资金流、涨跌停和龙虎榜数据生成；"
        "适合判断主线强弱和扩散程度，不构成买入建议。"
    )
    tags = []
    if trend_score >= 70:
        tags.append("主线趋强")
    if breadth_score >= 62:
        tags.append("扩散较好")
    if capital_score >= 65:
        tags.append("资金活跃")
    if risk_score >= 72:
        tags.append("短期过热")
    if not tags:
        tags.append("继续验证")

    top_stocks = sorted(stocks, key=lambda item: (item.get("return20d") or -999), reverse=True)[:8]
    methodology = {
        "title": "主线评分口径",
        "content": (
            "趋势分=20/60/120日收益、上涨扩散、60日新高附近比例和涨停扩散；"
            "资金分=资金流代理、换手、量比和龙虎榜活跃度；"
            "风险分=波动、回撤、短期过热和涨停拥挤。"
        ),
        "source": "Tushare 2000-point friendly APIs: daily, daily_basic, moneyflow, stk_limit, top_list, fund_portfolio.",
        "stockCount": len(stocks),
        "topStocks": [
            {
                "stockCode": item["stockCode"],
                "stockName": item.get("stockName"),
                "return20d": item.get("return20d"),
                "return60d": item.get("return60d"),
                "limitUp": item.get("limitUp"),
                "topListReason": item.get("topListReason"),
            }
            for item in top_stocks
        ],
    }

    return {
        "industryId": industry["industry_id"],
        "industryName": industry_name,
        "performance5d": ret5,
        "performance20d": ret20,
        "performance60d": ret60,
        "trendScore": round(max(0.0, min(100.0, trend_score)), 2),
        "capitalScore": round(max(0.0, min(100.0, capital_score)), 2),
        "valuationScore": round(max(0.0, min(100.0, valuation_score)), 2),
        "riskScore": round(max(0.0, min(100.0, risk_score)), 2),
        "riskLevel": risk_level,
        "opportunityScore": round(max(0.0, min(100.0, opportunity_score)), 2),
        "label": label,
        "summary": summary,
        "tags": tags[:3],
        "focusReason": focus_reason,
        "methodology": methodology,
        "fundCount": len(stocks),
    }


def _build_industry_metric_v2(
    industry: dict[str, Any],
    stocks: list[dict[str, Any]],
    benchmark_returns: dict[str, float | None],
) -> dict[str, Any]:
    ret5 = _weighted_average(stocks, "return5d")
    ret20 = _weighted_average(stocks, "return20d")
    ret60 = _weighted_average(stocks, "return60d")
    ret120 = _weighted_average(stocks, "return120d")
    excess5 = round(ret5 - benchmark_returns["return5d"], 4) if ret5 is not None and benchmark_returns["return5d"] is not None else None
    excess20 = round(ret20 - benchmark_returns["return20d"], 4) if ret20 is not None and benchmark_returns["return20d"] is not None else None
    excess60 = round(ret60 - benchmark_returns["return60d"], 4) if ret60 is not None and benchmark_returns["return60d"] is not None else None
    excess120 = round(ret120 - benchmark_returns["return120d"], 4) if ret120 is not None and benchmark_returns["return120d"] is not None else None
    avg_drawdown = _weighted_average(stocks, "maxDrawdown")
    avg_volatility = _weighted_average(stocks, "volatility")
    advance20 = _weighted_ratio(stocks, lambda item: (item.get("return20d") or -999) > 0)
    near_high = _weighted_ratio(stocks, lambda item: bool(item.get("nearHigh60d")))
    limit_up = _weighted_ratio(stocks, lambda item: bool(item.get("limitUp")))
    top_list_count = sum(1 for item in stocks if item.get("topListReason"))

    money_values = [float(item["netMfAmount"]) for item in stocks if item.get("netMfAmount") is not None]
    amount_values = [abs(float(item["amount"])) for item in stocks if item.get("amount") is not None]
    money_ratio = (sum(money_values) / sum(amount_values) * 10.0) if amount_values and sum(amount_values) else None
    turnover = _avg([float(item["turnoverRate"]) for item in stocks if item.get("turnoverRate") is not None])
    volume_ratio = _avg([float(item["volumeRatio"]) for item in stocks if item.get("volumeRatio") is not None])
    median_pb = _median([float(item["pb"]) for item in stocks if item.get("pb") is not None and 0 < float(item["pb"]) < 50])
    median_pe = _median([float(item["peTtm"]) for item in stocks if item.get("peTtm") is not None and 0 < float(item["peTtm"]) < 250])

    absolute_momentum_score = (
        _score_range(ret20, -8.0, 18.0) * 0.45
        + _score_range(ret60, -15.0, 32.0) * 0.35
        + _score_range(ret120, -22.0, 45.0) * 0.20
    )
    relative_momentum_score = (
        _score_range(excess20, -6.0, 16.0) * 0.45
        + _score_range(excess60, -10.0, 24.0) * 0.35
        + _score_range(excess120, -14.0, 32.0) * 0.20
    )
    breadth_score = advance20 * 0.52 + near_high * 0.28 + limit_up * 0.20
    alignment_count = sum(1 for value in (ret20, ret60, ret120) if value is not None and value > 0)
    excess_alignment_count = sum(1 for value in (excess20, excess60, excess120) if value is not None and value > 0)
    acceleration_score = 50.0
    if ret20 is not None and ret60 is not None:
        acceleration_score = _score_range(ret20 - ret60 / 3.0, -5.0, 12.0)
    trend_quality_score = (
        (alignment_count / 3.0 * 100.0) * 0.25
        + (excess_alignment_count / 3.0 * 100.0) * 0.25
        + breadth_score * 0.28
        + near_high * 0.12
        + acceleration_score * 0.10
    )
    capital_score = (
        _score_range(money_ratio, -8.0, 8.0) * 0.40
        + _score_range(turnover, 0.5, 8.0) * 0.25
        + _score_range(volume_ratio, 0.7, 2.5) * 0.20
        + _score_range(float(top_list_count), 0.0, 6.0) * 0.15
    )
    valuation_score = (
        _score_range(median_pb, 12.0, 1.2, 50.0) * 0.55
        + _score_range(median_pe, 90.0, 15.0, 50.0) * 0.45
    )
    overheat = max(0.0, _score_range(ret20, 10.0, 30.0, 0.0) - 40.0)
    risk_score = (
        _score_range(avg_volatility, 18.0, 55.0, 55.0) * 0.35
        + _score_range(avg_drawdown, -8.0, -35.0, 55.0) * 0.35
        + overheat * 0.20
        + _score_range(limit_up, 0.0, 25.0, 0.0) * 0.10
    )
    trend_score = relative_momentum_score * 0.50 + absolute_momentum_score * 0.25 + trend_quality_score * 0.25
    risk_adjusted_score = max(0.0, min(100.0, 100.0 - risk_score))
    opportunity_score = trend_score * 0.45 + breadth_score * 0.25 + risk_adjusted_score * 0.20 + capital_score * 0.10

    risk_level = "高" if risk_score >= 75 else "中" if risk_score >= 52 else "低"
    if opportunity_score >= 78 and trend_score >= 68 and risk_score < 72:
        label = "机会增强"
    elif trend_score >= 76 and risk_score >= 72:
        label = "高热观察"
    elif trend_score >= 62:
        label = "趋势确认"
    elif valuation_score >= 70:
        label = "低位关注"
    else:
        label = "继续验证"

    industry_name = industry["display_name"] or industry["industry_name"]
    summary = (
        f"{industry_name}主线分 {opportunity_score:.0f}，趋势 {trend_score:.0f}，扩散 {breadth_score:.0f}，资金确认 {capital_score:.0f}；"
        f"20日表现 {ret20 or 0:.2f}%，20日超额 {excess20 or 0:.2f}%，上涨扩散 {advance20:.0f}%。"
    )
    focus_reason = (
        "动量优先：用主题股票池相对宽基的超额收益识别主线，再用上涨扩散、回撤和资金活跃度确认；"
        "资金流只做验证，不直接决定买入优先级。"
    )
    tags = []
    if trend_score >= 70:
        tags.append("主线趋强")
    if breadth_score >= 62:
        tags.append("扩散较好")
    if capital_score >= 65:
        tags.append("资金确认")
    if risk_score >= 72:
        tags.append("短期过热")
    if not tags:
        tags.append("继续验证")

    top_stocks = sorted(stocks, key=lambda item: (item.get("return20d") or -999), reverse=True)[:8]
    methodology = {
        "title": "主线评分口径",
        "content": "趋势分=相对动量50%+绝对动量25%+趋势质量25%；机会分=趋势45%+扩散25%+风险调整20%+资金确认10%。资金流只做趋势验证。",
        "source": "Tushare 2000-point friendly APIs: daily, daily_basic, moneyflow, stk_limit, top_list, fund_portfolio, index_daily.",
        "stockCount": len(stocks),
        "benchmark": {
            "return5d": benchmark_returns["return5d"],
            "return20d": benchmark_returns["return20d"],
            "return60d": benchmark_returns["return60d"],
            "return120d": benchmark_returns["return120d"],
            "benchmarkCount": benchmark_returns["benchmarkCount"],
        },
        "factors": {
            "absoluteMomentumScore": round(absolute_momentum_score, 2),
            "relativeMomentumScore": round(relative_momentum_score, 2),
            "trendQualityScore": round(trend_quality_score, 2),
            "breadthScore": round(breadth_score, 2),
            "riskAdjustedScore": round(risk_adjusted_score, 2),
            "excess5d": excess5,
            "excess20d": excess20,
            "excess60d": excess60,
            "excess120d": excess120,
            "moneyflowToAmountRatio": round(money_ratio, 4) if money_ratio is not None else None,
            "advance20dRatio": advance20,
            "nearHigh60dRatio": near_high,
            "limitUpWeightRatio": limit_up,
            "topListCount": top_list_count,
        },
        "topStocks": [
            {
                "stockCode": item["stockCode"],
                "stockName": item.get("stockName"),
                "return20d": item.get("return20d"),
                "return60d": item.get("return60d"),
                "limitUp": item.get("limitUp"),
                "topListReason": item.get("topListReason"),
            }
            for item in top_stocks
        ],
    }

    return {
        "industryId": industry["industry_id"],
        "industryName": industry_name,
        "performance5d": ret5,
        "performance20d": ret20,
        "performance60d": ret60,
        "trendScore": round(max(0.0, min(100.0, trend_score)), 2),
        "capitalScore": round(max(0.0, min(100.0, capital_score)), 2),
        "valuationScore": round(max(0.0, min(100.0, valuation_score)), 2),
        "riskScore": round(max(0.0, min(100.0, risk_score)), 2),
        "riskLevel": risk_level,
        "opportunityScore": round(max(0.0, min(100.0, opportunity_score)), 2),
        "label": label,
        "summary": summary,
        "tags": tags[:3],
        "focusReason": focus_reason,
        "methodology": methodology,
        "fundCount": len(stocks),
    }


def _persist(metrics: list[dict[str, Any]], trade_date: date, batch_id: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "delete from industry_daily_metrics where trade_date = %s and data_version = %s",
                (trade_date, DATA_VERSION),
            )
            cur.execute(
                "delete from industry_opportunity_daily where trade_date = %s and data_version = %s",
                (trade_date, DATA_VERSION),
            )
            cur.execute(
                "delete from industry_events_daily where trade_date = %s and data_version = %s",
                (trade_date, DATA_VERSION),
            )
            for metric in metrics:
                cur.execute(
                    """
                    insert into industry_daily_metrics (
                        trade_date, industry_id, performance_5d, performance_20d, performance_60d,
                        trend_score, capital_score, valuation_score, risk_score, risk_level, fund_count,
                        source_batch_id, data_version, created_at, updated_at
                    )
                    values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
                    """,
                    (
                        trade_date,
                        metric["industryId"],
                        metric["performance5d"],
                        metric["performance20d"],
                        metric["performance60d"],
                        metric["trendScore"],
                        metric["capitalScore"],
                        metric["valuationScore"],
                        metric["riskScore"],
                        metric["riskLevel"],
                        metric["fundCount"],
                        batch_id,
                        DATA_VERSION,
                    ),
                )
                cur.execute(
                    """
                    insert into industry_opportunity_daily (
                        trade_date, industry_id, opportunity_score, trend_score, capital_score, valuation_score,
                        risk_level, label, summary, tags_json, methodology_json, focus_reason,
                        source_batch_id, data_version, created_at, updated_at
                    )
                    values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
                    """,
                    (
                        trade_date,
                        metric["industryId"],
                        metric["opportunityScore"],
                        metric["trendScore"],
                        metric["capitalScore"],
                        metric["valuationScore"],
                        metric["riskLevel"],
                        metric["label"],
                        metric["summary"],
                        Jsonb(metric["tags"]),
                        Jsonb(metric["methodology"]),
                        metric["focusReason"],
                        batch_id,
                        DATA_VERSION,
                    ),
                )
                top_stocks = metric["methodology"].get("topStocks") or []
                for index, stock in enumerate(top_stocks[:3], start=1):
                    cur.execute(
                        """
                        insert into industry_events_daily (
                            trade_date, industry_id, event_date, event_title, event_summary, event_type, priority_rank,
                            source_batch_id, data_version, created_at, updated_at
                        )
                        values (%s, %s, %s, %s, %s, 'mainline_stock', %s, %s, %s, now(), now())
                        """,
                        (
                            trade_date,
                            metric["industryId"],
                            trade_date,
                            f"{stock.get('stockName') or stock.get('stockCode')} 主题强势样本",
                            f"20日 {stock.get('return20d')}%，60日 {stock.get('return60d')}%，龙虎榜：{stock.get('topListReason') or '无'}。",
                            index,
                            batch_id,
                            DATA_VERSION,
                        ),
                    )
        conn.commit()


def refresh_mainline_industries(trade_date: date) -> dict[str, Any]:
    provider = ProProvider()
    if not provider.enabled:
        raise RuntimeError("Tushare Pro is not enabled. Set TUSHARE_ENABLE=true and TUSHARE_TOKEN in backend/.env.")

    industry_rows = _load_industry_funds()
    if not industry_rows:
        return {"tradeDate": trade_date.isoformat(), "industryCount": 0, "stockCount": 0, "metrics": []}

    industries = {}
    for row in industry_rows:
        industries[row["industry_id"]] = {
            "industry_id": row["industry_id"],
            "industry_name": row["industry_name"],
            "display_name": row["display_name"],
        }

    stock_universe = _build_stock_universe(provider, industry_rows)
    all_stock_codes = {item["stockCode"] for stocks in stock_universe.values() for item in stocks}
    if not all_stock_codes:
        return {"tradeDate": trade_date.isoformat(), "industryCount": len(industries), "stockCount": 0, "metrics": []}

    price_points = _load_price_points(provider, all_stock_codes, trade_date)
    latest_dates = [
        _date(points[-1].get("trade_date"))
        for points in price_points.values()
        if points and _date(points[-1].get("trade_date"))
    ]
    metric_trade_date = max(latest_dates) if latest_dates else trade_date
    auxiliary = _load_latest_auxiliary(provider, metric_trade_date)
    benchmark_returns = _load_benchmark_returns(provider, metric_trade_date)

    metrics = []
    for industry_id, stock_items in stock_universe.items():
        snapshots = [
            snapshot
            for stock in stock_items
            if (snapshot := _stock_snapshot(stock, price_points.get(stock["stockCode"], []), auxiliary))
        ]
        if len(snapshots) < 6:
            print(f"[tushare mainline] skip industry={industry_id}, stock sample too small: {len(snapshots)}")
            continue
        metrics.append(_build_industry_metric_v2(industries[industry_id], snapshots, benchmark_returns))

    metrics.sort(key=lambda item: item["opportunityScore"], reverse=True)
    batch_id = build_batch_id(metric_trade_date)
    _persist(metrics, metric_trade_date, batch_id)

    output_dir = get_trade_archive_raw_dir(metric_trade_date)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "tushare_mainline_industry_refresh.json"
    output_path.write_text(
        json.dumps(
            {
                "tradeDate": metric_trade_date.isoformat(),
                "dataVersion": DATA_VERSION,
                "industryCount": len(metrics),
                "stockCount": len(all_stock_codes),
                "metrics": metrics,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    return {
        "tradeDate": metric_trade_date.isoformat(),
        "dataVersion": DATA_VERSION,
        "industryCount": len(metrics),
        "stockCount": len(all_stock_codes),
        "outputPath": str(output_path),
        "topIndustries": [
            {
                "industryId": item["industryId"],
                "industryName": item["industryName"],
                "opportunityScore": item["opportunityScore"],
                "label": item["label"],
            }
            for item in metrics[:8]
        ],
    }


def main() -> None:
    requested_trade_date = resolve_trade_date()
    batch_id = build_batch_id(requested_trade_date)
    log_job_start(JOB_NAME, batch_id, requested_trade_date)
    try:
        result = refresh_mainline_industries(requested_trade_date)
        log_job_end(
            JOB_NAME,
            batch_id,
            _date(result.get("tradeDate")) or requested_trade_date,
            run_status="success" if result["industryCount"] else "skipped",
            processed_count=result["industryCount"],
        )
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as exc:
        log_job_end(JOB_NAME, batch_id, requested_trade_date, run_status="failed", error_message=str(exc))
        raise


if __name__ == "__main__":
    main()
