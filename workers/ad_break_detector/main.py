from workers.common.tv_pipeline import accept_job


def handle(recording_file_id: str) -> dict[str, object]:
    return accept_job(
        "ad-break-detector",
        "tv-ad-break-detect",
        {
            "recording_file_id": recording_file_id,
        },
    )
