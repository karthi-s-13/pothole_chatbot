import logging
from pathlib import Path

import cv2

from .config import BASE_DIR, settings

logger = logging.getLogger(__name__)

_model = None


class ModelNotLoadedError(RuntimeError):
    """Raised when the RT-DETR weights file is missing or fails to load."""


def load_model():
    """Lazily load (and cache) the RT-DETR model. Safe to call repeatedly."""
    global _model
    if _model is not None:
        return _model

    target_path = settings.weights_path
    if not target_path.exists():
        fallback_candidates = [
            settings.weights_path.parent / "best.pt",
            BASE_DIR / "model" / "pothole_rtdetr_best.pt",
            BASE_DIR / "model" / "best.pt",
            BASE_DIR.parent / "model" / "pothole_rtdetr_best.pt",
            BASE_DIR.parent / "model" / "best.pt",
            Path("/app/model/pothole_rtdetr_best.pt"),
            Path("/app/model/best.pt"),
        ]
        for candidate in fallback_candidates:
            if candidate.exists():
                target_path = candidate
                break

    if not target_path.exists():
        if settings.weights_url:
            logger.info("Weights not found locally. Downloading from %s...", settings.weights_url)
            import urllib.request
            target_path.parent.mkdir(parents=True, exist_ok=True)
            try:
                urllib.request.urlretrieve(settings.weights_url, str(target_path))
                logger.info("Weights downloaded successfully to %s", target_path)
            except Exception as dl_err:
                raise ModelNotLoadedError(f"Failed to download weights from {settings.weights_url}: {dl_err}") from dl_err
        else:
            raise ModelNotLoadedError(
                f"Model weights not found at {settings.weights_path} or {target_path}. "
                "Ensure best.pt or pothole_rtdetr_best.pt exists or set WEIGHTS_PATH / WEIGHTS_URL in .env."
            )

    import gc
    import os
    import tempfile
    import torch

    os.environ.setdefault("YOLO_CONFIG_DIR", os.path.join(tempfile.gettempdir(), "Ultralytics"))
    torch.set_grad_enabled(False)
    try:
        torch.set_num_threads(2)
    except Exception:
        pass

    from ultralytics import RTDETR  # imported lazily: heavy import, and lets the API boot even if torch is broken

    logger.info("Loading RT-DETR weights from %s", target_path)
    try:
        _model = RTDETR(str(target_path))
    except Exception as e:  # corrupt weights, incompatible torch version, etc.
        raise ModelNotLoadedError(f"Failed to load model weights: {e}") from e

    gc.collect()
    return _model


def _classify_position(cx_frac: float, cy_frac: float) -> str:
    """3x3-grid position label from a bbox center expressed as a fraction of image width/height.

    Computed here -- deterministically, from real pixel coordinates -- rather than left to the
    LLM to infer from raw bbox numbers, which it cannot reliably do.
    """
    h = "left" if cx_frac < 1 / 3 else "right" if cx_frac > 2 / 3 else "center"
    v = "top" if cy_frac < 1 / 3 else "bottom" if cy_frac > 2 / 3 else "middle"
    if v == "middle" and h == "center":
        return "center"
    return f"{v}-{h}"


def _confidence_label(confidence: float) -> str:
    return "high" if confidence >= 0.85 else "moderate"


def _enrich_detections(boxes: list[dict], img_w: int, img_h: int) -> list[dict]:
    """Add position, relative size, and confidence-tier fields the chatbot can quote directly
    instead of doing its own (unreliable) arithmetic on raw pixel coordinates."""
    img_area = img_w * img_h
    for b in boxes:
        x1, y1, x2, y2 = b["bbox"]
        w, h = x2 - x1, y2 - y1
        area = w * h
        cx, cy = x1 + w / 2, y1 + h / 2
        b["position"] = _classify_position(cx / img_w, cy / img_h)
        b["relative_area_pct"] = round(area / img_area * 100, 2) if img_area else 0.0
        b["confidence_label"] = _confidence_label(b["confidence"])

    # Rank by area so "largest"/"smallest" questions are answered by a sort, not LLM guesswork.
    order = sorted(range(len(boxes)), key=lambda i: boxes[i]["relative_area_pct"], reverse=True)
    for rank, idx in enumerate(order):
        if len(boxes) == 1:
            boxes[idx]["size_rank"] = "only"
        elif rank == 0:
            boxes[idx]["size_rank"] = "largest"
        elif rank == len(order) - 1:
            boxes[idx]["size_rank"] = "smallest"
        else:
            boxes[idx]["size_rank"] = "medium"

    return boxes


def run_inference(image_path: Path, annotated_out_path: Path) -> list[dict]:
    """Run pothole detection on one image, write an annotated copy, and return the boxes found."""
    model = load_model()

    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Could not read image file: {image_path}")

    img_h, img_w = image.shape[:2]

    import gc
    import torch

    with torch.no_grad():
        results = model.predict(
            source=image,
            conf=settings.confidence_threshold,
            device="cpu",
            verbose=False,
            imgsz=640,
        )
    result = results[0]

    boxes: list[dict] = []
    for box in result.boxes:
        cls_id = int(box.cls[0])
        confidence = float(box.conf[0])
        x1, y1, x2, y2 = (float(v) for v in box.xyxy[0])
        class_name = result.names.get(cls_id, str(cls_id))
        boxes.append(
            {
                "class_name": class_name,
                "confidence": round(confidence, 4),
                "bbox": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
            }
        )

    boxes = _enrich_detections(boxes, img_w, img_h)

    annotated = result.plot()  # BGR numpy array with boxes drawn
    annotated_out_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(annotated_out_path), annotated)

    del results
    del result
    gc.collect()

    return boxes
