from dataclasses import dataclass

from workers.common.config import settings


@dataclass(frozen=True)
class TvWorkerContract:
    worker: str
    queue_name: str
    status: str = "accepted"
    environment: str = settings.environment
    version: str = "0.1.0"


def accept_job(worker: str, queue_name: str, payload: dict[str, object]) -> dict[str, object]:
    return {
        "worker": worker,
        "queue_name": queue_name,
        "environment": settings.environment,
        "version": "0.1.0",
        "status": "accepted",
        "payload": payload,
    }
