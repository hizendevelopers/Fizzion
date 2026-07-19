from workers.common.tv_pipeline import accept_job


def handle(channel_slug: str) -> dict[str, object]:
    return accept_job(
        "retention-worker",
        "tv-retention-cleanup",
        {
            "channel_slug": channel_slug,
        },
    )
