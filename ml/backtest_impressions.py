from __future__ import annotations

import argparse
import csv
import json
import subprocess
from pathlib import Path

from common import load_records, parse_common_args, resolve_dataset_paths


def main() -> int:
    common_args = parse_common_args("Backtest impressions predictions against held-out records.")
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--model-dir", required=True)
    parser.add_argument("--report-path")
    known, _ = parser.parse_known_args()

    paths = resolve_dataset_paths(common_args.dataset_version, common_args.dataset_dir)
    records = [record for record in load_records(paths) if record.get("isLabelAligned")]
    if not records:
        print(json.dumps({
            "status": "GROUND_TRUTH_DATA_REQUIRED",
            "message": "No aligned records are available for backtesting.",
        }, indent=2))
        return 2

    report_path = Path(known.report_path) if known.report_path else Path(__file__).resolve().parent / "reports" / f"{paths.version}-backtest.csv"
    report_path.parent.mkdir(parents=True, exist_ok=True)

    rows = []
    for record in records:
        payload = {
            "adLibraryId": record.get("adLibraryId"),
            "pageName": record.get("advertiserName"),
            "platforms": record.get("platforms"),
            "reach": record.get("reach"),
            "creativeType": record.get("creativeType"),
            "startDate": record.get("startDate"),
            "endDate": record.get("endDate"),
            "similarAds": None,
            "variationCount": None,
            "landingDomain": record.get("landingDomain"),
            "activeDays": record.get("activeDays"),
        }
        output = subprocess.run(
            [
                "python",
                str(Path(__file__).resolve().parent / "predict_impressions.py"),
                "--model-dir",
                known.model_dir,
                "--payload",
                json.dumps(payload),
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        parsed = json.loads(output.stdout or "{}")
        prediction = parsed.get("prediction") or {}
        actual = int(record.get("impressions") or 0)
        estimate = int(prediction.get("estimate") or 0)
        low = int(prediction.get("low") or 0)
        high = int(prediction.get("high") or 0)
        rows.append({
            "adId": record.get("metaAdId") or record.get("adLibraryId"),
            "advertiser": record.get("advertiserName"),
            "reach": record.get("reach"),
            "actualImpressions": actual,
            "predictedImpressions": estimate,
            "low": low,
            "high": high,
            "absoluteError": abs(actual - estimate),
            "percentError": (abs(actual - estimate) / actual * 100) if actual > 0 else None,
            "insideInterval": low <= actual <= high,
        })

    with report_path.open("w", newline="", encoding="utf-8") as file:
      writer = csv.DictWriter(file, fieldnames=list(rows[0].keys()))
      writer.writeheader()
      writer.writerows(rows)

    print(json.dumps({
        "status": "OK",
        "reportPath": str(report_path),
        "rows": len(rows),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
