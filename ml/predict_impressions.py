from __future__ import annotations

import argparse
import importlib.util
import json
import math
from pathlib import Path

from common import bucket_active_days, bucket_reach, load_metadata


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Predict competitor Meta impressions from a production artifact.")
    parser.add_argument("--model-dir", required=True)
    parser.add_argument("--payload", required=True)
    return parser.parse_args()


def detect_xgboost_stack() -> bool:
    return (
        importlib.util.find_spec("numpy") is not None
        and importlib.util.find_spec("pandas") is not None
        and importlib.util.find_spec("xgboost") is not None
    )


def build_baseline_prediction(model_dir: Path, payload: dict, metadata: dict):
    baseline_path = model_dir / "baseline.json"
    if not baseline_path.exists():
        return {
            "status": "MODEL_NOT_AVAILABLE",
            "prediction": None,
            "reason": "Production model artifact is missing baseline metadata.",
        }

    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
    reach = float(payload.get("reach") or 0)
    if reach <= 0:
        return {
            "status": "FEATURES_INSUFFICIENT",
            "prediction": None,
            "reason": "Reach is required for the frequency model.",
        }

    platforms = ",".join(sorted(payload.get("platforms") or [])) or "unknown"
    creative = (payload.get("creativeType") or "UNKNOWN").upper()
    key = "|".join((platforms, creative, bucket_active_days(payload.get("activeDays")), bucket_reach(reach)))
    freq = baseline.get("groupMedians", {}).get(key, baseline.get("globalMedianFrequency", 1.0))
    estimate = int(round(reach * freq))
    low = int(round(reach * max(freq * 0.75, 0)))
    high = int(round(reach * max(freq * 1.25, freq)))

    return {
        "status": "PREDICTION_AVAILABLE",
        "prediction": {
            "metric": "impressions",
            "estimate": estimate,
            "low": min(low, estimate),
            "high": max(high, estimate),
            "predictedFrequency": freq,
            "source": "IN_HOUSE_MODEL",
            "dataType": "MODELED_ESTIMATE",
            "modelVersion": metadata.get("modelVersion", "unknown"),
            "datasetVersion": metadata.get("datasetVersion", "unknown"),
            "confidence": "LOW",
            "featureCoverage": 0.6,
            "distributionStatus": "PARTIAL_OOD",
            "predictedAt": metadata.get("createdAt"),
            "exactReason": "Baseline grouped-frequency model was used because no trained XGBoost production artifact is available in this environment.",
            "explanation": [
                "reach scale",
                "platform combination",
                "creative type",
                "campaign duration bucket",
            ],
        },
        "reason": None,
    }


def build_xgboost_prediction(model_dir: Path, payload: dict, metadata: dict):
    import numpy as np  # type: ignore
    import pandas as pd  # type: ignore
    from xgboost import XGBRegressor  # type: ignore

    model_path = model_dir / "xgb_frequency_model.json"
    feature_schema_path = model_dir / "xgb_feature_schema.json"
    calibration_path = model_dir / "calibration.json"
    if not model_path.exists() or not feature_schema_path.exists():
        return None

    feature_schema = json.loads(feature_schema_path.read_text(encoding="utf-8"))
    calibration = (
        json.loads(calibration_path.read_text(encoding="utf-8"))
        if calibration_path.exists()
        else {"residualP10": 0.0, "residualP90": 0.0}
    )

    reach = float(payload.get("reach") or 0)
    if reach <= 0:
        return {
            "status": "FEATURES_INSUFFICIENT",
            "prediction": None,
            "reason": "Reach is required for the frequency model.",
        }

    platforms = set(payload.get("platforms") or [])
    feature_row = {
        "reach": reach,
        "logReach": math.log1p(reach),
        "activeDays": float(payload.get("activeDays") or 0),
        "platformCount": float(len(platforms)),
        "platformFacebook": 1.0 if "FACEBOOK" in platforms else 0.0,
        "platformInstagram": 1.0 if "INSTAGRAM" in platforms else 0.0,
        "platformMessenger": 1.0 if "MESSENGER" in platforms else 0.0,
        "platformAudienceNetwork": 1.0 if "AUDIENCE_NETWORK" in platforms else 0.0,
        "creativeType": (payload.get("creativeType") or "UNKNOWN").upper(),
        "ctaType": payload.get("ctaType") or "UNKNOWN",
        "copyLength": float(payload.get("copyLength") or 0),
        "headlineLength": float(payload.get("headlineLength") or 0),
        "descriptionLength": float(payload.get("descriptionLength") or 0),
        "hasLandingDomain": 1.0 if payload.get("landingDomain") else 0.0,
        "variationGroupSize": float(payload.get("variationCount") or payload.get("similarAds") or 0),
        "labelQuality": "PUBLIC_META_DISCLOSED",
    }

    frame = pd.DataFrame([feature_row])
    encoded = pd.get_dummies(
        frame,
        columns=feature_schema.get("categoricalColumns", []),
        dummy_na=True,
    )
    for column in feature_schema.get("featureColumns", []):
        if column not in encoded.columns:
            encoded[column] = 0.0
    encoded = encoded[feature_schema.get("featureColumns", [])].astype(float)

    model = XGBRegressor()
    model.load_model(str(model_path))
    predicted_log_frequency = float(model.predict(encoded)[0])
    predicted_frequency = float(np.expm1(predicted_log_frequency))
    estimate = int(round(reach * predicted_frequency))
    low = int(round(max(0.0, estimate + float(calibration.get("residualP10", 0.0)))))
    high = int(round(max(low, estimate + float(calibration.get("residualP90", 0.0)))))

    return {
        "status": "PREDICTION_AVAILABLE",
        "prediction": {
            "metric": "impressions",
            "estimate": estimate,
            "low": min(low, estimate),
            "high": max(high, estimate),
            "predictedFrequency": predicted_frequency,
            "source": "IN_HOUSE_MODEL",
            "dataType": "MODELED_ESTIMATE",
            "modelVersion": metadata.get("modelVersion", "unknown"),
            "datasetVersion": metadata.get("datasetVersion", "unknown"),
            "confidence": "MEDIUM",
            "featureCoverage": 0.8,
            "distributionStatus": "PARTIAL_OOD",
            "predictedAt": metadata.get("createdAt"),
            "exactReason": "XGBoost frequency model prediction calibrated by validation residuals.",
            "explanation": [
                "reach scale",
                "platform combination",
                "creative type",
                "campaign duration",
                "landing domain availability",
            ],
        },
        "reason": None,
    }


def main() -> int:
    args = parse_args()
    model_dir = Path(args.model_dir)
    metadata_path = model_dir / "metadata.json"
    if not metadata_path.exists():
        print(
            json.dumps(
                {
                    "status": "MODEL_NOT_AVAILABLE",
                    "prediction": None,
                    "reason": "Production model artifact is missing metadata.",
                },
            ),
        )
        return 0

    metadata = load_metadata(type("Paths", (), {"metadata_path": metadata_path})())  # lightweight shim
    payload = json.loads(args.payload)

    if detect_xgboost_stack():
        xgb_prediction = build_xgboost_prediction(model_dir, payload, metadata)
        if xgb_prediction is not None:
            print(json.dumps(xgb_prediction))
            return 0

    print(json.dumps(build_baseline_prediction(model_dir, payload, metadata)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
