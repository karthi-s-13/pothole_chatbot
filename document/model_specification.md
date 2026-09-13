# Model Specification — RT-DETR Pothole Detector

Companion reference to `document.md` (which covers *why* the dataset/split/metrics choices were
made and the five failure cases). This file is the model's spec sheet: architecture, exact
training configuration, input/output contract, and what's actually running in production today.

---

## 1. Identity

| | |
|---|---|
| Task | Single-class object detection (bounding box) |
| Class | `0: pothole` (one class only — see `document.md` §1 for why) |
| Architecture | RT-DETR-L (Real-Time Detection Transformer, large variant) |
| Framework | Ultralytics `RTDETR` (v8.4.150) |
| Base weights | `rtdetr-l.pt` (COCO-pretrained), fine-tuned on the pothole dataset |
| Artifact | `model/pothole_rtdetr_best.pt` — 66,221,885 bytes (63.2 MB) |
| Training source | `model/dataset-pothole-detection.ipynb` |

---

## 2. Architecture

RT-DETR is a DETR-style (transformer set-prediction) detector, not an anchor-based YOLO-style one
— the practical difference that matters most operationally: **no NMS (non-max suppression)
post-processing step**, because the transformer decoder's bipartite matching already produces one
box per predicted instance directly.

Layer breakdown (fused, inference mode — as actually deployed):

| | |
|---|---|
| Layers | 315 |
| Parameters | 31,985,795 (~32.0M) |
| GFLOPs | 105.3 (at 640×640 input) |

Stage-by-stage:
1. **Backbone — HGNetv2**: `HGStem` → stacked `HGBlock` stages with `DWConv` downsampling.
   Extracts multi-scale feature maps (the standard CNN-backbone half of the network).
2. **Encoder — AIFI** (Attention-based Intra-scale Feature Interaction): a transformer encoder
   applied to the lowest-resolution backbone feature map — this is the "transformer" in RT-DETR,
   and the main architectural difference from a pure-CNN detector.
