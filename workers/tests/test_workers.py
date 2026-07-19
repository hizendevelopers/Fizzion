from workers.ad_break_detector.main import handle as ad_break_handle
from workers.ai_classifier.main import handle as ai_classifier_handle
from workers.clip_generator.main import handle as clip_generator_handle
from workers.creative_matcher.main import handle as creative_matcher_handle
from workers.recording_validator.main import handle as recording_validator_handle
from workers.social_sync.main import handle as social_handle
from workers.tv_recorder.main import handle as recorder_handle
from workers.tv_ingestion.main import handle as tv_handle
from workers.web_crawler.main import handle as web_handle
from workers.retention_worker.main import handle as retention_handle


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


def test_tv_recorder_worker_accepts_job():
    payload = recorder_handle("ary-news", "source-1")
    assert payload["worker"] == "tv-recorder"
    assert payload["queue_name"] == "tv-recorder-start"


def test_recording_validator_worker_accepts_job():
    payload = recording_validator_handle("recording-1")
    assert payload["worker"] == "recording-validator"
    assert payload["queue_name"] == "tv-recording-validate"


def test_ad_break_detector_worker_accepts_job():
    payload = ad_break_handle("recording-1")
    assert payload["worker"] == "ad-break-detector"
    assert payload["queue_name"] == "tv-ad-break-detect"


def test_creative_matcher_worker_accepts_job():
    payload = creative_matcher_handle("occ-1")
    assert payload["worker"] == "creative-matcher"
    assert payload["queue_name"] == "tv-creative-match"


def test_ai_classifier_worker_accepts_job():
    payload = ai_classifier_handle("occ-1")
    assert payload["worker"] == "ai-classifier"
    assert payload["queue_name"] == "tv-ad-candidate-classify"


def test_clip_generator_worker_accepts_job():
    payload = clip_generator_handle("occ-1")
    assert payload["worker"] == "clip-generator"
    assert payload["queue_name"] == "tv-occurrence-clip-generate"


def test_retention_worker_accepts_job():
    payload = retention_handle("ary-news")
    assert payload["worker"] == "retention-worker"
    assert payload["queue_name"] == "tv-retention-cleanup"
