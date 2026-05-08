from config.settings import get_settings
from db.connection import get_connection


def get_database_url() -> str:
    return get_settings().database_url


__all__ = ["get_connection", "get_database_url"]
