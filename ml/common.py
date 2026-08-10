from __future__ import annotations

import argparse
import json
import math
import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from statistics import median
from typing import Any


@dataclass
class DatasetPaths:
    version: str
    directory: Path
    records_path: Path
    metadata_path: Path


def parse_common_args(description: str) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--dataset-version", dest="dataset_version")
    parser.add_argument("--dataset-dir", dest="dataset_dir")
    parser.add_argument("--output-dir", dest="output_dir")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--experiment-name", dest="experiment_name", default="default")
    return parser.parse_args()


def resolve_dataset_paths(dataset_version: str | None, dataset_dir: str | None) -> DatasetPaths:
    base_dir = Path(dataset_dir) if dataset_dir else Path(__file__).resolve().parent / "datasets"
    version = dataset_version or latest_dataset_version(base_dir)
    directory = base_dir / version if dataset_dir is None else Path(dataset_dir)
    return DatasetPaths(
        version=version,
        directory=directory,
        records_path=directory / "records.jsonl",
        metadata_path=directory / "metadata.json",
    )


def latest_dataset_version(base_dir: Path) -> str:
    if not base_dir.exists():
      return "missing"
    versions = sorted([item.name for item in base_dir.iterdir() if item.is_dir()])
    return versions[-1] if versions else "missing"


def load_metadata(paths: DatasetPaths) -> dict[str, Any]:
    if not paths.metadata_path.exists():
        return {}
    return json.loads(paths.metadata_path.read_text(encoding="utf-8"))


def load_records(paths: DatasetPaths) -> list[dict[str, Any]]:
    if not paths.records_path.exists():
        return []
    records: list[dict[str, Any]] = []
    for line in paths.records_path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            records.append(json.loads(line))
    return records


def ensure_output_dir(output_dir: str | None, fallback_name: str) -> Path:
    directory = Path(output_dir) if output_dir else Path(__file__).resolve().parent / "models" / "impressions" / fallback_name
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def json_dump(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def bucket_reach(reach: float | int | None) -> str:
    if reach is None:
        return "unknown"
    if reach < 1_000:
        return "lt_1k"
    if reach < 10_000:
        return "1k_10k"
    if reach < 100_000:
        return "10k_100k"
    if reach < 1_000_000:
        return "100k_1m"
    return "gte_1m"


def bucket_active_days(days: int | None) -> str:
    if days is None:
        return "unknown"
    if days <= 3:
        return "1_3"
    if days <= 7:
        return "4_7"
    if days <= 14:
        return "8_14"
    if days <= 30:
        return "15_30"
    return "31_plus"


def safe_frequency(impressions: float | int | None, reach: float | int | None) -> float | None:
    if impressions is None or reach is None or reach <= 0 or impressions <= 0:
        return None
    return impressions / reach


def feature_key(record: dict[str, Any]) -> tuple[str, str, str, str]:
    platforms = ",".join(sorted(record.get("platforms") or [])) or "unknown"
    creative = (record.get("creativeType") or "UNKNOWN").upper()
    active_days = bucket_active_days(record.get("activeDays"))
    reach_bucket = bucket_reach(record.get("reach"))
    return (platforms, creative, active_days, reach_bucket)


def summarize_error(actual: list[float], predicted: list[float]) -> dict[str, Any]:
    if not actual or len(actual) != len(predicted):
        return {
            "count": 0,
            "mae": None,
            "median_absolute_error": None,
            "smape": None,
            "rmse_log1p": None,
            "within_10": None,
            "within_20": None,
            "within_30": None,
            "within_50": None,
        }

    absolute_errors = [abs(a - p) for a, p in zip(actual, predicted)]
    smape_values = []
    log_errors = []
    within = {10: 0, 20: 0, 30: 0, 50: 0}

    for a, p in zip(actual, predicted):
        denom = abs(a) + abs(p)
        if denom > 0:
            smape_values.append((2 * abs(a - p)) / denom)
        log_errors.append((math.log1p(max(a, 0)) - math.log1p(max(p, 0))) ** 2)
        if a > 0:
            pct_error = abs(a - p) / a * 100
            for threshold in within:
                if pct_error <= threshold:
                    within[threshold] += 1

    return {
        "count": len(actual),
        "mae": sum(absolute_errors) / len(absolute_errors),
        "median_absolute_error": median(absolute_errors),
        "smape": sum(smape_values) / len(smape_values) if smape_values else None,
        "rmse_log1p": math.sqrt(sum(log_errors) / len(log_errors)) if log_errors else None,
        "within_10": within[10] / len(actual),
        "within_20": within[20] / len(actual),
        "within_30": within[30] / len(actual),
        "within_50": within[50] / len(actual),
    }


def now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
