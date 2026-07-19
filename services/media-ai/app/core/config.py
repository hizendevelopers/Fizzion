from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "FizZion Media AI"
    environment: str = "development"
    provider: str = "openai"

    model_config = SettingsConfigDict(env_prefix="MEDIA_AI_", env_file=".env")


settings = Settings()

