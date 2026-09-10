"""
Configuration via environment variables / .env file.
PostgreSQL only -- no SQLite fallback, per architecture decision.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/iis_db"
    DATA_DIR: str = "../data"


settings = Settings()
