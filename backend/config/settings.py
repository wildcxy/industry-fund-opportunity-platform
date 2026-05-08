from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[1]
WORKSPACE_DIR = BASE_DIR.parent


class Settings(BaseSettings):
    app_env: str = "development"
    app_port: int = 8000
    database_url: str
    active_data_version: str = "latest"
    runtime_log_dir: str = str(WORKSPACE_DIR / "runtime" / "logs")
    runtime_data_archive_dir: str = str(WORKSPACE_DIR / "runtime" / "data-archive")
    runtime_dropzone_dir: str = str(WORKSPACE_DIR / "runtime" / "manual-drop")
    data_collection_mode: str = "manual-drop"
    akshare_enable: bool = False
    akshare_sleep_min_seconds: float = 1.5
    akshare_sleep_max_seconds: float = 3.0
    akshare_retry_count: int = 3
    akshare_retry_backoff_seconds: float = 2.5
    akshare_chunk_size: int = 8
    akshare_chunk_cooldown_seconds: float = 6.0
    akshare_history_lookback_days: int = 240
    akshare_fund_universe_path: str = str(BASE_DIR / "templates" / "coverage" / "fund_universe.csv")
    jin10_enable: bool = False
    jin10_api_base_url: str = ""
    jin10_api_key: str = ""
    jin10_poll_interval_seconds: int = 300
    jin10_request_timeout_seconds: int = 10
    tushare_enable: bool = False
    tushare_token: str = ""
    tushare_request_timeout_seconds: int = 20
    tushare_retry_count: int = 3
    tushare_retry_backoff_seconds: float = 2.0
    tushare_min_interval_seconds: float = 0.85

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
