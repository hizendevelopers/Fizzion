from workers.common.tv_pipeline import accept_job


def handle(occurrence_id: str) -> dict[str, object]:
    return accept_job(
        "ai-classifier",
        "tv-ad-candidate-classify",
        {
            "occurrence_id": occurrence_id,
        },
    )
