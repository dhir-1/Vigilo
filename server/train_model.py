import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sqlalchemy import create_engine
import pickle
import os
from app.config import get_settings

def train_and_save_model():
    """
    Connects to the database, loads crime data, trains an XGBoost model,
    and saves it to a file.
    """
    print("Starting model training process...")
    settings = get_settings()
    
    # 1. Connect to DB and load data
    try:
        engine = create_engine(settings.database_url)
        # A simple query to get relevant fields for training
        query = """
            SELECT 
                latitude, longitude, crime_type, severity, date_occurred, time_of_day
            FROM crime_reports
            WHERE status = 'verified' AND date_occurred IS NOT NULL
        """
        df = pd.read_sql(query, engine)
        print(f"Successfully loaded {len(df)} verified crime reports from the database.")
    except Exception as e:
        print(f"Error connecting to the database or loading data: {e}")
        return

    if df.empty:
        print("No data available to train the model. Aborting.")
        return

    # 2. Feature Engineering
    print("Performing feature engineering...")
    df['date_occurred'] = pd.to_datetime(df['date_occurred'])
    df['hour'] = df['date_occurred'].dt.hour
    df['day_of_week'] = df['date_occurred'].dt.dayofweek
    df['month'] = df['date_occurred'].dt.month

    # Convert categorical variables to numerical
    df['crime_type_encoded'] = df['crime_type'].astype('category').cat.codes
    df['time_of_day_encoded'] = df['time_of_day'].astype('category').cat.codes
    
    # Target variable: We'll predict 'severity'
    # Convert severity to numerical labels
    severity_map = {'Low': 0, 'Medium': 1, 'High': 2}
    df['severity_encoded'] = df['severity'].map(severity_map)

    # Drop rows where severity is unknown
    df.dropna(subset=['severity_encoded'], inplace=True)
    df['severity_encoded'] = df['severity_encoded'].astype(int)

    print("Feature engineering complete.")

    # 3. Define features (X) and target (y)
    features = ['latitude', 'longitude', 'hour', 'day_of_week', 'month', 'crime_type_encoded', 'time_of_day_encoded']
    target = 'severity_encoded'

    X = df[features]
    y = df[target]

    # 4. Split data into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    print(f"Data split into {len(X_train)} training samples and {len(X_test)} testing samples.")

    # 5. Train the XGBoost Model
    print("Training the XGBoost model...")
    model = xgb.XGBClassifier(
        objective='multi:softmax', # For multi-class classification
        num_class=3,               # Three severity levels (Low, Medium, High)
        use_label_encoder=False,   # Suppress the warning
        eval_metric='mlogloss'     # Logarithmic loss for multi-class classification
    )
    model.fit(X_train, y_train)
    print("Model training complete.")

    # 6. Evaluate the model
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Model Accuracy: {accuracy * 100:.2f}%")

    # 7. Save the trained model
    model_path = os.path.join(os.path.dirname(__file__), 'ml_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    
    print(f"Model successfully saved to {model_path}")

if __name__ == "__main__":
    train_and_save_model()
