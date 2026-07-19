from workers.common.tv_pipeline import accept_job


def handle(occurrence_id: str) -> dict[str, object]:
    return accept_job(
        "clip-generator",
        "tv-occurrence-clip-generate",
        {
            "occurrence_id": occurrence_id,
        },
    )
