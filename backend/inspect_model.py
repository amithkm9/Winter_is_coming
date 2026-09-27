"""Read-only technical smoke check; synthetic data cannot verify sign accuracy."""

import hashlib
import json
import os
from pathlib import Path

from dotenv import load_dotenv


def main():
    load_dotenv(Path(__file__).with_name(".env"))
    path = Path(os.environ["LEARNSIGN_MODEL_PATH"])
    before = hashlib.sha256(path.read_bytes()).hexdigest()
    import numpy as np
    import tensorflow as tf

    model = tf.keras.models.load_model(str(path), compile=False)
    tensor = np.random.default_rng(42).normal(0, 0.2, (1, 30, 63)).astype(np.float32)
    output = np.asarray(model(tensor, training=False))
    assert tuple(model.input_shape[1:]) == (30, 63)
    assert output.shape == (1, 6) and np.isfinite(output).all()
    assert hashlib.sha256(path.read_bytes()).hexdigest() == before
    print(
        json.dumps(
            {
                "tensorflow": tf.__version__,
                "keras": tf.keras.__version__,
                "numpy": np.__version__,
                "model_bytes": path.stat().st_size,
                "sha256": before,
                "input_shape": list(model.input_shape),
                "output_shape": list(output.shape),
                "layers": [layer.__class__.__name__ for layer in model.layers],
                "parameter_count": model.count_params(),
                "synthetic_output": output.tolist(),
                "finite": bool(np.isfinite(output).all()),
                "probability_sum": float(output.sum()),
                "archive_unchanged": True,
                "label_order_verified": False,
                "sign_accuracy_tested": False,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
