import csv
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(slots=True)
class FundUniverseItem:
    fund_id: str
    fund_code: str
    industry_id: str
    theme: str
    tracking_target: str
    enabled: bool = True

    @property
    def normalized_code(self) -> str:
        return self.fund_code.zfill(6)


@dataclass(slots=True)
class FundMasterRow:
    fund_id: str
    fund_code: str
    fund_name: str
    fund_type: str
    theme: str
    tracking_target: str
    fund_company: str
    tradable_on_exchange: bool
    fee_rate: float | None
    inception_date: str | None

    def to_csv_row(self) -> dict[str, object]:
        return asdict(self)


@dataclass(slots=True)
class FundDailyMetricsRow:
    fund_id: str
    return_1d: float | None
    return_1m: float | None
    return_3m: float | None
    return_6m: float | None
    max_drawdown: float | None
    volatility: float | None
    aum: float | None
    latest_nav: float | None
    previous_nav: float | None
    latest_nav_date: str | None
    previous_nav_date: str | None
    founded_years: int | None
    top_holdings: str
    concentration_label: str
    tracking_deviation_note: str

    def to_csv_row(self) -> dict[str, object]:
        return asdict(self)


def load_fund_universe(path: str | Path) -> list[FundUniverseItem]:
    csv_path = Path(path)
    if not csv_path.exists():
        raise FileNotFoundError(f"Fund universe file not found: {csv_path}")

    rows: list[FundUniverseItem] = []
    with csv_path.open("r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        for raw in reader:
            enabled = (raw.get("enabled") or "true").strip().lower() == "true"
            if not enabled:
                continue
            rows.append(
                FundUniverseItem(
                    fund_id=(raw.get("fund_id") or "").strip(),
                    fund_code=(raw.get("fund_code") or "").strip(),
                    industry_id=(raw.get("industry_id") or "").strip(),
                    theme=(raw.get("theme") or "").strip(),
                    tracking_target=(raw.get("tracking_target") or "").strip(),
                    enabled=enabled,
                )
            )

    if not rows:
        raise ValueError(f"Fund universe file is empty: {csv_path}")
    return rows
