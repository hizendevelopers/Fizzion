from workers.common.config import settings


def handle(
    account_id: str,
    provider: str = "unknown",
    job_type: str = "incremental_sync",
) -> dict[str, str]:
    return {
        "worker": "social-sync",
        "account_id": account_id,
        "provider": provider,
        "job_type": job_type,
        "environment": settings.environment,
        "status": "accepted",
        "queue_name": "social-sync-jobs",
    }
