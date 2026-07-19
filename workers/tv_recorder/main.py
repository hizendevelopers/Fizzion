from workers.common.tv_pipeline import accept_job


def handle(channel_slug: str, source_id: str | None = None) -> dict[str, object]:
    return accept_job(
        "tv-recorder",
        "tv-recorder-start",
        {
            "channel_slug": channel_slug,
            "source_id": source_id,
        },
    )
