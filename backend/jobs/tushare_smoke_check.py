from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any

from config.settings import get_settings
from jobs.shared import build_batch_id, get_trade_archive_raw_dir, log_job_end, log_job_start, resolve_trade_date
from providers import ProProvider


JOB_NAME = "tushare_smoke_check"


def _row_count(frame: Any) -> int:
    if frame is None:
        return 0
    if hasattr(frame, "shape"):
        return int(frame.shape[0])
    if hasattr(frame, "__len__"):
        return len(frame)
    return 0


def _columns(frame: Any) -> list[str]:
    if frame is None or not hasattr(frame, "columns"):
        return []
    return [str(item) for item in list(frame.columns)]


def _sample(frame: Any, limit: int = 2) -> list[dict[str, Any]]:
    if frame is None or not hasattr(frame, "head"):
        return []
    records = frame.head(limit).to_dict("records")
    return [{str(key): _json_safe(value) for key, value in row.items()} for row in records]


def _json_safe(value: Any) -> Any:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            pass
    return value


def _check(name: str, fn, *args, **kwargs) -> dict[str, Any]:
    try:
        frame = fn(*args, **kwargs)
        return {
            "name": name,
            "status": "ok",
            "rowCount": _row_count(frame),
            "columns": _columns(frame)[:24],
            "sample": _sample(frame),
        }
    except Exception as exc:
        return {
            "name": name,
            "status": "failed",
            "rowCount": 0,
            "columns": [],
            "sample": [],
            "error": str(exc),
        }


def build_smoke_report(trade_date: date) -> dict[str, Any]:
    settings = get_settings()
    provider = ProProvider()
    report: dict[str, Any] = {
        "provider": "tushare",
        "tradeDate": trade_date.isoformat(),
        "enabled": provider.enabled,
        "tokenConfigured": bool(settings.tushare_token),
        "tokenPreview": f"{settings.tushare_token[:4]}***{settings.tushare_token[-4:]}" if settings.tushare_token else "",
        "checks": [],
        "notes": [
            "Token is masked in this report.",
            "With 2000 points, prioritize fund_basic, fund_nav, fund_portfolio, stock_basic, daily, daily_basic, moneyflow, stk_limit, and top_list.",
            "Do not rely on higher-threshold concept or Shenwan realtime-style APIs for mainline scoring.",
        ],
    }
    if not provider.enabled:
        report["status"] = "disabled"
        return report

    report["checks"] = [
        _check(
            "fund_basic_open_fund",
            provider.fund_basic,
            market="O",
            status="L",
            fields="ts_code,name,management,custodian,fund_type,found_date,list_date",
        ),
        _check(
            "fund_nav_017731",
            provider.fund_nav,
            ts_code="017731.OF",
            start_date="20250101",
            end_date=trade_date.strftime("%Y%m%d"),
            fields="ts_code,ann_date,end_date,unit_nav,accum_nav,net_asset,total_netasset",
        ),
        _check(
            "fund_portfolio_017731",
            provider.fund_portfolio,
            ts_code="017731.OF",
            fields="ts_code,ann_date,end_date,symbol,mkv,amount,stk_mkv_ratio,stk_float_ratio",
        ),
        _check(
            "index_classify_sw2021_l1",
            provider.index_classify,
            src="SW2021",
            level="L1",
            fields="index_code,industry_name,level,industry_code,is_pub,parent_code",
        ),
        _check(
            "index_daily_sw_semiconductor_probe",
            provider.index_daily,
            ts_code="801081.SI",
            start_date="20260401",
            end_date=trade_date.strftime("%Y%m%d"),
            fields="ts_code,trade_date,close,pct_chg,vol,amount",
        ),
        _check(
            "stock_basic_a_share",
            provider.stock_basic,
            exchange="",
            list_status="L",
            fields="ts_code,symbol,name,area,industry,market,list_date",
        ),
        _check(
            "daily_ping_an_bank",
            provider.daily,
            ts_code="000001.SZ",
            start_date="20260401",
            end_date=trade_date.strftime("%Y%m%d"),
            fields="ts_code,trade_date,close,pct_chg,amount",
        ),
        _check(
            "daily_basic_latest",
            provider.daily_basic,
            trade_date=trade_date.strftime("%Y%m%d"),
            fields="ts_code,trade_date,turnover_rate,volume_ratio,pe_ttm,pb,total_mv,circ_mv",
        ),
        _check(
            "moneyflow_latest",
            provider.moneyflow,
            trade_date=trade_date.strftime("%Y%m%d"),
            fields="ts_code,trade_date,net_mf_amount",
        ),
        _check(
            "stk_limit_latest",
            provider.stk_limit,
            trade_date=trade_date.strftime("%Y%m%d"),
            fields="ts_code,trade_date,up_limit,down_limit",
        ),
        _check(
            "top_list_latest",
            provider.top_list,
            trade_date=trade_date.strftime("%Y%m%d"),
            fields="trade_date,ts_code,name,pct_change,amount,buy,sell,net_amount,reason",
        ),
    ]
    report["status"] = "ok" if any(item["status"] == "ok" for item in report["checks"]) else "failed"
    return report


def main() -> None:
    trade_date = resolve_trade_date()
    batch_id = build_batch_id(trade_date)
    log_job_start(JOB_NAME, batch_id, trade_date)
    try:
        report = build_smoke_report(trade_date)
        output_dir = get_trade_archive_raw_dir(trade_date)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = Path(output_dir) / "tushare_smoke_check.json"
        output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        log_job_end(JOB_NAME, batch_id, trade_date, run_status=report["status"], processed_count=len(report.get("checks", [])))
        printable = {
            "status": report["status"],
            "enabled": report["enabled"],
            "tokenConfigured": report["tokenConfigured"],
            "outputPath": str(output_path),
            "checks": [
                {
                    "name": item["name"],
                    "status": item["status"],
                    "rowCount": item["rowCount"],
                    "error": item.get("error"),
                }
                for item in report.get("checks", [])
            ],
        }
        print(json.dumps(printable, ensure_ascii=False, indent=2))
    except Exception as exc:
        log_job_end(JOB_NAME, batch_id, trade_date, run_status="failed", error_message=str(exc))
        raise


if __name__ == "__main__":
    main()
