from workers.common.config import settings


def handle(account_id: str) -> dict[str, str]:
    return {
        "worker": "social-sync",
        "account_id": account_id,
        "environment": settings.environment,
        "status": "accepted",
    }

