from workers.social_sync.main import handle as social_handle
from workers.tv_ingestion.main import handle as tv_handle
from workers.web_crawler.main import handle as web_handle


def test_tv_worker_accepts_job():
    payload = tv_handle("recording-1")
    assert payload["worker"] == "tv-ingestion"
    assert payload["status"] == "accepted"


def test_social_worker_accepts_job():
    payload = social_handle("account-1")
    assert payload["worker"] == "social-sync"
    assert payload["status"] == "accepted"


def test_web_worker_accepts_job():
    payload = web_handle("website-1")
    assert payload["worker"] == "web-crawler"
    assert payload["status"] == "accepted"

