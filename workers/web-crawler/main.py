from workers.common.config import settings


def handle(website_id: str) -> dict[str, str]:
    return {
        "worker": "web-crawler",
        "website_id": website_id,
        "environment": settings.environment,
        "status": "accepted",
    }

