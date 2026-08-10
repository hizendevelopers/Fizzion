from __future__ import annotations

import json
from collections import Counter

from common import load_metadata, load_records, parse_common_args, resolve_dataset_paths, safe_frequency


def main() -> int:
    args = parse_common_args("Inspect Meta impressions training data quality.")
    paths = resolve_dataset_paths(args.dataset_version, args.dataset_dir)
    metadata = load_metadata(paths)
    records = load_records(paths)

    missing_reach = sum(1 for record in records if not record.get("reach"))
    missing_impressions = sum(1 for record in records if not record.get("impressions"))
    aligned_rows = sum(1 for record in records if record.get("isLabelAligned"))
    rejected_rows = len(records) - aligned_rows
    duplicates = len(records) - len({record.get("recordId") for record in records})
    source_counts = Counter(record.get("labelQuality", "UNKNOWN") for record in records)
    advertiser_counts = Counter(record.get("advertiserName", "UNKNOWN") for record in records)
    creative_counts = Counter(record.get("creativeType", "UNKNOWN") for record in records)
    platform_counts = Counter(platform for record in records for platform in (record.get("platforms") or ["UNKNOWN"]))
    geo_counts = Counter(record.get("geoScope", "UNKNOWN") for record in records)
    frequencies = [safe_frequency(record.get("impressions"), record.get("reach")) for record in records]
    frequencies = [value for value in frequencies if value is not None]

    report = {
        "datasetVersion": paths.version,
        "metadata": metadata,
        "totalRows": metadata.get("recordCount", len(records)),
        "alignedRows": metadata.get("alignedRecordCount", aligned_rows),
        "rejectedRows": metadata.get("rejectedRecordCount", rejected_rows),
        "missingReach": missing_reach,
        "missingImpressions": missing_impressions,
        "duplicates": duplicates,
        "dateWindowMismatches": sum(
            1 for record in records if not record.get("measurementStart") or not record.get("measurementEnd")
        ),
        "geoMismatches": sum(
            1
            for record in records
            if (record.get("geoScope") or "").startswith("UNKNOWN") or record.get("measurementScope") != record.get("geoScope")
        ),
        "frequencyDistribution": {
            "count": len(frequencies),
            "min": min(frequencies) if frequencies else None,
            "median": sorted(frequencies)[len(frequencies) // 2] if frequencies else None,
            "max": max(frequencies) if frequencies else None,
        },
        "platformDistribution": dict(platform_counts),
        "advertiserDistributionTop20": dict(advertiser_counts.most_common(20)),
        "creativeDistribution": dict(creative_counts),
        "trainingSourceDistribution": dict(source_counts),
    }

    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
