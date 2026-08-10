from __future__ import annotations

import importlib.util
import json
import math
from collections import defaultdict
from statistics import median

from common import (
    ensure_output_dir,
    feature_key,
    json_dump,
    load_metadata,
    load_records,
    now_iso,
    parse_common_args,
    resolve_dataset_paths,
    safe_frequency,
    summarize_error,
)


def baseline_predict(train_records: list[dict], target_records: list[dict]) -> tuple[list[float], dict[str, float]]:
    grouped: dict[tuple[str, str, str, str], list[float]] = defaultdict(list)
    global_freqs: list[float] = []
    for record in train_records:
        freq = safe_frequency(record.get("impressions"), record.get("reach"))
        if freq is None:
            continue
        grouped[feature_key(record)].append(freq)
        global_freqs.append(freq)

    global_median = median(global_freqs) if global_freqs else 1.0
    medians = {key: median(values) for key, values in grouped.items()}
    predictions: list[float] = []
    for record in target_records:
        freq = medians.get(feature_key(record), global_median)
        reach = float(record.get("reach") or 0)
        predictions.append(reach * freq)
    return predictions, medians


def group_holdout(records: list[dict]) -> tuple[list[dict], list[dict]]:
    advertisers = sorted(
        {(record.get("advertiserId") or record.get("advertiserName") or "unknown") for record in records},
    )
    if not advertisers:
        return records, []
    cutoff = max(1, int(len(advertisers) * 0.2))
    test_advertisers = set(advertisers[-cutoff:])
    train = [
        record
        for record in records
        if (record.get("advertiserId") or record.get("advertiserName") or "unknown")
        not in test_advertisers
    ]
    test = [
        record
        for record in records
        if (record.get("advertiserId") or record.get("advertiserName") or "unknown")
        in test_advertisers
    ]
    return train, test


def chronological_holdout(records: list[dict]) -> tuple[list[dict], list[dict]]:
    ordered = sorted(
        records,
        key=lambda record: (record.get("measurementEnd") or "", record.get("advertiserName") or ""),
    )
    if not ordered:
        return [], []
    cutoff = max(1, int(len(ordered) * 0.15))
    return ordered[:-cutoff], ordered[-cutoff:]


def detect_deps() -> dict[str, bool]:
    return {
        "numpy": importlib.util.find_spec("numpy") is not None,
        "pandas": importlib.util.find_spec("pandas") is not None,
        "xgboost": importlib.util.find_spec("xgboost") is not None,
        "sklearn": importlib.util.find_spec("sklearn") is not None,
    }


def build_feature_rows(records: list[dict]) -> list[dict]:
    rows: list[dict] = []
    for record in records:
        reach = float(record.get("reach") or 0)
        frequency = safe_frequency(record.get("impressions"), record.get("reach"))
        if reach <= 0 or frequency is None:
            continue
        platforms = set(record.get("platforms") or [])
        ad_text = record.get("adText") or ""
        headline = record.get("headline") or ""
        description = record.get("description") or ""
        rows.append(
            {
                "advertiser_key": record.get("advertiserId") or record.get("advertiserName") or "unknown",
                "measurement_end": record.get("measurementEnd") or "",
                "reach": reach,
                "logReach": math.log1p(reach),
                "activeDays": float(record.get("activeDays") or 0),
                "platformCount": float(len(platforms)),
                "platformFacebook": 1.0 if "FACEBOOK" in platforms else 0.0,
                "platformInstagram": 1.0 if "INSTAGRAM" in platforms else 0.0,
                "platformMessenger": 1.0 if "MESSENGER" in platforms else 0.0,
                "platformAudienceNetwork": 1.0 if "AUDIENCE_NETWORK" in platforms else 0.0,
                "creativeType": (record.get("creativeType") or "UNKNOWN").upper(),
                "ctaType": record.get("ctaType") or "UNKNOWN",
                "copyLength": float(len(ad_text)),
                "headlineLength": float(len(headline)),
                "descriptionLength": float(len(description)),
                "hasLandingDomain": 1.0 if record.get("landingDomain") else 0.0,
                "variationGroupSize": float(record.get("variationCount") or record.get("similarAds") or 0),
                "labelQuality": record.get("labelQuality") or "UNKNOWN",
                "impressions": float(record.get("impressions") or 0),
                "frequency": frequency,
                "target": math.log1p(frequency),
            },
        )
    return rows


