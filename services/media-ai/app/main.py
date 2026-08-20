from fastapi import FastAPI, HTTPException

from app.core.config import settings
from app.models import AnalysisRequest, HealthResponse

app = FastAPI(title=settings.app_name, version="0.1.0")


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse()


@app.post("/analyze")
async def analyze(request: AnalysisRequest) -> None:
    # No OCR/speech/vision provider adapter is implemented yet — this
    # used to return a 200 with an "activate credentials before
    # production use" note, which reads as a working endpoint to any
    # caller that only checks the status code. Fail loudly instead.
    del request
    raise HTTPException(
        status_code=501,
        detail=(
            "Media analysis is not implemented yet. No OCR/speech/vision "
            "provider adapter is wired up behind this endpoint."
        ),
    )