3. **Neck — CCFM-style fusion**: `Conv` + `Upsample` + `Concat` + `RepC3` blocks, fusing the
   AIFI-processed features back down through the multi-scale pyramid (feature pyramid fusion,
   conceptually similar to YOLO's PANet neck but built from RepC3 blocks).
4. **Head — `RTDETRDecoder`**: a transformer decoder with learned object queries producing a fixed
   set of candidate boxes + class scores directly, matched to ground truth via Hungarian matching
   during training (and requiring no NMS at inference).

---

## 3. Input / output contract

**Input:**
- RGB image, any source resolution — internally resized to **640×640** (`imgsz=640`) for both
  training and inference.
- Accepted upload formats at the API boundary: JPEG, PNG, WEBP (enforced in
  `backend/app/routers/detect.py`, not a model constraint).

**Output (per detected instance):**

| Field | Type | Notes |
|---|---|---|
| `class_name` | str | Always `"pothole"` (single-class model) |
| `confidence` | float | Model's own objectness/class confidence, 0-1 |
| `bbox` | [x1,y1,x2,y2] | Pixel coordinates in the **original** (not resized) image |

The raw model only produces the three fields above. Everything else the API returns per box —
`position`, `relative_area_pct`, `confidence_label`, `size_rank` — is **not** model output; it's
deterministic post-processing computed in `backend/app/inference.py::_enrich_detections()` from
the raw boxes + original image dimensions (see `document.md` §5 for why this is computed in code
rather than left for the chatbot's LLM to infer).

---

## 4. Training configuration

| Parameter | Value |
|---|---|
| Epochs (configured) | 60 |
| Epochs (effective/usable) | ~32 — training diverged to `NaN` losses around epoch 34 (see below); the checkpoint saved is the best-validation-fitness one prior to that, not the final epoch |
| Batch size | 8 |
| Image size | 640×640 |
| Optimizer | AdamW, auto-selected (`lr0=0.002`, `momentum=0.9`) |
| Seed | 42 |
| Early-stopping patience | 15 epochs |
| AMP (mixed precision) | **Disabled** (`amp=False`) |
| Augmentations | Ultralytics defaults — mosaic, HSV jitter, horizontal flip, translate/scale |
| Compute | Google Colab, NVIDIA T4 GPU |

**Why `amp=False` and why it matters:** the first training run used automatic mixed precision and
diverged — `giou_loss`/`cls_loss`/`l1_loss` went to `NaN` partway through, and validation mAP
collapsed to exactly 0 and never recovered for the rest of that run. This is a known interaction
between RT-DETR's GIoU-based loss and fp16 numerical range. Disabling AMP (full fp32 training)
resolved it. The VOC→YOLO label conversion was also hardened at the same time (clip-to-bounds +
drop degenerate zero-area boxes) as a second, independent guard against the same failure mode,
since degenerate boxes are a separate known cause of the same symptom.

Loss function: RT-DETR's combined objective — GIoU box loss + classification loss + L1 box
regression loss, with Hungarian bipartite matching assigning predictions to ground-truth instances
during training (standard DETR-family training objective).

---

## 5. Performance summary

Computed on the 66-image / 187-instance validation split (see `document.md` §2 for the
important caveat that this split was also used for checkpoint selection, and §3 for what these
numbers do and don't tell you):

| Metric | Value |
|---|---|
| mAP50 | 0.822 |
| mAP50-95 | 0.560 |
| Precision | 0.763 |
| Recall | 0.797 |

---

## 6. Deployed inference configuration

This is what's actually running in `backend/app/inference.py`, not the training setup:

| Setting | Value | Configurable via |
|---|---|---|
| Confidence threshold | **0.66** | `CONFIDENCE_THRESHOLD` in `.env` |
| Device | **CPU** (no CUDA in the backend's Python environment) | — |
| Measured latency | **~2.06s per image** (mean of 5 runs, 640×640, warm model) | — |
| NMS | Not applicable — RT-DETR's decoder doesn't require it | — |

**This is not real-time.** ~2 seconds per image on CPU is fine for the app's actual
upload-and-wait interaction model, but would need a GPU (or a smaller RT-DETR variant, e.g.
`rtdetr-l` → a distilled/smaller backbone) to support any live-video or low-latency use case. The
model was trained on a T4 GPU where a single forward pass is roughly two orders of magnitude
faster; the ~2s figure reflects the actual deployment environment for this project, not the
model's ceiling capability.

**Why 0.66, specifically:** chosen empirically by inspecting the precision/recall trade-off at
different thresholds (see `document.md` §3 point 2 and §4 for the concrete cost of this choice —
at 0.66, roughly a quarter of ground-truth potholes the model *does* localize correctly get
suppressed for being under-confident, concentrated on small/distant objects).

---

## 7. Known limitations

Full detail in `document.md`:
- **§2** — validation split doubles as the model-selection split (metrics are not a fully
  unbiased generalization estimate); a held-out test split (67 images) exists but hasn't been
  used for a final independent evaluation.
- **§3** — what mAP/precision/recall do not capture (severity weighting, confidence calibration,
  domain shift from Kaggle-curated images to real user uploads).
- **§4** — five specific, image-level failure cases with root-cause analysis: small/distant-object
  degradation, dense/overlapping-instance clutter, gravel/dirt surface domain gap, vehicle
  background class-confusion (0.905-confidence false positive), and leaf-litter occlusion.

Additional limitation specific to this spec: **single-class only** — the model has no concept of
pothole *severity*, *depth*, or *type* (e.g. alligator cracking, water-filled vs. dry). Any such
distinction the chatbot discusses is explicitly framed as inferable-or-not from 2D image data, per
`document.md` §5, never asserted as a model output.

---

## 8. Versions (for reproducibility)

| | |
|---|---|
| Python | 3.14.6 |
| Ultralytics | 8.4.150 |
| PyTorch (serving) | 2.14.0 (CPU build) |
| OpenCV | 5.0.0 |
