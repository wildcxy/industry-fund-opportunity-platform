import math
import random
import time
from datetime import date, datetime, timedelta
from typing import Any

from config.settings import get_settings
from providers.base import FundDailyMetricsRow, FundMasterRow, FundUniverseItem


def _require_akshare():
    try:
        import akshare as ak  # type: ignore
    except ModuleNotFoundError as exc:  # pragma: no cover
        raise RuntimeError("AKShare is not installed. Install backend requirements before running AKShare jobs.") from exc
    return ak


def _normalize_code(value: Any) -> str:
    return str(value or "").strip().zfill(6)


def _safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    if isinstance(value, float) and math.isnan(value):
        return default
    return str(value).strip()


def _safe_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, float):
        if math.isnan(value):
            return None
        return round(float(value), 4)

    raw = str(value).strip().replace("%", "").replace(",", "")
    if not raw or raw in {"nan", "None", "--"}:
        return None

    multiplier = 1.0
    if raw.endswith("\u4ebf"):
        raw = raw[:-1]
        multiplier = 100000000.0
    elif raw.endswith("\u4e07"):
        raw = raw[:-1]
        multiplier = 10000.0

    try:
        return round(float(raw) * multiplier, 4)
    except ValueError:
        return None


def _safe_aum_yi(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, float):
        if math.isnan(value):
            return None
        return round(float(value), 4)

    raw = str(value).strip().replace(",", "")
    if not raw or raw in {"nan", "None", "--"}:
        return None

    try:
        if raw.endswith("\u4ebf\u5143"):
            return round(float(raw[:-2]), 4)
        if raw.endswith("\u4ebf"):
            return round(float(raw[:-1]), 4)
        if raw.endswith("\u4e07\u5143"):
            return round(float(raw[:-2]) / 10000.0, 4)
        if raw.endswith("\u4e07"):
            return round(float(raw[:-1]) / 10000.0, 4)
        return round(float(raw), 4)
    except ValueError:
        return None


def _safe_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value

    raw = str(value).strip()
    if not raw or raw in {"nan", "None", "--"}:
        return None

    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def _to_records(frame: Any) -> list[dict[str, Any]]:
    if frame is None:
        return []
    if hasattr(frame, "to_dict"):
        return frame.to_dict("records")
    return list(frame)


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
        drawdown = value / peak - 1.0
        max_drawdown = min(max_drawdown, drawdown)
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


