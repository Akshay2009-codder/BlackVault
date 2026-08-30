from . import anomaly, classification, clustering, regression

GENERATORS = {
    "classification": classification.generate,
    "regression": regression.generate,
    "clustering": clustering.generate,
    "anomaly": anomaly.generate,
}
