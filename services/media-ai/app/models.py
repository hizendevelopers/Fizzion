from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "media-ai"


class AnalysisRequest(BaseModel):
    asset_url: str | None = None
    storage_key: str | None = None
    media_type: str = Field(default="video", pattern="^(video|image|audio|text)$")
    tasks: list[str] = Field(default_factory=list)
    language_hints: list[str] = Field(default_factory=list)


class AnalysisResponse(BaseModel):
    accepted: bool = True
    provider: str
    tasks: list[str]
    note: str