class AKShareFundProvider:
    def __init__(self) -> None:
        settings = get_settings()
        self._settings = settings
        self._sleep_min = min(settings.akshare_sleep_min_seconds, settings.akshare_sleep_max_seconds)
        self._sleep_max = max(settings.akshare_sleep_min_seconds, settings.akshare_sleep_max_seconds)
        self._retry_count = max(settings.akshare_retry_count, 1)
        self._retry_backoff_seconds = max(settings.akshare_retry_backoff_seconds, 0.5)
        self._lookback_days = max(settings.akshare_history_lookback_days, 120)
        self._ak = _require_akshare()
        self._catalog_cache: dict[str, dict[str, Any]] | None = None
        self._holdings_cache: dict[tuple[str, int], list[dict[str, Any]]] = {}
        self._open_daily_cache: dict[str, dict[str, Any]] | None = None
        self._etf_daily_cache: dict[str, dict[str, Any]] | None = None

    def sleep_between_requests(self) -> None:
        time.sleep(random.uniform(self._sleep_min, self._sleep_max))

    def cool_down_between_chunks(self) -> None:
        time.sleep(max(self._settings.akshare_chunk_cooldown_seconds, 0))

    def chunked(self, items: list[FundUniverseItem]) -> list[list[FundUniverseItem]]:
        size = max(self._settings.akshare_chunk_size, 1)
        return [items[index : index + size] for index in range(0, len(items), size)]

    def _call(self, label: str, func, *args, **kwargs):
        last_error: Exception | None = None
        for attempt in range(1, self._retry_count + 1):
            try:
                if attempt > 1:
                    time.sleep(self._retry_backoff_seconds * attempt)
                self.sleep_between_requests()
                return func(*args, **kwargs)
            except Exception as exc:  # pragma: no cover
                last_error = exc
                print(f"[AKShare retry] label={label} attempt={attempt}/{self._retry_count} error={exc}")
        raise RuntimeError(f"AKShare request failed after retries: {label}") from last_error

    def _try_call(self, label: str, func, *args, **kwargs):
        try:
            return self._call(label, func, *args, **kwargs)
        except Exception as exc:  # pragma: no cover
            print(f"[AKShare skip] label={label} error={exc}")
            return None

    def get_fund_catalog(self) -> dict[str, dict[str, Any]]:
        if self._catalog_cache is not None:
            return self._catalog_cache

        records = _to_records(self._call("fund_name_em", self._ak.fund_name_em))
        catalog: dict[str, dict[str, Any]] = {}
        for row in records:
            values = list(row.values())
            if not values:
                continue
            code = _normalize_code(values[0])
            if code:
                catalog[code] = row
        self._catalog_cache = catalog
        return catalog

    def get_catalog_entry(self, fund_code: str) -> dict[str, Any]:
        return self.get_fund_catalog().get(_normalize_code(fund_code), {})

    def get_catalog_name(self, fund_code: str) -> str:
        row = self.get_catalog_entry(fund_code)
        values = list(row.values())
        if len(values) >= 3:
            return _safe_str(values[2])
        return ""

    def get_catalog_type(self, fund_code: str) -> str:
        row = self.get_catalog_entry(fund_code)
        values = list(row.values())
        if len(values) >= 4:
            return _safe_str(values[3])
        return ""

    def search_funds(self, query: str, limit: int = 12) -> list[dict[str, str]]:
        keyword = _safe_str(query).lower()
        if not keyword:
            return []

        normalized_query = _normalize_code(keyword) if keyword.isdigit() else keyword
        matches: list[dict[str, str]] = []
        for code, row in self.get_fund_catalog().items():
            values = list(row.values())
            fund_name = _safe_str(values[2] if len(values) >= 3 else "")
            fund_type = _safe_str(values[3] if len(values) >= 4 else "")
            fund_company = _safe_str(values[4] if len(values) >= 5 else "")
            searchable = f"{code} {fund_name} {fund_type} {fund_company}".lower()
            if normalized_query == code or keyword in searchable:
                matches.append(
                    {
                        "fundCode": code,
                        "fundName": fund_name or code,
                        "fundType": fund_type or "公募基金",
                        "fundCompany": fund_company,
                        "sourceName": "akshare",
                    }
                )

            if len(matches) >= limit:
                break

        return matches

    def get_basic_info(self, fund_code: str) -> dict[str, Any]:
        frame = self._try_call(
            f"fund_individual_basic_info_xq:{fund_code}",
            self._ak.fund_individual_basic_info_xq,
            symbol=fund_code,
        )
        records = _to_records(frame)
        data: dict[str, Any] = {}
        for row in records:
            item = _safe_str(row.get("item") or row.get("\u9879\u76ee"))
            value = row.get("value") if "value" in row else row.get("\u503c")
            if item:
                data[item] = value
        return data

    def get_aum_yi(self, fund_code: str) -> float | None:
        detail = self.get_basic_info(_normalize_code(fund_code))
        return _safe_aum_yi(detail.get("最新规模") or detail.get("基金规模") or detail.get("规模"))

    def get_purchase_fee(self, fund_code: str, tradable_on_exchange: bool) -> float | None:
        if tradable_on_exchange:
            return None

        frame = self._try_call(
            f"fund_fee_em:{fund_code}",
            self._ak.fund_fee_em,
            symbol=fund_code,
            indicator="\u7533\u8d2d\u8d39\u7387\uff08\u524d\u7aef\uff09",
        )
        records = _to_records(frame)
        for row in records:
            fee = _safe_float(row.get("\u8d39\u7387") or row.get("fee"))
            if fee is not None:
                return round(fee, 4)
        return None

    def get_disclosed_holdings(self, fund_code: str, year: int) -> list[dict[str, Any]]:
        normalized = _normalize_code(fund_code)
        cache_key = (normalized, year)
        if cache_key in self._holdings_cache:
            return self._holdings_cache[cache_key]

        func = getattr(self._ak, "fund_portfolio_hold_em", None)
        if func is None:
            self._holdings_cache[cache_key] = []
            return []

        records: list[dict[str, Any]] = []
        for query_year in (year, year - 1):
            frame = self._try_call(
                f"fund_portfolio_hold_em:{normalized}:{query_year}",
                func,
                symbol=normalized,
                date=str(query_year),
            )
            rows = _to_records(frame)
            if not rows:
                continue

            for row in rows:
                values = list(row.values())
                if len(values) < 4:
                    continue
                holding_code = _safe_str(values[1] if len(values) > 1 else "")
                holding_name = _safe_str(values[2] if len(values) > 2 else "")
                weight_percent = _safe_float(values[3] if len(values) > 3 else None)
                report_period = _safe_str(values[-1] if values else "", default=str(query_year))
                if not holding_name:
                    continue
                records.append(
                    {
                        "holdingCode": holding_code or None,
                        "holdingName": holding_name,
                        "holdingType": "stock",
                        "weightPercent": weight_percent,
                        "reportPeriod": report_period,
                        "sourceName": "akshare-eastmoney-f10",
                        "dataQuality": "official_disclosure",
                    }
                )
            if records:
                break

        records.sort(key=lambda item: item["weightPercent"] if item["weightPercent"] is not None else -1, reverse=True)
        self._holdings_cache[cache_key] = records[:30]
        return self._holdings_cache[cache_key]

    def get_holdings_summary(self, fund_code: str, year: int) -> tuple[str, str]:
        holdings = self.get_disclosed_holdings(fund_code, year)
        if not holdings:
            return "", "\u5f85\u8865\u5145"

        top_names = "|".join(item["holdingName"] for item in holdings[:10])
        weights = [item["weightPercent"] for item in holdings[:10] if item["weightPercent"] is not None]
        if weights:
            return top_names, f"\u524d\u5341\u5927\u5360\u51c0\u503c {round(sum(weights), 2)}%"
        return top_names, "\u524d\u5341\u5927\u6301\u4ed3\u5df2\u62ab\u9732\uff0c\u5360\u6bd4\u5f85\u6838"

    def _get_open_daily_map(self) -> dict[str, dict[str, Any]]:
        if self._open_daily_cache is not None:
            return self._open_daily_cache
        records = _to_records(self._call("fund_open_fund_daily_em", self._ak.fund_open_fund_daily_em))
        self._open_daily_cache = {_normalize_code(row.get("\u57fa\u91d1\u4ee3\u7801")): row for row in records if row.get("\u57fa\u91d1\u4ee3\u7801")}
        return self._open_daily_cache

    def _get_etf_daily_map(self) -> dict[str, dict[str, Any]]:
        if self._etf_daily_cache is not None:
            return self._etf_daily_cache
        records = _to_records(self._call("fund_etf_fund_daily_em", self._ak.fund_etf_fund_daily_em))
        self._etf_daily_cache = {_normalize_code(row.get("\u57fa\u91d1\u4ee3\u7801")): row for row in records if row.get("\u57fa\u91d1\u4ee3\u7801")}
        return self._etf_daily_cache

    def get_latest_daily_snapshot(self, fund_code: str) -> dict[str, Any]:
        normalized = _normalize_code(fund_code)
        row = self._get_open_daily_map().get(normalized) or self._get_etf_daily_map().get(normalized)
        if not row:
            return {}

        nav_columns = [
            column
            for column in row.keys()
            if isinstance(column, str) and column.endswith("-\u5355\u4f4d\u51c0\u503c")
        ]
        dated_columns: list[tuple[date, str]] = []
        for column in nav_columns:
            point_date = _safe_date(column.split("-\u5355\u4f4d\u51c0\u503c")[0])
            if point_date:
                dated_columns.append((point_date, column))
        dated_columns.sort(reverse=True)

        latest_nav = _safe_float(row.get(dated_columns[0][1])) if dated_columns else None
        previous_nav = _safe_float(row.get(dated_columns[1][1])) if len(dated_columns) >= 2 else None
        latest_date = dated_columns[0][0] if dated_columns else None
        previous_date = dated_columns[1][0] if len(dated_columns) >= 2 else None
        return_1d = _safe_float(row.get("\u65e5\u589e\u957f\u7387") or row.get("\u589e\u957f\u7387"))
        if return_1d is None and latest_nav is not None and previous_nav:
            return_1d = round((latest_nav / previous_nav - 1.0) * 100.0, 4)

        return {
            "latest_nav": latest_nav,
            "previous_nav": previous_nav,
            "return_1d": return_1d,
            "latest_date": latest_date,
            "previous_date": previous_date,
        }

    def _extract_master_fields(self, item: FundUniverseItem, detail: dict[str, Any]) -> tuple[str, str, str, date | None, bool]:
        catalog_name = self.get_catalog_name(item.normalized_code)
        catalog_type = self.get_catalog_type(item.normalized_code)
        fund_name = _safe_str(detail.get("\u57fa\u91d1\u540d\u79f0"), default=catalog_name or item.tracking_target or item.theme)
        fund_type = _safe_str(
            detail.get("\u57fa\u91d1\u7c7b\u578b") or detail.get("\u57fa\u91d1\u7c7b\u522b"),
            default=catalog_type or "\u516c\u52df\u57fa\u91d1",
        )
        fund_company = _safe_str(detail.get("\u57fa\u91d1\u516c\u53f8") or detail.get("\u57fa\u91d1\u7ba1\u7406\u4eba"))
        inception = _safe_date(detail.get("\u6210\u7acb\u65f6\u95f4") or detail.get("\u6210\u7acb\u65e5\u671f"))
        upper_name = fund_name.upper()
        upper_type = fund_type.upper()
        tradable_on_exchange = (
            item.normalized_code.startswith(("1", "5"))
            and ("ETF" in upper_name or "LOF" in upper_name or "ETF" in upper_type or "LOF" in upper_type)
            and "\u8054\u63a5" not in fund_name
            and "\u8054\u63a5" not in fund_type
        )
        return fund_name, fund_type, fund_company, inception, tradable_on_exchange

    def _build_etf_points(self, fund_code: str, reference_date: date) -> list[tuple[date, float]]:
        start_date = (reference_date - timedelta(days=self._lookback_days)).strftime("%Y%m%d")
        end_date = reference_date.strftime("%Y%m%d")
        frame = self._try_call(
            f"fund_etf_hist_em:{fund_code}",
            self._ak.fund_etf_hist_em,
            symbol=fund_code,
            period="daily",
            start_date=start_date,
            end_date=end_date,
            adjust="qfq",
        )
        records = _to_records(frame)
        points: list[tuple[date, float]] = []
        for row in records:
            point_date = _safe_date(row.get("\u65e5\u671f"))
            close_price = _safe_float(row.get("\u6536\u76d8") or row.get("\u5355\u4f4d\u51c0\u503c") or row.get("\u7d2f\u8ba1\u51c0\u503c"))
            if point_date and close_price is not None:
                points.append((point_date, close_price))
        points.sort(key=lambda item: item[0])
        return points

    def _build_open_fund_points(self, fund_code: str) -> list[tuple[date, float]]:
        frame = self._try_call(
            f"fund_open_fund_info_em:{fund_code}",
            self._ak.fund_open_fund_info_em,
            symbol=fund_code,
            indicator="\u5355\u4f4d\u51c0\u503c\u8d70\u52bf",
        )
        records = _to_records(frame)
        points: list[tuple[date, float]] = []
        for row in records:
            point_date = _safe_date(row.get("\u51c0\u503c\u65e5\u671f") or row.get("x") or row.get("\u65e5\u671f"))
            unit_value = _safe_float(row.get("\u5355\u4f4d\u51c0\u503c") or row.get("y") or row.get("\u51c0\u503c"))
            if point_date and unit_value is not None:
                points.append((point_date, unit_value))
        points.sort(key=lambda item: item[0])
        if len(points) > self._lookback_days:
            return points[-self._lookback_days :]
        return points

    def build_master_row(self, item: FundUniverseItem) -> FundMasterRow:
        detail = self.get_basic_info(item.normalized_code)
        fund_name, fund_type, fund_company, inception, tradable_on_exchange = self._extract_master_fields(item, detail)

        return FundMasterRow(
            fund_id=item.fund_id,
            fund_code=item.normalized_code,
            fund_name=fund_name,
            fund_type=fund_type,
            theme=item.theme,
            tracking_target=item.tracking_target,
            fund_company=fund_company,
            tradable_on_exchange=tradable_on_exchange,
            fee_rate=None,
            inception_date=inception.isoformat() if inception else None,
        )

    def build_daily_metrics_row(self, item: FundUniverseItem, reference_date: date) -> FundDailyMetricsRow:
        detail = self.get_basic_info(item.normalized_code)
        fund_name, fund_type, _, inception, tradable_on_exchange = self._extract_master_fields(item, detail)

        points = (
            self._build_etf_points(item.normalized_code, reference_date)
            if tradable_on_exchange
            else self._build_open_fund_points(item.normalized_code)
        )
        latest_snapshot = self.get_latest_daily_snapshot(item.normalized_code)

        top_holdings, concentration_label = self.get_holdings_summary(item.normalized_code, reference_date.year)
        founded_years = None
        if inception:
            founded_years = max(reference_date.year - inception.year, 0)

        if tradable_on_exchange:
            note = "\u573a\u5185 ETF \u6309\u5386\u53f2\u884c\u60c5\u4f30\u7b97\u533a\u95f4\u6536\u76ca\u4e0e\u98ce\u9669\uff0c\u9002\u7528\u4e8e\u76d8\u540e\u5bf9\u6bd4\u89c2\u5bdf\u3002"
        elif "\u6307\u6570" in fund_type or "\u8054\u63a5" in fund_name or "\u8054\u63a5" in fund_type:
            note = "\u573a\u5916\u516c\u52df\u6309\u51c0\u503c\u5386\u53f2\u4f30\u7b97\u533a\u95f4\u6536\u76ca\u4e0e\u98ce\u9669\uff0c\u9002\u7528\u4e8e\u76d8\u540e\u89c2\u5bdf\uff0c\u4e0d\u4ee3\u8868\u5b9e\u65f6\u8868\u73b0\u3002"
        else:
            note = "\u4e3b\u52a8\u578b\u516c\u52df\u6309\u51c0\u503c\u5386\u53f2\u4f30\u7b97\u533a\u95f4\u6536\u76ca\u4e0e\u98ce\u9669\uff0c\u4e0d\u9002\u7528\u4e8e\u6307\u6570\u8ddf\u8e2a\u504f\u79bb\u6bd4\u8f83\u3002"

        aum = _safe_aum_yi(detail.get("\u6700\u65b0\u89c4\u6a21") or detail.get("\u57fa\u91d1\u89c4\u6a21") or detail.get("\u89c4\u6a21"))
        latest_nav = points[-1][1] if points else latest_snapshot.get("latest_nav")
        previous_nav = points[-2][1] if len(points) >= 2 else latest_snapshot.get("previous_nav")
        latest_nav_date = points[-1][0] if points else latest_snapshot.get("latest_date")
        previous_nav_date = points[-2][0] if len(points) >= 2 else latest_snapshot.get("previous_date")
        metric_reference_date = latest_nav_date if hasattr(latest_nav_date, "year") else reference_date
        return_1d = _compute_latest_return(points) if points else latest_snapshot.get("return_1d")

        return FundDailyMetricsRow(
            fund_id=item.fund_id,
            return_1d=return_1d,
            return_1m=_compute_return(points, metric_reference_date, 30),
            return_3m=_compute_return(points, metric_reference_date, 90),
            return_6m=_compute_return(points, metric_reference_date, 180),
            max_drawdown=_compute_drawdown(points),
            volatility=_compute_volatility(points),
            aum=aum,
            latest_nav=latest_nav,
            previous_nav=previous_nav,
            latest_nav_date=latest_nav_date.isoformat() if hasattr(latest_nav_date, "isoformat") else None,
            previous_nav_date=previous_nav_date.isoformat() if hasattr(previous_nav_date, "isoformat") else None,
            founded_years=founded_years,
            top_holdings=top_holdings,
            concentration_label=concentration_label,
            tracking_deviation_note=note,
        )
