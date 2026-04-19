import os
import pickle

import pandas as pd
import xgboost as xgb
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sqlalchemy import create_engine

from app.config import get_settings


TRUST_FEATURE_COLUMNS = [
    "latitude",
    "longitude",
    "hour",
    "day_of_week",
    "month",
    "desc_length",
    "word_count",
    "unique_ratio",
    "structured_detail_count",
    "number_count",
    "has_area_name",
    "area_name_length",
    "has_time_of_day",
    "has_media",
    "file_count",
    "gps_region",
    "crime_type_encoded",
    "severity_encoded",
    "time_of_day_encoded",
]

CRIME_TYPE_MAP = {
    "Theft": 0,
    "Assault": 1,
    "Robbery": 2,
    "Vandalism": 3,
    "Burglary": 4,
    "Harassment": 5,
    "Fraud": 6,
    "Drug Related": 7,
    "Other": 8,
}

SEVERITY_MAP = {"Low": 0, "Medium": 1, "High": 2}
TIME_OF_DAY_MAP = {"Morning": 0, "Afternoon": 1, "Evening": 2, "Night": 3}


def _normalize_text(text: str) -> str:
    return " ".join((text or "").strip().lower().split())


def _tokenize(text: str) -> list[str]:
    import re

    return re.findall(r"[a-zA-Z0-9']+", (text or "").lower())


def _count_structured_details(description: str) -> int:
    desc_lower = (description or "").lower()
    markers = [
        "people involved:",
        "weapon involved:",
        "vehicle information:",
        "items stolen or affected:",
        "property damaged:",
        "money or account affected:",
        "suspect or witness notes:",
    ]
    count = sum(1 for marker in markers if marker in desc_lower)
    count += (description or "").count("\n- ")
    return min(count, 5)


def build_training_dataframe(df: pd.DataFrame):
    if df.empty:
        return df, CRIME_TYPE_MAP, SEVERITY_MAP, TIME_OF_DAY_MAP

    frame = df.copy()
    frame["date_occurred"] = pd.to_datetime(frame["date_occurred"], errors="coerce")
    frame = frame.dropna(subset=["date_occurred"])

    frame["description"] = frame["description"].fillna("")
    frame["area_name"] = frame["area_name"].fillna("")
    frame["time_of_day"] = frame["time_of_day"].fillna("")
    frame["media_urls"] = frame["media_urls"].fillna("")

    frame["hour"] = frame["date_occurred"].dt.hour
    frame["day_of_week"] = frame["date_occurred"].dt.dayofweek
    frame["month"] = frame["date_occurred"].dt.month
    frame["desc_length"] = frame["description"].apply(lambda value: len(value.strip()))
    frame["word_count"] = frame["description"].apply(lambda value: len(_tokenize(value)))
    frame["unique_ratio"] = frame["description"].apply(
        lambda value: (
            len(set(_tokenize(value))) / len(_tokenize(value))
            if len(_tokenize(value)) > 0
            else 0.0
        )
    )
    frame["structured_detail_count"] = frame["description"].apply(_count_structured_details)
    frame["number_count"] = frame["description"].str.count(r"\b\d+\b")
    frame["has_area_name"] = frame["area_name"].apply(lambda value: int(bool(value.strip())))
    frame["area_name_length"] = frame["area_name"].apply(lambda value: len(value.strip()))
    frame["has_time_of_day"] = frame["time_of_day"].apply(lambda value: int(bool(value.strip())))
    frame["has_media"] = frame["media_urls"].apply(lambda value: int(bool(str(value).strip() and str(value).strip() != "[]")))
    frame["file_count"] = frame["media_urls"].apply(
        lambda value: str(value).count("http") if "http" in str(value) else int(bool(str(value).strip() and str(value).strip() != "[]"))
    )
    frame["gps_region"] = frame.apply(_gps_region, axis=1)

    frame["crime_type_encoded"] = frame["crime_type"].map(CRIME_TYPE_MAP).fillna(-1).astype(int)
    frame["severity_encoded"] = frame["severity"].map(SEVERITY_MAP).fillna(-1).astype(int)
    frame["time_of_day_encoded"] = frame["time_of_day"].map(TIME_OF_DAY_MAP).fillna(-1).astype(int)
    frame["target"] = frame["status"].map({"verified": 1, "resolved": 1, "rejected": 0})

    frame = frame.dropna(subset=["target"])
    frame["target"] = frame["target"].astype(int)

    return frame, CRIME_TYPE_MAP, SEVERITY_MAP, TIME_OF_DAY_MAP


def _gps_region(row) -> int:
    lat = row["latitude"]
    lng = row["longitude"]
    if 21.0 <= lat <= 21.3 and 72.7 <= lng <= 72.9:
        return 2
    if 20.9 <= lat <= 21.4 and 72.6 <= lng <= 73.0:
        return 1
    return 0


def train_and_save_trust_model():
    print("Starting trust-model training process...")
    settings = get_settings()

    try:
        engine = create_engine(settings.database_url)
        query = """
            SELECT
                latitude,
                longitude,
                crime_type,
                severity,
                description,
                area_name,
                date_occurred,
                time_of_day,
                status,
                media_urls
            FROM crime_reports
            WHERE status IN ('verified', 'resolved', 'rejected')
              AND date_occurred IS NOT NULL
        """
        raw_df = pd.read_sql(query, engine)
    except Exception as exc:
        print(f"Error connecting to the database or loading data: {exc}")
        return

    if raw_df.empty:
        print("No reviewed reports available for trust-model training.")
        return

    training_df, crime_type_map, severity_map, time_of_day_map = build_training_dataframe(raw_df)
    class_counts = training_df["target"].value_counts().to_dict()
    if len(class_counts) < 2 or min(class_counts.values()) < 5 or len(training_df) < 30:
        print(
            "Not enough balanced reviewed data to train a reliable trust model. "
            f"Need at least 30 reviewed rows and 5 samples per class, got {class_counts}."
        )
        return

    X = training_df[TRUST_FEATURE_COLUMNS]
    y = training_df["target"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    model = xgb.XGBClassifier(
        objective="binary:logistic",
        eval_metric="logloss",
        max_depth=4,
        n_estimators=120,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
    )
    model.fit(X_train, y_train)

    y_pred = (model.predict_proba(X_test)[:, 1] >= 0.5).astype(int)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Trust-model accuracy: {accuracy * 100:.2f}%")

    bundle = {
        "model": model,
        "feature_columns": TRUST_FEATURE_COLUMNS,
        "crime_type_map": crime_type_map,
        "severity_map": severity_map,
        "time_of_day_map": time_of_day_map,
    }

    output_path = os.path.join(os.path.dirname(__file__), "trust_model.pkl")
    with open(output_path, "wb") as model_file:
        pickle.dump(bundle, model_file)

    print(f"Trust model saved to {output_path}")


if __name__ == "__main__":
    train_and_save_trust_model()
