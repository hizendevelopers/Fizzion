from workers.common.config import settings


def handle(recording_file_id: str) -> dict[str, str]:
    return {
        "worker": "tv-ingestion",
        "recording_file_id": recording_file_id,
        "environment": settings.environment,
        "status": "accepted",
    }

