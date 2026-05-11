from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from urllib import parse, request

from config.settings import get_settings


@dataclass(frozen=True)
class NewsItem:
    news_id: str
    title: str
    summary: str
    published_at: datetime
    source_name: str
    source_url: str | None = None


class NewsProviderError(RuntimeError):
    pass


def _parse_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    if raw.isdigit():
        timestamp = int(raw)
        if timestamp > 10_000_000_000:
            timestamp = int(timestamp / 1000)
        return datetime.fromtimestamp(timestamp)
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y/%m/%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw[:19], fmt)
        except ValueError:
            continue
    return None


def _extract_items(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if not isinstance(payload, dict):
        return []
    for key in ("data", "items", "list", "news", "flash", "results"):
        value = payload.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
        if isinstance(value, dict):
            nested = _extract_items(value)
            if nested:
                return nested
    return []


def _field(row: dict[str, Any], *names: str) -> Any:
    for name in names:
        value = row.get(name)
        if value not in (None, ""):
            return value
    return None


class Jin10NewsProvider:
    source_name = "金十数据"

    def __init__(self) -> None:
        settings = get_settings()
        self.enabled = settings.jin10_enable
        self.base_url = settings.jin10_api_base_url.strip()
        self.api_key = settings.jin10_api_key.strip()
        self.timeout = settings.jin10_request_timeout_seconds

    def fetch_latest(self, limit: int = 80) -> list[NewsItem]:
        if not self.enabled:
            raise NewsProviderError("金十新闻抓取未启用：请在 backend/.env 设置 JIN10_ENABLE=true。")
        if not self.base_url or not self.api_key:
            raise NewsProviderError("金十 API 未配置：请设置 JIN10_API_BASE_URL 和 JIN10_API_KEY。")

        separator = "&" if "?" in self.base_url else "?"
        url = f"{self.base_url}{separator}{parse.urlencode({'limit': limit})}"
        req = request.Request(
            url,
            headers={
                "Accept": "application/json",
                "User-Agent": "personal-fund-strategy-platform/1.0",
                "Authorization": f"Bearer {self.api_key}",
                "X-API-Key": self.api_key,
            },
        )
        with request.urlopen(req, timeout=self.timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))

        items: list[NewsItem] = []
        for row in _extract_items(payload):
            title = str(_field(row, "title", "headline", "content", "text") or "").strip()
            summary = str(_field(row, "summary", "digest", "content", "text", "description") or title).strip()
            published_at = _parse_datetime(_field(row, "published_at", "publish_time", "time", "datetime", "created_at"))
            if not title or published_at is None:
                continue
            news_id = str(_field(row, "id", "news_id", "flash_id") or f"jin10-{published_at.timestamp()}-{hash(title)}")
            source_url = _field(row, "url", "link", "source_url")
            items.append(
                NewsItem(
                    news_id=news_id,
                    title=title[:180],
                    summary=summary[:500],
                    published_at=published_at,
                    source_name=self.source_name,
                    source_url=str(source_url) if source_url else None,
                )
            )
        return items


class CailianpressNewsProvider:
    source_name = "财联社"

    def fetch_latest(self, limit: int = 80) -> list[NewsItem]:
        raise NewsProviderError("财联社暂未配置官方授权 API。为避免网页抓取和版权风险，请接入授权接口后再启用。")