def train_xgboost(
    train_rows: list[dict],
    eval_rows: list[dict],
    *,
    model_version: str,
    output_dir,
):
    import numpy as np  # type: ignore
    import pandas as pd  # type: ignore
    from xgboost import XGBRegressor  # type: ignore

    categorical_columns = ["creativeType", "ctaType", "labelQuality"]
    numeric_columns = [
        "reach",
        "logReach",
        "activeDays",
        "platformCount",
        "platformFacebook",
        "platformInstagram",
        "platformMessenger",
        "platformAudienceNetwork",
        "copyLength",
        "headlineLength",
        "descriptionLength",
        "hasLandingDomain",
        "variationGroupSize",
    ]

    train_df = pd.DataFrame(train_rows)
    eval_df = pd.DataFrame(eval_rows)
    combined = pd.concat(
        [train_df[categorical_columns + numeric_columns], eval_df[categorical_columns + numeric_columns]],
        axis=0,
        ignore_index=True,
    )
    encoded = pd.get_dummies(combined, columns=categorical_columns, dummy_na=True)
    feature_columns = list(encoded.columns)

    train_x = encoded.iloc[: len(train_df)].astype(float)
    eval_x = encoded.iloc[len(train_df) :].astype(float)
    train_y = train_df["target"].astype(float)
    eval_y = eval_df["target"].astype(float)

    train_weights = np.where(train_df["labelQuality"] == "EXACT_AUTHORIZED_META", 1.0, 0.5)
    eval_weights = np.where(eval_df["labelQuality"] == "EXACT_AUTHORIZED_META", 1.0, 0.5)

    model = XGBRegressor(
        objective="reg:squarederror",
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.0,
        min_child_weight=1.0,
        random_state=42,
        tree_method="hist",
        early_stopping_rounds=30,
    )
    model.fit(
        train_x,
        train_y,
        sample_weight=train_weights,
        eval_set=[(eval_x, eval_y)],
        sample_weight_eval_set=[eval_weights],
        verbose=False,
    )

    eval_pred_frequency = np.expm1(model.predict(eval_x))
    eval_pred_impressions = (eval_df["reach"].to_numpy(dtype=float) * eval_pred_frequency).tolist()
    eval_actual_impressions = eval_df["impressions"].astype(float).tolist()
    metrics = summarize_error(eval_actual_impressions, eval_pred_impressions)

    residuals = eval_df["impressions"].to_numpy(dtype=float) - np.array(eval_pred_impressions)
    lower_residual = float(np.quantile(residuals, 0.1)) if len(residuals) else 0.0
    upper_residual = float(np.quantile(residuals, 0.9)) if len(residuals) else 0.0

    model_path = output_dir / "xgb_frequency_model.json"
    model.save_model(str(model_path))
    json_dump(
        output_dir / "xgb_feature_schema.json",
        {
            "modelVersion": model_version,
            "featureColumns": feature_columns,
            "categoricalColumns": categorical_columns,
            "numericColumns": numeric_columns,
        },
    )
    json_dump(
        output_dir / "calibration.json",
        {
            "modelVersion": model_version,
            "residualP10": lower_residual,
            "residualP90": upper_residual,
        },
    )

    return {
        "modelPath": str(model_path),
        "featureColumns": feature_columns,
        "metrics": metrics,
        "calibration": {
            "residualP10": lower_residual,
            "residualP90": upper_residual,
        },
    }


