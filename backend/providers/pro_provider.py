from __future__ import annotations

import math
import json
import re
import time
from datetime import date, datetime, timedelta
from typing import Any
from urllib import request

from config.settings import get_settings
from providers.base import FundDailyMetricsRow, FundMasterRow, FundUniverseItem


def _safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number != number:
        return None
    return round(number, 4)


def _safe_date(value: Any) -> date | None:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw or raw in {"nan", "None", "--"}:
        return None
    for fmt in ("%Y%m%d", "%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def _aum_yi_from_nav_row(row: dict[str, Any] | None) -> float | None:
    if not row:
        return None
    value = _safe_float(row.get("total_netasset") or row.get("net_asset"))
    if value is None or value <= 0:
        return None
    # Tushare fund_nav commonly returns fund net assets in yuan. The rest of
    # this app stores AUM in yi yuan, while older rows may already be yi.
    if value >= 1000000:
        return round(value / 100000000.0, 4)
    return value


def _aum_yi_from_share_row(row: dict[str, Any] | None, latest_nav: float | None) -> float | None:
    if not row or latest_nav is None or latest_nav <= 0:
        return None
    share_wan = _safe_float(row.get("fd_share"))
    if share_wan is None or share_wan <= 0:
        return None
    return round(share_wan * latest_nav / 10000.0, 4)


def _extract_json_var(script: str, var_name: str) -> Any:
    pattern = re.compile(rf"var\s+{re.escape(var_name)}\s*=\s*(.*?);/\*", re.S)
    match = pattern.search(script)
    if not match:
        pattern = re.compile(rf"{re.escape(var_name)}\s*=\s*(.*?);", re.S)
        match = pattern.search(script)
    if not match:
        return None
    try:
        return json.loads(match.group(1).strip())
    except json.JSONDecodeError:
        return None


class SimpleFrame:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self._rows = rows
        self.columns = list(rows[0].keys()) if rows else []
        self.shape = (len(rows), len(self.columns))

    def to_dict(self, orient: str = "records") -> list[dict[str, Any]]:
        if orient != "records":
            raise ValueError("SimpleFrame only supports orient='records'")
        return self._rows

    def head(self, limit: int = 5) -> "SimpleFrame":
        return SimpleFrame(self._rows[:limit])


def _find_latest_on_or_before(points: list[tuple[date, float]], target: date) -> float | None:
    eligible = [value for point_date, value in points if point_date <= target]
    return eligible[-1] if eligible else None


def _compute_return(points: list[tuple[date, float]], reference_date: date, days: int) -> float | None:
    if not points:
        return None
    latest_value = points[-1][1]
    base_value = _find_latest_on_or_before(points, reference_date - timedelta(days=days))
    if base_value in (None, 0):
        return None
    return round((latest_value / base_value - 1.0) * 100.0, 4)


def _compute_latest_return(points: list[tuple[date, float]]) -> float | None:
    if len(points) < 2:
        return None
    previous = points[-2][1]
    latest = points[-1][1]
    if not previous:
        return None
    return round((latest / previous - 1.0) * 100.0, 4)


def _compute_drawdown(points: list[tuple[date, float]]) -> float | None:
    if len(points) < 2:
        return None
    peak = points[0][1]
    max_drawdown = 0.0
    for _, value in points:
        peak = max(peak, value)
        if peak <= 0:
            continue
        max_drawdown = min(max_drawdown, value / peak - 1.0)
    return round(max_drawdown * 100.0, 4)


def _compute_volatility(points: list[tuple[date, float]]) -> float | None:
    if len(points) < 8:
        return None
    log_returns: list[float] = []
    for index in range(1, len(points)):
        previous = points[index - 1][1]
        current = points[index][1]
        if previous and previous > 0 and current > 0:
            log_returns.append(math.log(current / previous))
    if len(log_returns) < 5:
        return None
    mean = sum(log_returns) / len(log_returns)
    variance = sum((item - mean) ** 2 for item in log_returns) / max(len(log_returns) - 1, 1)
    return round((variance**0.5) * (252**0.5) * 100.0, 4)


def _normalize_code(value: str) -> str:
    return str(value or "").strip().split(".")[0].zfill(6)


def _to_ts_code(fund_code: str) -> str:
    raw = str(fund_code or "").strip().upper()
    if "." in raw:
        return raw
    code = _normalize_code(raw)
    if code.startswith(("50", "51", "52", "56", "58")):
        return f"{code}.SH"
    if code.startswith(("15", "16", "18")):
        return f"{code}.SZ"
    return f"{code}.OF"


def _fund_nav_points(records: list[dict[str, Any]]) -> list[tuple[date, float]]:
    points: list[tuple[date, float]] = []
    for row in records:
        point_date = _safe_date(row.get("nav_date") or row.get("ann_date") or row.get("end_date"))
        nav = _safe_float(row.get("unit_nav") or row.get("accum_nav"))
        if point_date and nav is not None:
            points.append((point_date, nav))
    return sorted(points, key=lambda item: item[0])


def _fund_daily_points(records: list[dict[str, Any]]) -> list[tuple[date, float]]:
    points: list[tuple[date, float]] = []
    for row in records:
        point_date = _safe_date(row.get("trade_date"))
        close = _safe_float(row.get("close"))
        if point_date and close is not None:
            points.append((point_date, close))
    return sorted(points, key=lambda item: item[0])


def _classify_fund_type(raw_type: str, fund_name: str) -> str:
    text = f"{raw_type} {fund_name}".upper()
    if "QDII" in text:
        return "QDII"
    if "ETF" in text:
        return "ETF"
    if "指数" in text or "联接" in text:
        return "联接基金"
    return "主动基金"


class ProProvider:
    """Paid data source adapter.

    The first implementation target is Tushare Pro. It is intentionally thin:
    fund NAV remains on the AKShare/Eastmoney path for now, while Tushare is
    used to enhance index, industry, and holding-through analysis when enabled.
    """

    provider_name = "pro"

    def __init__(self) -> None:
        self._settings = get_settings()
        self._pro = None
        self._fund_basic_cache: list[dict[str, Any]] | None = None
        self._last_call_at = 0.0

    @property
    def enabled(self) -> bool:
        return bool(self._settings.tushare_enable and self._settings.tushare_token)

    def _client(self):
        if not self.enabled:
            raise RuntimeError("Tushare Pro is not enabled. Set TUSHARE_ENABLE=true and TUSHARE_TOKEN in backend/.env.")
        if self._pro is not None:
            return self._pro

        try:
            import tushare as ts  # type: ignore
        except ModuleNotFoundError as exc:  # pragma: no cover
            raise RuntimeError("tushare is not installed. Install it before enabling Tushare Pro.") from exc

        if not hasattr(ts, "set_token"):
            self._pro = "http"
            return self._pro

        ts.set_token(self._settings.tushare_token)
        self._pro = ts.pro_api()
        return self._pro

    def _call(self, api_name: str, **kwargs) -> Any:
        last_error: Exception | None = None
        retry_count = max(self._settings.tushare_retry_count, 1)
        for attempt in range(1, retry_count + 1):
            try:
                if attempt > 1:
                    time.sleep(max(self._settings.tushare_retry_backoff_seconds, 0.5) * attempt)
                self._sleep_for_rate_limit()
                client = self._client()
                if client == "http":
                    return self._http_call(api_name, **kwargs)
                return getattr(client, api_name)(**kwargs)
            except Exception as exc:  # pragma: no cover
                last_error = exc
                print(f"[Tushare retry] api={api_name} attempt={attempt}/{retry_count} error={exc}")
        raise RuntimeError(f"Tushare request failed after retries: {api_name}") from last_error

    def _http_call(self, api_name: str, **kwargs) -> SimpleFrame:
        fields = kwargs.pop("fields", "")
        payload = {
            "api_name": api_name,
            "token": self._settings.tushare_token,
            "params": kwargs,
            "fields": fields,
        }
        body = json.dumps(payload).encode("utf-8")
        http_request = request.Request(
            "http://api.tushare.pro",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        timeout = max(float(self._settings.tushare_request_timeout_seconds), 5.0)
        with request.urlopen(http_request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
        parsed = json.loads(raw)
        if parsed.get("code") != 0:
            raise RuntimeError(parsed.get("msg") or f"Tushare HTTP request failed: {api_name}")
        data = parsed.get("data") or {}
        columns = data.get("fields") or []
        rows = [dict(zip(columns, item)) for item in data.get("items") or []]
        return SimpleFrame(rows)

    def _sleep_for_rate_limit(self) -> None:
        interval = max(float(self._settings.tushare_min_interval_seconds), 0.0)
        if interval <= 0:
            return
        now = time.monotonic()
        wait_seconds = interval - (now - self._last_call_at)
        if wait_seconds > 0:
            time.sleep(wait_seconds)
        self._last_call_at = time.monotonic()

    def search_funds(self, query: str, limit: int = 12) -> list[dict[str, str]]:
        if not self.enabled:
            raise NotImplementedError("Pro data source is not enabled. Use AKShare first.")
        records = self.get_fund_basic_records()
        keyword = query.strip()
        matched = [
            {
                "fundCode": str(row.get("ts_code") or row.get("symbol") or "").split(".")[0],
                "fundName": str(row.get("name") or ""),
                "fundType": str(row.get("fund_type") or ""),
                "fundCompany": str(row.get("management") or ""),
                "sourceName": "tushare",
            }
            for row in records
            if keyword and (keyword in str(row.get("name") or "") or keyword in str(row.get("ts_code") or ""))
        ]
        return matched[:limit]

    def get_fund_basic_records(self) -> list[dict[str, Any]]:
        if self._fund_basic_cache is not None:
            return self._fund_basic_cache
        records: list[dict[str, Any]] = []
        for market in ("O", "E"):
            frame = self._call(
                "fund_basic",
                market=market,
                status="L",
                fields="ts_code,name,management,custodian,fund_type,found_date,list_date",
            )
            if hasattr(frame, "to_dict"):
                records.extend(frame.to_dict("records"))
        self._fund_basic_cache = records
        return records

    def get_fund_basic_entry(self, fund_code: str) -> dict[str, Any] | None:
        normalized = _normalize_code(fund_code)
        for row in self.get_fund_basic_records():
            if _normalize_code(str(row.get("ts_code") or "")) == normalized:
                return row
        return None

    def get_fund_ts_code(self, fund_code: str) -> str:
        basic = self.get_fund_basic_entry(fund_code) or {}
        ts_code = str(basic.get("ts_code") or "").strip().upper()
        return ts_code or _to_ts_code(fund_code)

    def build_master_row(self, item: FundUniverseItem) -> FundMasterRow:
        basic = self.get_fund_basic_entry(item.fund_code) or {}
        name = str(basic.get("name") or item.tracking_target or item.fund_code)
        raw_type = str(basic.get("fund_type") or "")
        return FundMasterRow(
            fund_id=item.fund_id,
            fund_code=item.normalized_code,
            fund_name=name,
            fund_type=_classify_fund_type(raw_type, name),
            theme=item.theme,
            tracking_target=item.tracking_target or name,
            fund_company=str(basic.get("management") or ""),
            tradable_on_exchange="ETF" in name.upper(),
            fee_rate=None,
            inception_date=(_safe_date(basic.get("found_date")) or _safe_date(basic.get("list_date"))).isoformat()
            if (_safe_date(basic.get("found_date")) or _safe_date(basic.get("list_date")))
            else None,
        )

    def get_nav_points(self, fund_code: str, end_date: date, lookback_days: int = 260) -> list[tuple[date, float]]:
        start_date = end_date - timedelta(days=lookback_days)
        ts_code = self.get_fund_ts_code(fund_code)
        frame = self.fund_nav(
            ts_code=ts_code,
            start_date=start_date.strftime("%Y%m%d"),
            end_date=end_date.strftime("%Y%m%d"),
            fields="ts_code,ann_date,unit_nav,accum_nav,net_asset,total_netasset",
        )
        records = frame.to_dict("records") if hasattr(frame, "to_dict") else []
        points = _fund_nav_points(records)
        if points or not ts_code.endswith((".SH", ".SZ")):
            return points
        daily_frame = self.fund_daily(
            ts_code=ts_code,
            start_date=start_date.strftime("%Y%m%d"),
            end_date=end_date.strftime("%Y%m%d"),
            fields="ts_code,trade_date,close,pre_close,amount",
        )
        daily_records = daily_frame.to_dict("records") if hasattr(daily_frame, "to_dict") else []
        return _fund_daily_points(daily_records)

    def build_daily_metrics_row(
        self, item: FundUniverseItem, trade_date: date, include_aum: bool = True
    ) -> FundDailyMetricsRow:
        ts_code = self.get_fund_ts_code(item.fund_code)
        frame = self.fund_nav(
            ts_code=ts_code,
            start_date=(trade_date - timedelta(days=self._settings.akshare_history_lookback_days)).strftime("%Y%m%d"),
            end_date=trade_date.strftime("%Y%m%d"),
            fields="ts_code,ann_date,nav_date,end_date,unit_nav,accum_nav,net_asset,total_netasset",
        )
        records = frame.to_dict("records") if hasattr(frame, "to_dict") else []
        records = sorted(records, key=lambda row: _safe_date(row.get("nav_date") or row.get("ann_date") or row.get("end_date")) or date.min)
        points = _fund_nav_points(records)
        if not points and ts_code.endswith((".SH", ".SZ")):
            daily_frame = self.fund_daily(
                ts_code=ts_code,
                start_date=(trade_date - timedelta(days=self._settings.akshare_history_lookback_days)).strftime("%Y%m%d"),
                end_date=trade_date.strftime("%Y%m%d"),
                fields="ts_code,trade_date,close,pre_close,amount",
            )
            daily_records = daily_frame.to_dict("records") if hasattr(daily_frame, "to_dict") else []
            points = _fund_daily_points(daily_records)
        latest_nav = points[-1][1] if points else None
        previous_nav = points[-2][1] if len(points) >= 2 else None
        latest_date = points[-1][0] if points else trade_date
        previous_date = points[-2][0] if len(points) >= 2 else None
        founded_years = None
        basic = self.get_fund_basic_entry(item.fund_code) or {}
        found_date = _safe_date(basic.get("found_date") or basic.get("list_date"))
        if found_date:
            founded_years = max(0, int((latest_date - found_date).days / 365.25))
        aum = _aum_yi_from_nav_row(records[-1] if records else None)
        if include_aum and aum is None and latest_nav is not None:
            aum = self.get_latest_fund_share_aum(item.fund_code, trade_date, latest_nav)
        return FundDailyMetricsRow(
            fund_id=item.fund_id,
            return_1d=_compute_latest_return(points),
            return_1m=_compute_return(points, latest_date, 30),
            return_3m=_compute_return(points, latest_date, 90),
            return_6m=_compute_return(points, latest_date, 180),
            max_drawdown=_compute_drawdown(points),
            volatility=_compute_volatility(points),
            aum=aum,
            latest_nav=latest_nav,
            previous_nav=previous_nav,
            latest_nav_date=latest_date.isoformat() if points else None,
            previous_nav_date=previous_date.isoformat() if previous_date else None,
            founded_years=founded_years,
            top_holdings="",
            concentration_label="待补充",
            tracking_deviation_note="Tushare fund_nav 已增强净值与收益；费率、持仓和规模仍需 AKShare/天天基金或基金公告补充。",
        )

    def fund_basic(self, **kwargs):
        return self._call("fund_basic", **kwargs)

    def fund_nav(self, **kwargs):
        return self._call("fund_nav", **kwargs)

    def fund_portfolio(self, **kwargs):
        return self._call("fund_portfolio", **kwargs)

    def fund_daily(self, **kwargs):
        return self._call("fund_daily", **kwargs)

    def fund_share(self, **kwargs):
        return self._call("fund_share", **kwargs)

    def get_latest_fund_share_aum(self, fund_code: str, end_date: date, latest_nav: float) -> float | None:
        start_date = end_date - timedelta(days=90)
        rows = self.fund_share(
            ts_code=self.get_fund_ts_code(fund_code),
            start_date=start_date.strftime("%Y%m%d"),
            end_date=end_date.strftime("%Y%m%d"),
            fields="ts_code,trade_date,fd_share",
        )
        records = rows.to_dict("records") if hasattr(rows, "to_dict") else []
        records = sorted(records, key=lambda row: _safe_date(row.get("trade_date")) or date.min)
        return _aum_yi_from_share_row(records[-1] if records else None, latest_nav)

    def get_eastmoney_aum_yi(self, fund_code: str) -> float | None:
        code = _normalize_code(fund_code)
        http_request = request.Request(
            f"https://fund.eastmoney.com/pingzhongdata/{code}.js",
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": f"https://fund.eastmoney.com/{code}.html",
            },
        )
        timeout = max(float(self._settings.tushare_request_timeout_seconds), 5.0)
        with request.urlopen(http_request, timeout=timeout) as response:
            script = response.read().decode("utf-8", errors="ignore")
        asset_allocation = _extract_json_var(script, "Data_assetAllocation")
        if not isinstance(asset_allocation, dict):
            return None
        for series in asset_allocation.get("series") or []:
            name = str(series.get("name") or "")
            if "净资产" not in name:
                continue
            values = [_safe_float(item) for item in (series.get("data") or [])]
            values = [item for item in values if item is not None and item > 0]
            if values:
                return round(values[-1], 4)
        return None

    def stock_basic(self, **kwargs):
        return self._call("stock_basic", **kwargs)

    def daily(self, **kwargs):
        return self._call("daily", **kwargs)

    def daily_basic(self, **kwargs):
        return self._call("daily_basic", **kwargs)

    def moneyflow(self, **kwargs):
        return self._call("moneyflow", **kwargs)

    def stk_limit(self, **kwargs):
        return self._call("stk_limit", **kwargs)

    def top_list(self, **kwargs):
        return self._call("top_list", **kwargs)

    def index_classify(self, **kwargs):
        return self._call("index_classify", **kwargs)

    def index_daily(self, **kwargs):
        return self._call("index_daily", **kwargs)
