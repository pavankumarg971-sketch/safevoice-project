import os
import sys
import csv
import math
import pickle
import random

# Ensure root is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from training.model import NaiveBayesTextClassifier

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "inference")

def load_dataset():
    dataset_path = os.path.join(DATA_DIR, "dataset.csv")
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset not found at {dataset_path}.")
    texts = []
    labels = []
    with open(dataset_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if row.get('text') and row.get('label'):
                texts.append(str(row['text']).strip())
                labels.append(str(row['label']).strip().upper())
    return texts, labels

def train():
    texts, labels = load_dataset()
    print(f"Loaded {len(texts)} training samples across classes: {set(labels)}")

    # Shuffle with fixed seed for evaluation
    combined = list(zip(texts, labels))
    random.seed(42)
    random.shuffle(combined)
    texts_shuffled, labels_shuffled = zip(*combined)

    split_idx = int(0.8 * len(texts_shuffled))
    X_train, X_val = texts_shuffled[:split_idx], texts_shuffled[split_idx:]
    y_train, y_val = labels_shuffled[:split_idx], labels_shuffled[split_idx:]

    eval_model = NaiveBayesTextClassifier()
    eval_model.fit(X_train, y_train)

    correct = 0
    for txt, true_lbl in zip(X_val, y_val):
        pred_lbl, conf = eval_model.predict_proba(txt)
        if pred_lbl == true_lbl:
            correct += 1
    accuracy = correct / len(y_val) if y_val else 1.0
    print(f"Validation accuracy on split: {accuracy * 100:.1f}% ({correct}/{len(y_val)})")

    # Now fit final model on 100% of the data for maximum vocabulary coverage
    final_model = NaiveBayesTextClassifier()
    final_model.fit(texts, labels)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    model_path = os.path.join(OUTPUT_DIR, "model.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(final_model, f)
    print(f"Final model successfully trained and saved to: {model_path}")

    # Quick test
    sample_tests = [
        "Someone is following me help me please",
        "Stop threatening me or I will call police",
        "Hello how are you today having lunch",
        "I am lost in the dark and terrified",
    ]
    print("\n--- Test Predictions ---")
    for s in sample_tests:
        pred, conf = final_model.predict_proba(s)
        print(f"'{s}' -> {pred} ({conf*100:.1f}%)")

if __name__ == "__main__":
    train()