def main() -> int:
    args = parse_common_args("Train the Meta competitor impressions model.")
    paths = resolve_dataset_paths(args.dataset_version, args.dataset_dir)
    metadata = load_metadata(paths)
    records = [record for record in load_records(paths) if record.get("isLabelAligned")]
    output_dir = ensure_output_dir(args.output_dir, args.experiment_name or paths.version)

    if not records:
        print(
            json.dumps(
                {
                    "status": "GROUND_TRUTH_DATA_REQUIRED",
                    "datasetVersion": paths.version,
                    "alignedRecordCount": 0,
                    "message": "No aligned ground-truth rows are available. Import authorized Meta Ads Insights data before training.",
                },
                indent=2,
            ),
        )
        return 2

    dependency_status = detect_deps()
    feature_rows = build_feature_rows(records)

    train_group, test_group = group_holdout(records)
    baseline_group_predictions, baseline_groups = baseline_predict(train_group, test_group)
    baseline_group_metrics = (
        summarize_error(
            [float(record["impressions"]) for record in test_group],
            baseline_group_predictions,
        )
        if test_group
        else summarize_error([], [])
    )

    train_time, test_time = chronological_holdout(records)
    baseline_time_predictions, baseline_time_groups = baseline_predict(train_time, test_time)
    baseline_time_metrics = (
        summarize_error(
            [float(record["impressions"]) for record in test_time],
            baseline_time_predictions,
        )
        if test_time
        else summarize_error([], [])
    )

    report = {
        "status": "BASELINE_ONLY",
        "trainedAt": now_iso(),
        "datasetVersion": paths.version,
        "recordCount": len(records),
        "featureRowCount": len(feature_rows),
        "metadata": metadata,
        "dependencies": dependency_status,
        "baseline": {
            "groupedBy": ["platformCombination", "creativeType", "activeDayBucket", "reachBucket"],
            "unseenAdvertiser": baseline_group_metrics,
            "chronologicalFuture": baseline_time_metrics,
        },
        "ml": None,
    }

    global_freqs = [
        safe_frequency(record.get("impressions"), record.get("reach"))
        for record in records
        if safe_frequency(record.get("impressions"), record.get("reach")) is not None
    ]

    json_dump(
        output_dir / "baseline.json",
        {
            "globalMedianFrequency": median(global_freqs) if global_freqs else 1.0,
            "groupMedians": {"|".join(key): value for key, value in baseline_time_groups.items()},
        },
    )
    json_dump(
        output_dir / "feature_schema.json",
        {
            "predictorType": "baseline_group_median",
            "features": [
                "reach",
                "platform combination",
                "creative type",
                "active-day bucket",
                "reach bucket",
            ],
        },
    )
    json_dump(
        output_dir / "metadata.json",
        {
            "modelVersion": args.experiment_name or paths.version,
            "datasetVersion": paths.version,
            "predictorType": "baseline_group_median",
            "status": report["status"],
            "createdAt": report["trainedAt"],
        },
    )

    if not all(dependency_status.values()):
        json_dump(output_dir / "metrics.json", report)
        print(
            json.dumps(
                {
                    **report,
                    "message": "Baseline artifact was created. Install ml/requirements.txt to enable XGBoost frequency training.",
                },
                indent=2,
            ),
        )
        return 0

    group_train_rows = build_feature_rows(train_group)
    group_eval_rows = build_feature_rows(test_group)
    time_train_rows = build_feature_rows(train_time)
    time_eval_rows = build_feature_rows(test_time)

    if not group_train_rows or not group_eval_rows or not time_train_rows or not time_eval_rows:
        json_dump(output_dir / "metrics.json", report)
        print(
            json.dumps(
                {
                    **report,
                    "message": "Baseline artifact was created, but there were not enough rows to train/evaluate XGBoost safely.",
                },
                indent=2,
            ),
        )
        return 0

    group_ml = train_xgboost(
        group_train_rows,
        group_eval_rows,
        model_version=args.experiment_name or paths.version,
        output_dir=output_dir,
    )
    time_ml = train_xgboost(
        time_train_rows,
        time_eval_rows,
        model_version=args.experiment_name or paths.version,
        output_dir=output_dir,
    )

    report["status"] = "BASELINE_AND_XGBOOST"
    report["ml"] = {
        "unseenAdvertiser": group_ml["metrics"],
        "chronologicalFuture": time_ml["metrics"],
        "calibration": time_ml["calibration"],
        "artifacts": {
            "modelPath": time_ml["modelPath"],
            "featureSchemaPath": str(output_dir / "xgb_feature_schema.json"),
            "calibrationPath": str(output_dir / "calibration.json"),
        },
    }

    json_dump(
        output_dir / "metadata.json",
        {
            "modelVersion": args.experiment_name or paths.version,
            "datasetVersion": paths.version,
            "predictorType": "xgboost_frequency_with_baseline_fallback",
            "status": report["status"],
            "createdAt": report["trainedAt"],
        },
    )
    json_dump(output_dir / "metrics.json", report)
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
