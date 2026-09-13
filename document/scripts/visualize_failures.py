import cv2
from pathlib import Path
from ultralytics import RTDETR

WEIGHTS = "C:/download/raap/model/pothole_rtdetr_best.pt"
VAL_IMAGES = Path("C:/download/raap/model/pothole_dataset/valid/images")
VAL_LABELS = Path("C:/download/raap/model/pothole_dataset/valid/labels")
OUT_DIR = Path("C:/Users/karth/AppData/Local/Temp/claude/c--download-raap/f1b050f2-571b-4844-b399-b717b05bc962/scratchpad/failure_viz")
OUT_DIR.mkdir(exist_ok=True)

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

TARGETS = ["potholes294.png", "potholes463.png", "potholes520.png", "potholes425.png", "potholes108.png", "potholes33.png"]

for name in TARGETS:
    img_path = VAL_IMAGES / name
    img = cv2.imread(str(img_path))
    h, w = img.shape[:2]
    gt_boxes = load_gt_boxes(VAL_LABELS / (img_path.stem + ".txt"), w, h)

    preds = model.predict(source=img, conf=0.05, verbose=False)[0]

    vis = img.copy()
    # GT in green
    for gx1, gy1, gx2, gy2 in gt_boxes:
        cv2.rectangle(vis, (int(gx1), int(gy1)), (int(gx2), int(gy2)), (0, 255, 0), 2)
    # Predictions: red if below prod threshold 0.66, blue if above
    for box in preds.boxes:
        conf = float(box.conf[0])
        x1, y1, x2, y2 = (int(v) for v in box.xyxy[0])
        color = (255, 0, 0) if conf >= 0.66 else (0, 0, 255)
        cv2.rectangle(vis, (x1, y1), (x2, y2), color, 1)
        cv2.putText(vis, f"{conf:.2f}", (x1, max(y1 - 3, 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

    out_path = OUT_DIR / f"viz_{name}"
    cv2.imwrite(str(out_path), vis)
    print(f"{name}: {len(gt_boxes)} GT boxes (green), saved -> {out_path}")

print("\nLegend: GREEN=ground truth, BLUE=prediction >=0.66 (production), RED=prediction <0.66 (suppressed)")
