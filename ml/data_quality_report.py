from __future__ import annotations

import json
from collections import Counter

from common import csv_number, load_metadata, load_records, parse_common_args, resolve_dataset_paths, safe_frequency


def num(record: dict, key: str):
    return csv_number(record.get(key))


def main() -> int:
    args = parse_common_args("Inspect Meta impressions training data quality.")
    paths = resolve_dataset_paths(args.dataset_version, args.dataset_dir)
    metadata = load_metadata(paths)
    records = load_records(paths)

    missing_reach = sum(1 for record in records if not num(record, "reach"))
    missing_impressions = sum(1 for record in records if not num(record, "impressions"))
    aligned_rows = sum(1 for record in records if record.get("isLabelAligned"))
    rejected_rows = len(records) - aligned_rows
    duplicates = len(records) - len({record.get("recordId") for record in records})
    source_counts = Counter(record.get("labelQuality", "UNKNOWN") for record in records)
    advertiser_counts = Counter(record.get("advertiserName", "UNKNOWN") for record in records)
    creative_counts = Counter(record.get("creativeType", "UNKNOWN") for record in records)
    platform_counts = Counter(platform for record in records for platform in (record.get("platforms") or ["UNKNOWN"]))
    geo_counts = Counter(record.get("geoScope", "UNKNOWN") for record in records)
    exact_reach_rows = sum(1 for record in records if num(record, "reach") is not None and num(record, "reach") > 0)
    exact_impression_rows = sum(
        1 for record in records if num(record, "impressions") is not None and num(record, "impressions") > 0
    )
    range_impression_rows = sum(
        1
        for record in records
        if num(record, "impressions") is None
        and num(record, "impressionsLow") is not None
        and num(record, "impressionsHigh") is not None
    )
    exact_pairs = sum(
        1
        for record in records
        if num(record, "reach") is not None
        and num(record, "reach") > 0
        and num(record, "impressions") is not None
        and num(record, "impressions") > 0
    )
    frequencies = [safe_frequency(num(record, "impressions"), num(record, "reach")) for record in records]
    frequencies = [value for value in frequencies if value is not None]

    report = {
        "datasetVersion": paths.version,
        "metadata": metadata,
        "totalRows": metadata.get("recordCount", len(records)),
        "alignedRows": metadata.get("alignedRecordCount", aligned_rows),
        "rejectedRows": metadata.get("rejectedRecordCount", rejected_rows),
        "missingReach": missing_reach,
        "missingImpressions": missing_impressions,
        "exactReachRows": exact_reach_rows,
        "exactImpressionRows": exact_impression_rows,
        "rangeImpressionRows": range_impression_rows,
        "exactReachImpressionPairs": exact_pairs,
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
