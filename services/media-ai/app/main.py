from fastapi import FastAPI

from app.core.config import settings
from app.models import AnalysisRequest, AnalysisResponse, HealthResponse

app = FastAPI(title=settings.app_name, version="0.1.0")


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse()


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest) -> AnalysisResponse:
    return AnalysisResponse(
        provider=settings.provider,
        tasks=request.tasks,
        note="Provider abstraction is ready. Activate credentials and concrete adapters before production use.",
    )

