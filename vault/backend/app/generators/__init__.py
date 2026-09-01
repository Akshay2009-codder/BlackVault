from . import anomaly, classification, clustering, mystery, regression

GENERATORS = {
    "classification": classification.generate,
    "regression": regression.generate,
    "clustering": clustering.generate,
    "anomaly": anomaly.generate,
    "mystery": mystery.generate,
}