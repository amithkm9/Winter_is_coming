"""Optional legacy model adapter. Labels remain unverified until live calibration."""

from importlib.util import find_spec
import math
from pathlib import Path
from threading import Lock

LABELS = ("1", "2", "3", "A", "B", "C")
SEQUENCE_LENGTH = 30


class RecognitionUnavailable(Exception):
    pass


def preprocess(frames: list[list[list[float]]]) -> list[list[float]]:
    """Match archived _preprocess: wrist-centered, per-frame max absolute scale.

    Validation lives at the API boundary. No padding or fabricated observations.
    """
    output = []
    for frame in frames:
        centered = [[axis - origin for axis, origin in zip(point, frame[0])] for point in frame]
        scale = max(abs(axis) for point in centered for axis in point)
        if scale <= 1e-8:
            raise ValueError("No usable hand landmarks")
        output.append([axis / scale for point in centered for axis in point])
    return output


class Recognizer:
    def __init__(self, path: str, threshold: float = 0.85):
        self.path = Path(path).expanduser() if path else None
        self.threshold = threshold
        self._model = None
        self._ready = False
        self._load_lock = Lock()
        self._infer_lock = Lock()

    @property
    def model_exists(self) -> bool:
        return bool(self.path and self.path.is_file())

    @property
    def available(self) -> bool:
        return self.model_exists and find_spec("tensorflow") is not None

    @property
    def ready(self) -> bool:
        return self._ready

    def _ensure_loaded(self):
        if self._model is not None:
            return
        with self._load_lock:
            if self._model is None:
                if not self.available:
                    raise RecognitionUnavailable()
                try:
                    import tensorflow as tf
                    model = tf.keras.models.load_model(str(self.path), compile=False)
                    if tuple(model.input_shape[1:]) != (30, 63) or model.output_shape[-1] != 6:
                        raise ValueError("Incompatible model")
                    self._model = model
                except Exception as exc:
                    raise RecognitionUnavailable() from exc

    def _predict(self, sequence: list[list[float]]) -> list[float]:
        self._ensure_loaded()
        try:
            import numpy as np
            with self._infer_lock:
                # A direct inference call avoids predict()'s dataset/threadpool setup
                # for each tiny interactive request; no training state is updated.
                output = self._model(np.asarray([sequence], dtype=np.float32), training=False)
                if len(output) != 1:
                    raise ValueError("Invalid prediction shape")
                scores = [float(score) for score in output[0]]
            if len(scores) != 6 or any(not math.isfinite(s) or not 0 <= s <= 1 for s in scores):
                raise ValueError("Invalid prediction")
            if not math.isclose(sum(scores), 1.0, rel_tol=1e-3, abs_tol=1e-3):
                raise ValueError("Invalid probability distribution")
            self._ready = True
            return scores
        except Exception as exc:
            raise RecognitionUnavailable() from exc

    def warmup(self) -> dict:
        # Load AND execute the graph before camera capture. Synthetic data has no
        # linguistic interpretation and is never returned as a detected gesture.
        self._predict([[0.0] * 63 for _ in range(SEQUENCE_LENGTH)])
        return {"ready": True, "verified": False, "labels": list(LABELS),
                "sequenceLength": SEQUENCE_LENGTH, "featuresPerFrame": 63}

    def recognize(self, frames: list[list[list[float]]]) -> dict:
        sequence = preprocess(frames)
        scores = self._predict(sequence)
        try:
            winner = max(range(len(scores)), key=lambda i: scores[i])
            confidence = float(scores[winner])
            return {"sign": LABELS[winner] if confidence >= self.threshold else None,
                    "confidence": confidence, "source": "model", "verified": False}
        except Exception as exc:
            raise RecognitionUnavailable() from exc
