"""Run the deployed model against the held-out validation set, match predictions to ground truth
via IoU, and surface genuine failure cases (false negatives, false positives, threshold-suppressed
detections) with image-quality diagnostics (blur, brightness, box size) to help root-cause them.
"""
import json
from pathlib import Path

import cv2
import numpy as np
from ultralytics import RTDETR

WEIGHTS = "C:/download/raap/model/pothole_rtdetr_best.pt"
VAL_IMAGES = Path("C:/download/raap/model/pothole_dataset/valid/images")
VAL_LABELS = Path("C:/download/raap/model/pothole_dataset/valid/labels")
PROD_CONF_THRESHOLD = 0.66
LOW_CONF_SCAN = 0.05  # scan low to see everything the model even considers
IOU_MATCH = 0.4

model = RTDETR(WEIGHTS)


def load_gt_boxes(label_path, img_w, img_h):
    boxes = []
    if not label_path.exists():
        return boxes
    for line in label_path.read_text().splitlines():
        parts = line.split()
        if len(parts) != 5:
            continue
        _, xc, yc, w, h = map(float, parts)
        x1 = (xc - w / 2) * img_w
        y1 = (yc - h / 2) * img_h
        x2 = (xc + w / 2) * img_w
        y2 = (yc + h / 2) * img_h
        boxes.append([x1, y1, x2, y2])
    return boxes


def iou(a, b):
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
    inter = iw * ih
    area_a = max(0, ax2 - ax1) * max(0, ay2 - ay1)
    area_b = max(0, bx2 - bx1) * max(0, by2 - by1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


def blur_score(gray):
    return cv2.Laplacian(gray, cv2.CV_64F).var()


results_log = []
image_files = sorted(VAL_IMAGES.iterdir())

for img_path in image_files:
    img = cv2.imread(str(img_path))
    if img is None:
        continue
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    overall_blur = blur_score(gray)
    overall_brightness = gray.mean()

    gt_boxes = load_gt_boxes(VAL_LABELS / (img_path.stem + ".txt"), w, h)

    preds = model.predict(source=img, conf=LOW_CONF_SCAN, verbose=False)[0]
    pred_list = []
    for box in preds.boxes:
        conf = float(box.conf[0])
        x1, y1, x2, y2 = (float(v) for v in box.xyxy[0])
        pred_list.append({"conf": conf, "bbox": [x1, y1, x2, y2]})

    # Match GT -> best overlapping prediction (regardless of its confidence)
    for gi, gt in enumerate(gt_boxes):
        best_iou, best_pred = 0.0, None
        for p in pred_list:
            i = iou(gt, p["bbox"])
            if i > best_iou:
                best_iou, best_pred = i, p

        gt_w, gt_h = gt[2] - gt[0], gt[3] - gt[1]
        gt_area_pct = (gt_w * gt_h) / (w * h) * 100
        x1c, y1c, x2c, y2c = [int(max(0, v)) for v in gt]
        x2c, y2c = min(w, x2c), min(h, y2c)
        crop = gray[y1c:y2c, x1c:x2c]
        local_blur = blur_score(crop) if crop.size > 100 else None

        if best_iou < IOU_MATCH:
            status = "MISSED_ENTIRELY"  # model never proposed anything here, even at conf=0.05
        elif best_pred["conf"] < PROD_CONF_THRESHOLD:
            status = "SEEN_BUT_SUPPRESSED"  # model saw it, but below our production confidence gate
        else:
            status = "DETECTED"

        results_log.append({
            "image": img_path.name,
            "type": "gt",
            "status": status,
            "gt_bbox": gt,
            "gt_area_pct": round(gt_area_pct, 2),
            "best_iou": round(best_iou, 3),
            "matched_conf": round(best_pred["conf"], 3) if best_pred else None,
            "image_blur": round(overall_blur, 1),
            "local_blur": round(local_blur, 1) if local_blur else None,
            "image_brightness": round(overall_brightness, 1),
            "img_w": w, "img_h": h,
        })

    # False positives: predictions at production confidence with no matching GT at all
    for p in pred_list:
        if p["conf"] < PROD_CONF_THRESHOLD:
            continue
        best_iou = max((iou(p["bbox"], gt) for gt in gt_boxes), default=0.0)
        if best_iou < IOU_MATCH:
            x1, y1, x2, y2 = p["bbox"]
            area_pct = (x2 - x1) * (y2 - y1) / (w * h) * 100
            results_log.append({
                "image": img_path.name,
                "type": "false_positive",
                "status": "FALSE_POSITIVE",
                "pred_bbox": p["bbox"],
                "pred_conf": round(p["conf"], 3),
                "area_pct": round(area_pct, 2),
                "image_blur": round(overall_blur, 1),
                "image_brightness": round(overall_brightness, 1),
                "img_w": w, "img_h": h,
            })

out_path = "C:/Users/karth/AppData/Local/Temp/claude/c--download-raap/f1b050f2-571b-4844-b399-b717b05bc962/scratchpad/failure_log.json"
with open(out_path, "w") as f:
    json.dump(results_log, f, indent=2)

statuses = {}
for r in results_log:
    statuses[r["status"]] = statuses.get(r["status"], 0) + 1
print("Summary:", statuses)
print("Total GT boxes:", sum(1 for r in results_log if r["type"] == "gt"))
print("Saved to", out_path)
