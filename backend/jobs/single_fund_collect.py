from datetime import date

from psycopg.types.json import Jsonb
from psycopg.rows import dict_row

from db.connection import get_connection
from db.queries.fund_candidates import (
    DEFAULT_THEME,
    get_candidate_by_code,
    make_user_fund_id,
    normalize_fund_code,
)
from providers import AKShareFundProvider, FundUniverseItem, ProProvider


DATA_VERSION = "akshare-user-v1"
TUSHARE_DATA_VERSION = "tushare-user-v1"
SELF_SELECTED_INDUSTRY_ID = "self-selected"
SELF_SELECTED_INDUSTRY_NAME = "自选基金"


def _float_or_none(value: object) -> float | None:
    if value is None:
        return None
    return float(value)


def get_cached_single_fund_collection(fund_code: str, trade_date: date) -> dict | None:
    normalized = normalize_fund_code(fund_code)
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select
                    fm.fund_id,
                    fm.fund_code,
                    fm.fund_name,
                    fdm.trade_date,
                    fdm.data_version,
                    fdm.updated_at
                from fund_master fm
                join fund_daily_metrics fdm on fdm.fund_id = fm.fund_id
                where fm.fund_code = %s
                  and fdm.trade_date >= %s
                order by fdm.trade_date desc, fdm.updated_at desc
                limit 1
                """,
                (normalized, trade_date),
            )
            row = cur.fetchone()

    if not row:
        return None

    return {
        "fundId": row["fund_id"],
        "fundCode": row["fund_code"],
        "fundName": row["fund_name"],
        "tradeDate": row["trade_date"].isoformat() if row["trade_date"] else None,
        "dataVersion": row["data_version"],
        "sourceName": "db-cache",
        "cacheStatus": "hit",
        "updatedAt": row["updated_at"].isoformat() if row["updated_at"] else None,
    }


def collect_single_fund(fund_code: str, trade_date: date, provider: AKShareFundProvider | None = None) -> dict:
    normalized = normalize_fund_code(fund_code)
    provider = provider or AKShareFundProvider()
    pro_provider = ProProvider()
    candidate = get_candidate_by_code(normalized)

    if candidate:
        fund_id = candidate["fund_id"]
        theme = candidate["theme"] or DEFAULT_THEME
        tracking_target = candidate["tracking_target"] or candidate["matched_fund_name"]
    else:
        catalog_name = provider.get_catalog_name(normalized)
        fund_id = make_user_fund_id(normalized)
        theme = DEFAULT_THEME
        tracking_target = catalog_name or normalized

    item = FundUniverseItem(
        fund_id=fund_id,
        fund_code=normalized,
        industry_id=SELF_SELECTED_INDUSTRY_ID,
        theme=theme,
        tracking_target=tracking_target,
    )

    data_version = DATA_VERSION
    source_name = "akshare"
    try:
        if pro_provider.enabled:
            master_row = pro_provider.build_master_row(item)
            daily_row = pro_provider.build_daily_metrics_row(item, trade_date)
            data_version = TUSHARE_DATA_VERSION
            source_name = "tushare"
        else:
            master_row = provider.build_master_row(item)
            daily_row = provider.build_daily_metrics_row(item, trade_date)
    except Exception as exc:
        print(f"[single_fund_collect] Tushare enhanced collection skipped fund={normalized} error={exc}")
        master_row = provider.build_master_row(item)
        daily_row = provider.build_daily_metrics_row(item, trade_date)
    disclosed_holdings = provider.get_disclosed_holdings(normalized, trade_date.year)
    batch_id = f"{source_name}-user-{trade_date.isoformat()}-{normalized}"

    with get_connection() as conn:
        with conn.cursor() as cur:
            _ensure_self_selected_industry(cur)
            _upsert_fund_master(cur, master_row.to_csv_row())
            _upsert_industry_mapping(cur, fund_id)
            _upsert_fund_daily_metrics(cur, trade_date, batch_id, daily_row.to_csv_row(), data_version)
            _upsert_fund_disclosed_holdings(cur, fund_id, normalized, disclosed_holdings)
            _upsert_fund_compare_daily(
                cur,
                trade_date,
                batch_id,
                master_row.to_csv_row(),
                daily_row.to_csv_row(),
                data_version,
            )
        conn.commit()

    return {
        "fundId": fund_id,
        "fundCode": normalized,
        "fundName": master_row.fund_name,
        "tradeDate": trade_date.isoformat(),
        "dataVersion": data_version,
        "sourceName": source_name,
    }


def _ensure_self_selected_industry(cur) -> None:
    cur.execute(
        """
        insert into industry_master (
            industry_id, industry_name, display_name, sort_order, active_flag,
            risk_disclaimer_template, created_at, updated_at
        )
        values (%s, %s, %s, 999, true, %s, now(), now())
        on conflict (industry_id) do update
        set industry_name = excluded.industry_name,
            display_name = excluded.display_name,
            updated_at = now()
        """,
        (
            SELF_SELECTED_INDUSTRY_ID,
            SELF_SELECTED_INDUSTRY_NAME,
            SELF_SELECTED_INDUSTRY_NAME,
            "自选基金仅表示用户主动加入观察，不构成投资建议。",
        ),
    )


def _upsert_fund_master(cur, row: dict[str, object]) -> None:
    cur.execute(
        """
        insert into fund_master (
            fund_id, fund_code, fund_name, fund_type, theme, tracking_target,
            fund_company, tradable_on_exchange, fee_rate, inception_date, created_at, updated_at
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
        on conflict (fund_code) do update
        set fund_id = excluded.fund_id,
            fund_name = excluded.fund_name,
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


def _upsert_industry_mapping(cur, fund_id: str) -> None:
    cur.execute(
        """
        insert into industry_fund_mapping (
            industry_id, fund_id, mapping_type, priority_rank, created_at, updated_at
        )
        values (%s, %s, 'user-selected', 0, now(), now())
        on conflict (industry_id, fund_id) do update
        set mapping_type = excluded.mapping_type,
            updated_at = now()
        """,
        (SELF_SELECTED_INDUSTRY_ID, fund_id),
    )


def _split_top_holdings(raw: object) -> list[str]:
    if not raw:
        return []
    return [item.strip() for item in str(raw).split("|") if item.strip()]


def _upsert_fund_daily_metrics(cur, trade_date: date, batch_id: str, row: dict[str, object], data_version: str = DATA_VERSION) -> None:
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
            Jsonb(_split_top_holdings(row["top_holdings"])),
            row["concentration_label"],
            row["tracking_deviation_note"],
            batch_id,
            data_version,
        ),
    )


