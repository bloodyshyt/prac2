from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    PROMO_SECRET_CODE: str = "царицыно"
    ALLOWED_ORIGINS: str = "http://localhost:8000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()