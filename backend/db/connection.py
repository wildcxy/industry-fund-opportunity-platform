from contextlib import contextmanager

import psycopg

from config.settings import get_settings


@contextmanager
def get_connection():
    conn = psycopg.connect(get_settings().database_url)
    try:
        yield conn
    finally:
        conn.close()
