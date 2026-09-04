// ML Puzzles for BlackVault Doors (Door 1 -> Door 5 with escalating difficulty)
// Each puzzle contains Python ML code with realistic bugs marked for red highlighting,
// error explanations, validation tests, and initial starter code.

export const ML_PUZZLES = {
  classification: {
    doorType: "classification",
    title: "Iris KNN Classifier Pipeline",
    fileName: "knn_classifier.py",
    level: 1,
    difficulty: "LEVEL 1 — NOVICE (2 BUGS)",
    problemStatement: "The security sub-routine failed because the KNN model was configured with string parameters instead of integers, and the pipeline attempted to evaluate predictions without training (fitting) the model first.",
    brokenLines: [8, 14], // 1-indexed
    errorAnnotations: {
      8: "TypeError: 'n_neighbors' must be an integer, but got string '5'",
      14: "NotFittedError: This KNeighborsClassifier instance is not fitted yet. Call 'fit' before 'predict'."
    },
    hints: [
      "Check the type of 'n_neighbors' on line 8. It should be an integer, not a string.",
      "You must call knn.fit(X_train, y_train) before evaluating or predicting."
    ],
    initialCode: `# BlackVault Security Subsystem — Classification Gate
# Door 1: KNN Target Classifier
import numpy as np
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score

# 1. Load security iris dataset
iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.3, random_state=42
)

# 2. Instantiate KNN Model
# BUG 1: n_neighbors is passed as a string instead of an int!
knn = KNeighborsClassifier(n_neighbors="5", weights="uniform")

# 3. Train the model
# BUG 2: Missing fit step! (Model is used without training)
# knn.fit(X_train, y_train)

# 4. Predict and evaluate
y_pred = knn.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"[SECURITY CHECK] Model Accuracy: {acc:.4f}")

if acc >= 0.90:
    print("SUCCESS: Gate 1 Classification verified. Door unlocked.")
else:
    raise ValueError(f"Accuracy {acc:.2f} is below required threshold 0.90")
`,
    expectedVariables: ["acc"],
    minAccuracy: 0.90
  },

  regression: {
    doorType: "regression",
    title: "Thermal Sensor Linear Regression",
    fileName: "thermal_regression.py",
    level: 2,
    difficulty: "LEVEL 2 — INTERMEDIATE (2 BUGS)",
    problemStatement: "The thermal calibration model failed because feature dimensions are swapped during fitting, and prediction was called with un-scaled test data against a pipeline expecting standard scaling.",
    brokenLines: [15, 21], // 1-indexed
    errorAnnotations: {
      15: "ValueError: X and y have incompatible shapes. Swapped target variable and features.",
      21: "AttributeError / ValueError: Scaler was fit on train data, but predict was called with unscaled raw X_test."
    },
    hints: [
      "Check line 15: scaler.fit_transform should be called on X_train, and y_train is the target vector.",
      "Check line 21: make sure to transform X_test using the scaler before calling model.predict."
    ],
    initialCode: `# BlackVault Security Subsystem — Thermal Calibration
# Door 2: Linear Regression Model
import numpy as np
from sklearn.datasets import fetch_california_housing
from sklearn.model_selection import train_test_split
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score

# 1. Load sensor readings
data = fetch_california_housing()
X, y = data.data[:1000], data.target[:1000]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

# 2. Standardize sensor features
scaler = StandardScaler()
# BUG 1: Fitting scaler on y_train instead of X_train!
X_train_scaled = scaler.fit_transform(y_train.reshape(-1, 1))

# 3. Fit Ridge Regression model
model = Ridge(alpha=1.0)
model.fit(X_train, y_train)

# 4. Predict on test set
# BUG 2: Using unscaled raw test data or mismatched shape
y_pred = model.predict(X_test_scaled if 'X_test_scaled' in locals() else X_test)
score = r2_score(y_test, y_pred)
print(f"[SECURITY CHECK] Calibration R^2 Score: {score:.4f}")

if score >= 0.50:
    print("SUCCESS: Gate 2 Calibration verified. Door unlocked.")
else:
    raise ValueError(f"R^2 Score {score:.2f} is below required threshold 0.50")
`,
    expectedVariables: ["score"],
    minScore: 0.50
  },

  clustering: {
    doorType: "clustering",
    title: "Intrusion Cluster Segmentation",
    fileName: "kmeans_cluster.py",
    level: 3,
    difficulty: "LEVEL 3 — ADVANCED (3 BUGS)",
    problemStatement: "The cluster analysis engine crashed due to invalid cluster count (0), calling a non-existent method name, and missing the silhouette score import required to measure cluster cohesion.",
    brokenLines: [4, 15, 20],
    errorAnnotations: {
      4: "NameError: silhouette_score is not imported from sklearn.metrics",
      15: "ValueError: n_clusters must be > 0; got 0",
      20: "AttributeError: 'KMeans' object has no attribute 'fit_predict_score'. Did you mean 'fit_predict'?"
    },
    hints: [
      "Add 'silhouette_score' to the sklearn.metrics import on line 4.",
      "KMeans n_clusters must be greater than 0 (e.g., n_clusters=3).",
      "Use kmeans.fit_predict(X) to get cluster labels, not 'fit_predict_score'."
    ],
    initialCode: `# BlackVault Security Subsystem — Cluster Analysis
# Door 3: KMeans Intrusion Clustering
import numpy as np
from sklearn.datasets import make_blobs
from sklearn.cluster import KMeans
# BUG 1: Missing silhouette_score import from sklearn.metrics!
from sklearn.metrics import adjusted_rand_score

# 1. Generate multi-dimensional access logs
X, y_true = make_blobs(n_samples=500, centers=3, n_features=4, random_state=42)

# 2. Instantiate KMeans clusterer
# BUG 2: n_clusters cannot be 0! Set to 3
kmeans = KMeans(n_clusters=0, random_state=42, n_init=10)

# 3. Fit clusterer and compute labels
# BUG 3: Typo in method name 'fit_predict_score'
labels = kmeans.fit_predict_score(X)

# 4. Measure cluster separation
sil_score = silhouette_score(X, labels)
print(f"[SECURITY CHECK] Silhouette Separation Score: {sil_score:.4f}")

if sil_score >= 0.60:
    print("SUCCESS: Gate 3 Clustering verified. Door unlocked.")
else:
    raise ValueError(f"Silhouette score {sil_score:.2f} is below required 0.60")
`,
    expectedVariables: ["sil_score"],
    minScore: 0.60
  },

  anomaly: {
    doorType: "anomaly",
    title: "Isolation Forest Anomaly Sentinel",
    fileName: "isolation_sentinel.py",
    level: 4,
    difficulty: "LEVEL 4 — EXPERT (3 BUGS)",
    problemStatement: "The anomaly detector failed because contamination parameter was set beyond the valid range (0, 0.5], missing the IsolationForest class import, and inverted anomaly decision threshold indexing.",
    brokenLines: [3, 14, 18],
    errorAnnotations: {
      3: "ImportError: IsolationForest must be imported from sklearn.ensemble, not sklearn.tree",
      14: "ValueError: contamination must be in (0, 0.5], got 1.5",
      18: "IndexError / LogicError: Anomaly predictions in IsolationForest are +1 (inlier) and -1 (outlier). Inverted logic."
    },
    hints: [
      "Line 3: Import IsolationForest from sklearn.ensemble, not sklearn.tree.",
      "Line 14: Contamination represents the proportion of outliers, e.g., contamination=0.1.",
      "Line 18: IsolationForest returns -1 for outliers and 1 for inliers."
    ],
    initialCode: `# BlackVault Security Subsystem — Anomaly Detection Sentinel
# Door 4: Isolation Forest Outlier Filter
import numpy as np
# BUG 1: Wrong module! IsolationForest is in sklearn.ensemble
from sklearn.tree import IsolationForest

# 1. Synthetic network traffic stream
np.random.seed(42)
inliers = 0.3 * np.random.randn(200, 2)
outliers = np.random.uniform(low=-4, high=4, size=(20, 2))
X_stream = np.vstack([inliers, outliers])

# 2. Configure Isolation Forest
# BUG 2: Contamination must be in range (0, 0.5] (e.g. 0.1), not 1.5!
detector = IsolationForest(contamination=1.5, random_state=42)
detector.fit(X_stream)

# 3. Detect anomalies
raw_preds = detector.predict(X_stream)
# BUG 3: IsolationForest marks anomalies as -1, inliers as +1
# Detected anomalies count should inspect raw_preds == -1
detected_outliers = np.sum(raw_preds == 0)

print(f"[SECURITY CHECK] Detected Anomalies: {detected_outliers} / 20 expected")

if 15 <= detected_outliers <= 25:
    print("SUCCESS: Gate 4 Anomaly Sentinel online. Door unlocked.")
else:
    raise ValueError(f"Outlier count {detected_outliers} did not match expected anomaly profile")
`,
    expectedVariables: ["detected_outliers"]
  },

  mystery: {
    doorType: "mystery",
    title: "Deep Neural MLP Vault Decryptor",
    fileName: "vault_mlp_decryptor.py",
    level: 5,
    difficulty: "LEVEL 5 — MASTER (4 BUGS)",
    problemStatement: "The master vault neural network fails to converge: invalid activation function name, missing feature standard scaling causing gradient explosion, negative learning rate, and missing max_iter parameter causing premature stop.",
    brokenLines: [11, 16, 20, 22],
    errorAnnotations: {
      11: "ConvergenceWarning: Neural network failed without feature normalization (StandardScaler missing).",
      16: "ValueError: The activation 'super_relu' is not supported. Supported activations: ('identity', 'logistic', 'tanh', 'relu').",
      20: "ValueError: learning_rate_init must be > 0; got -0.01",
      22: "ValueError: max_iter must be a positive integer, not 1"
    },
    hints: [
      "Use StandardScaler to scale X_train and X_test prior to training MLPClassifier.",
      "Activation function must be 'relu', 'tanh', 'logistic', or 'identity'.",
      "learning_rate_init must be a positive float like 0.001 or 0.01.",
      "Set max_iter to at least 200 or 300 so the network has enough iterations to converge."
    ],
    initialCode: `# BlackVault Master Security Core — Deep Vault Decryptor
# Door 5: Multi-Layer Perceptron Neural Decryptor
import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score

# 1. Generate encrypted quantum telemetry dataset
X, y = make_classification(n_samples=600, n_features=12, n_informative=8, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# BUG 1: Missing feature normalization with StandardScaler!
# scaler = StandardScaler()
# X_train = scaler.fit_transform(X_train)
# X_test = scaler.transform(X_test)

# 2. Configure Deep MLP Classifier
mlp = MLPClassifier(
    hidden_layer_sizes=(64, 32),
    # BUG 2: Invalid activation 'super_relu'! Change to 'relu'
    activation="super_relu",
    solver="adam",
    # BUG 3: Negative learning rate! Change to 0.005
    learning_rate_init=-0.01,
    # BUG 4: max_iter=1 terminates immediately! Change to 300
    max_iter=1,
    random_state=42
)

# 3. Train and test neural network
mlp.fit(X_train, y_train)
y_pred = mlp.predict(X_test)
final_acc = accuracy_score(y_test, y_pred)

print(f"[SECURITY CHECK] Master Neural Accuracy: {final_acc:.4f}")

if final_acc >= 0.85:
    print("SUCCESS: Master Vault Core Decrypted! All security sectors unlocked.")
else:
    raise ValueError(f"Neural accuracy {final_acc:.2f} is below master vault threshold 0.85")
`,
    expectedVariables: ["final_acc"],
    minAccuracy: 0.85
  }
};