def _upsert_fund_disclosed_holdings(cur, fund_id: str, fund_code: str, holdings: list[dict[str, object]]) -> None:
    cur.execute(
        """
        delete from fund_disclosed_holding
        where fund_id = %s and source_name = 'akshare-eastmoney-f10'
        """,
        (fund_id,),
    )
    for item in holdings:
        cur.execute(
            """
            insert into fund_disclosed_holding (
                fund_id, fund_code, report_period, report_date, disclose_date,
                holding_name, holding_code, holding_type, weight_percent,
                source_name, data_quality, created_at, updated_at
            )
            values (%s, %s, %s, null, null, %s, %s, %s, %s, %s, %s, now(), now())
            on conflict (fund_code, report_period, holding_name) do update
            set fund_code = excluded.fund_code,
                holding_code = excluded.holding_code,
                holding_type = excluded.holding_type,
                weight_percent = excluded.weight_percent,
                source_name = excluded.source_name,
                data_quality = excluded.data_quality,
                updated_at = now()
            """,
            (
                fund_id,
                fund_code,
                item["reportPeriod"],
                item["holdingName"],
                item.get("holdingCode"),
                item.get("holdingType") or "stock",
                item.get("weightPercent"),
                item.get("sourceName") or "akshare-eastmoney-f10",
                item.get("dataQuality") or "official_disclosure",
            ),
        )


def _upsert_fund_compare_daily(
    cur,
    trade_date: date,
    batch_id: str,
    master: dict[str, object],
    daily: dict[str, object],
    data_version: str = DATA_VERSION,
) -> None:
    cur.execute(
        """
        insert into fund_compare_daily (
            trade_date, fund_id, return_metrics_json, risk_metrics_json, fee_rate, aum,
            inception_date, top_holdings_json, concentration_label, tracking_deviation_note,
            source_batch_id, data_version, created_at, updated_at
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
        on conflict (trade_date, fund_id, data_version) do update
        set return_metrics_json = excluded.return_metrics_json,
            risk_metrics_json = excluded.risk_metrics_json,
            fee_rate = excluded.fee_rate,
            aum = excluded.aum,
            inception_date = excluded.inception_date,
            top_holdings_json = excluded.top_holdings_json,
            concentration_label = excluded.concentration_label,
            tracking_deviation_note = excluded.tracking_deviation_note,
            source_batch_id = excluded.source_batch_id,
            updated_at = now()
        """,
        (
            trade_date,
            master["fund_id"],
            Jsonb(
                {
                    "day1": _float_or_none(daily["return_1d"]),
                    "month1": _float_or_none(daily["return_1m"]),
                    "month3": _float_or_none(daily["return_3m"]),
                    "month6": _float_or_none(daily["return_6m"]),
                    "latestNav": _float_or_none(daily["latest_nav"]),
                    "previousNav": _float_or_none(daily["previous_nav"]),
                }
            ),
            Jsonb(
                {
                    "maxDrawdown": _float_or_none(daily["max_drawdown"]),
                    "volatility": _float_or_none(daily["volatility"]),
                }
            ),
            master["fee_rate"],
            daily["aum"],
            master["inception_date"],
            Jsonb(_split_top_holdings(daily["top_holdings"])),
            daily["concentration_label"],
            daily["tracking_deviation_note"],
            batch_id,
            data_version,
        ),
    )
