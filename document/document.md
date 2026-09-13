# Pothole Detection — Technical Report

This report covers the dataset and modeling decisions behind the RT-DETR pothole detector, an
honest accounting of where it fails and why, and how the chatbot ("Part B") decides what it can
and cannot answer from the detector's output.

---

## 1. Why this domain/dataset, and how it was sourced and labeled

**Domain.** Pothole detection was chosen because it's a real, bounded, single-class object
detection problem with an unambiguous ground truth (a hole is either there or it isn't), a
plausible deployment story (municipal road-condition triage from dashcam/phone photos), and a
well-defined failure cost (missing one is worse than a false alarm), which makes it a good problem
for actually reasoning about precision/recall trade-offs rather than an abstract benchmark.

**Dataset selection — including a rejected candidate.** Two Kaggle datasets were evaluated:

- `atulyakumar98/pothole-detection-dataset` — was the first one pulled down, but on inspection it
  turned out to be **image-level classification data only**: two folders, `normal/` and
  `potholes/`, with no bounding boxes. This is unusable for training an object detector (you
  cannot supervise box regression from a whole-image label), so it was **rejected** for training
  and instead repurposed later as an out-of-distribution, weakly-labeled sanity-check set (its
  folder name is a weak label: "does the detector fire on `potholes/` images and stay quiet on
  `normal/` ones?").
- `andrewmvd/pothole-detection` — 665 images with Pascal VOC XML annotations, single class
  (`pothole`). This is the dataset actually used for training.

**Sourcing.** Both datasets were pulled programmatically via `kagglehub.dataset_download()`, not
manually downloaded — this makes the pipeline reproducible from a notebook re-run without any
manual Kaggle UI steps.

**Labeling.** The bounding boxes were **not self-annotated** — they came from the original
dataset publisher as Pascal VOC XML. What this project *did* do to the labels:

- Programmatically converted VOC XML → YOLO-normalized `.txt` format.
- Added defensive cleaning during conversion: box coordinates are clipped to image bounds, and any
  box with less than 1px of width or height after clipping is dropped. This wasn't hypothetical —
  it was added after RT-DETR training hit `NaN` losses partway through a run, and degenerate
  (zero-area or out-of-bounds) boxes from annotation noise are a known cause of exactly that
  failure mode in GIoU-style detection losses.

Being upfront about this: because the labels are inherited rather than self-produced, any
systematic annotation bias in the source dataset (e.g. only annotating "obvious" potholes, or
inconsistent box tightness) is inherited too, and wasn't independently audited beyond the
degenerate-box cleanup above.

---

## 2. Train / validation / test split strategy

| Split | Images | Fraction |
|---|---|---|
| Train | 532 | 80% |
| Validation | 66 | 10% |
| Test | 67 | 10% |

**How:** a flat 80/10/10 random split over all 665 images, `random.seed(42)` for reproducibility,
performed once at the image level **before** any augmentation — so no augmented variant of a
training image can leak into validation or test.

**Why this strategy, specifically:**

- **Random, not stratified** — there is exactly one class (`pothole`), so there is no class
  distribution to stratify against. The one thing worth stratifying on in principle — pothole
  *count per image* (some images have 1, some have 18+, see Section 4) — was not stratified,
  which is a real limitation: a 66-image validation set drawn purely at random can (and does)
  over- or under-represent dense multi-pothole scenes relative to the training distribution purely
  by chance.
- **80/10/10, not 70/15/15 or similar** — with only 665 images total, an object detector needs as
  much training signal as it can get; 10% (66-67 images) is small but still large enough to give a
  stable-enough validation signal for early stopping / model selection without starving training.
- **A genuine methodological gap, stated plainly:** the metrics reported in Section 3 (and
  produced during training) were computed on the **validation** split, which was *also* the split
  used for model checkpoint selection (`best.pt` is the checkpoint with the best validation
  fitness). That means validation performance is not a fully unbiased estimate of generalization —
  it's biased upward by having been the selection criterion. The held-out **test** split (67
  images) exists on disk and was never used in training or checkpoint selection, but this report
  does not yet include a test-set-only evaluation. Treat the numbers below as "best validation
  performance," not "true held-out performance," until that gap is closed.

---

## 3. Evaluation metrics — what they tell you, and what they don't

The model is evaluated with the standard COCO-style detection metrics: **mAP50**, **mAP50-95**,
**precision**, and **recall**, computed via Ultralytics' built-in validator against the deployed
weights (`pothole_rtdetr_best.pt`) on the 66-image validation split (187 ground-truth instances):

| Metric | Value |
|---|---|
| mAP50 | 0.822 |
| mAP50-95 | 0.560 |
| Precision | 0.763 |
| Recall | 0.797 |

(Precision/recall here are Ultralytics' own best-F1 operating point across a confidence sweep, not
literally at the 0.66 threshold this app ships with — see point 2 below for why that distinction
matters more than the headline numbers.)

**What each one tells you:**
- **Precision** — of everything the model called a pothole, what fraction actually was one.
  Low precision = too many false alarms.
- **Recall** — of every real pothole, what fraction the model found. Low recall = too many misses.
- **mAP50** — precision/recall integrated across confidence thresholds, at a loose 50%
  box-overlap (IoU) requirement to count as a "hit." Forgiving of imprecise box edges.
- **mAP50-95** — the same, but averaged over IoU thresholds from 0.5 to 0.95. Much more sensitive
  to *exactly* how tight the box is, not just whether it's roughly in the right place.

**What none of these tell you — and why that matters for this specific project:**

1. **They don't weight by real-world severity.** A missed 40cm-deep pothole and a missed hairline
   surface crack count identically in the aggregate metric. A municipal triage system built on
   this number alone could look "97% accurate" while still systematically missing the specific
   subset of potholes that are actually dangerous, if that subset happens to correlate with a hard
   visual pattern (see Section 4.1 — small/distant objects are disproportionately missed, and a
   pothole far down the road is exactly the one a fast-moving vehicle has the least time to react
   to).
2. **They collapse a threshold choice that has a large, direct effect on the user-facing product.**
   This is not theoretical — it's measured directly from this model. Scanning every ground-truth
   box in the validation set down to a near-zero confidence cutoff, the model *proposes* a
   correctly-located box for 185 of 187 ground-truth potholes (99%). At the production confidence
   threshold actually shipped (0.66), only 138 of those clear that bar (73.8%) — the other 47
   (25%) are boxes the model *found* but didn't trust enough to surface. A single mAP number
   doesn't show you this trade-off exists, let alone let you tune it.
3. **They say nothing about confidence calibration.** Whether a box reported at "90% confidence" is
   actually correct 90% of the time was not measured (no reliability diagram / calibration curve
   was computed). The chatbot layer (Section 5) explicitly treats confidence as "the model's own
   estimate, not certainty" partly because this was never verified.
4. **They're measured on Kaggle's curated dataset, not on what users will actually upload.** Phone
   photos taken at an angle, in motion, in rain, at night, or heavily compressed are not
   represented in `andrewmvd/pothole-detection` in any controlled way. Good validation metrics on
   this dataset are evidence the model learned *something* about pothole appearance, not evidence
   it will generalize to arbitrary user-submitted images.
5. **They don't surface failure modes at all** — this model's 0.822 mAP50 is a single number; it
   doesn't say *which kinds* of images fail or why. Two models could both land near 0.82 mAP50 for
   completely different reasons (one weak on small objects, another weak on class confusion) and
   the metric alone couldn't distinguish them. That's the entire point of Section 4.

---

## 4. Five failure cases, with root-cause analysis

These were not hand-picked from memory or written from general knowledge of what detectors
usually get wrong. They come from actually running the deployed weights
(`pothole_rtdetr_best.pt`) against every image in the validation set, matching every predicted box
to ground truth by IoU, and inspecting the specific images where it broke. Full method: for each
of the 187 ground-truth boxes in the 66 validation images, the best-overlapping prediction was
found by scanning down to a 0.05 confidence floor (i.e. "did the model even consider this region
at all, at any confidence"), then compared against what actually ships at the production threshold
(0.66).

Aggregate result of that scan: **138 detected** in production (73.8%), **47 seen but suppressed**
by the confidence threshold (25.1%), **2 missed entirely** even at a 0.05 floor (1.1%), plus
**26 false positives** at production confidence with no matching ground truth.

Each case below includes the actual diagnostic image: **green** = ground-truth box, **blue** =
model prediction at ≥0.66 confidence (what ships to users), **red** = model prediction below 0.66
(visible in this diagnostic scan, filtered out in production).

### 4.1 Small / distant-object degradation — `potholes294.png`

![Small object degradation and class confusion example](images/failure-4.1-4.4-small-object-and-class-confusion.png)

This single image contains 18 annotated potholes along a dirt road receding into the distance —
large, well-defined ones near the camera, and progressively tinier ones toward the vanishing
point. The near-camera potholes (0.73%-2.37% of the image area) are all detected confidently
(0.79-0.90 confidence). Several of the smallest, most distant ones (0.11%-0.32% of the image
area) are *seen* — the model proposes a well-localized box (IoU 0.65-0.85 against ground truth)
— but at confidence as low as **0.106-0.164**, well under the 0.66 production threshold, so they
never surface as a detection.

**Root cause:** the model's confidence in a box correlates with object size, but the relationship
is noisy, not a clean cutoff — two ground-truth potholes of nearly identical size (0.16% area) in
this same image landed on opposite sides of the threshold (0.657 vs 0.705 kept, 0.106 vs 0.11 not).
That points to confidence here being driven by a *combination* of pixel count and local
contrast/background texture, not pixel count alone — a small pothole with sharp contrast against
uniform pavement scores higher than a similarly-small one on a mottled/noisy surface.
**Consequence for the product:** the confidence threshold trades recall on exactly the potholes
farthest from the camera — the ones a driver has the least reaction time for.

### 4.2 Dense/overlapping instance clutter — `potholes463.png`

![Dense overlapping instance clutter example](images/failure-4.2-dense-clutter.png)

A tight cluster of potholes where one small ground-truth box (129,145 → 170,183px, under 1% of
the image) sits immediately adjacent to a large, dominant pothole that the model detects
correctly at 0.91 confidence. The small neighboring box was **never proposed at all** — the best
overlapping prediction anywhere in the low-confidence scan only reached IoU 0.372 against it (below
the 0.4 match threshold used in this analysis), because the model's box for the *large* neighbor
partially covers that region instead of a separate box being drawn for the small one.

**Root cause:** when multiple pothole instances are contiguous or nearly touching (a realistic
real-world pattern — erosion tends to spread), the model appears biased toward drawing one box
around the visually dominant damage rather than segmenting every sub-region a human annotator
distinguished. This isn't a confidence-threshold problem (raising or lowering 0.66 does not fix
it) — it's a localization/instance-separation limitation.

### 4.3 Out-of-distribution surface texture (gravel/dirt vs. paved) — `potholes520.png`

![Gravel surface out-of-distribution example](images/failure-4.3-gravel-surface.png)

A low-resolution (300×300), granular dirt/gravel road surface with several water-filled potholes.
This image alone accounts for one of only two ground-truth boxes missed **entirely** at any
confidence (0.3% of the image area) and generated a visibly dense field of spurious low-confidence
proposals scattered across plain gravel texture with no pothole present (all correctly filtered
out by the 0.66 threshold, but present in the raw output).

**Root cause:** the majority of the training set is paved-asphalt road surface; granular/gravel
texture at this resolution has a locally "broken, irregular, dark-speckled" appearance that
partially resembles the model's learned pothole texture cues, both causing false triggers and
diluting the signal for the one real, tiny pothole in the frame. This is the clearest evidence in
the failure set of a **domain/surface-type generalization gap** rather than a scale or clutter
problem — the same object size that gets detected fine on asphalt elsewhere in the validation set
gets lost here.

### 4.4 Background class confusion — vehicle mistaken for a pothole — `potholes294.png`

*(see the same diagnostic image in 4.1 — the car is in the bottom-right corner)*

The same image as 4.1 also produced one of the highest-confidence false positives in the entire
validation set: a box drawn around the **hood/bumper of a parked car** in the frame corner, at
**0.905 confidence** — higher confidence than several of the genuine potholes in that same image
(0.79-0.87). The best IoU between this box and any of the 18 real ground-truth potholes was
effectively zero.

**Root cause:** a dark, glossy, irregularly-shadowed vehicle surface shares the same coarse visual
signature the model has learned for a water-filled pothole (dark region, irregular boundary,
specular highlights breaking up the surface). This is a genuine class-confusion failure, not a
threshold or scale issue — it would ship to a user at full confidence exactly as if it were a real
detection. **Mitigation direction:** the training data would benefit from explicit
hard-negative examples of vehicles, shadows, and wet dark pavement patches that are *not*
potholes.

### 4.5 Partial occlusion by debris (leaf litter) — `potholes425.png`

![Leaf litter occlusion example](images/failure-4.5-leaf-occlusion.png)

A real, unambiguous pothole (1.07% of the image area — not a tiny/distant one) partially covered
by fallen autumn leaves was suppressed to **0.368 confidence**, below the production threshold,
despite the model's box for it being well-localized (IoU 0.74). The same image's larger,
leaf-strewn pothole complex (spanning ~39% of the image, clearly obvious to a human) was matched
only loosely (IoU 0.48, confidence 0.77) and a second, differently-shaped box over an overlapping
region of that same complex scored 0.792 confidence without matching the annotated ground-truth
shape well enough to count as a clean hit in this analysis — i.e. the model detected *that
something damaged was there* but struggled to agree with the annotator's exact box for an
irregular, debris-covered, non-convex damaged region.

**Root cause:** partial occlusion by debris breaks up the pothole's boundary and interior texture
in a way the model hasn't reliably learned to see through, both lowering confidence on an
otherwise-easy detection and destabilizing box shape agreement on irregular multi-lobed damage.

---

## 5. Part B reasoning layer: deciding when the detector's output is sufficient

**The detector itself is not agentically invoked.** It runs exactly once, deterministically, when
an image is uploaded (`POST /api/detect`) — there is no point where the chatbot decides "should I
run the detector now?" So the actual decision this system makes is a different, arguably more
important one: **given the detector's already-computed structured output (box positions, sizes,
confidence), can this specific question be answered from that data at all — or is the user asking
for something no bounding-box detector could ever supply?**

That decision is made by a dedicated classifier stage (`app/query_classifier.py`) that sorts every
incoming chat message into one of eight categories *before* an answer is generated — see
`prompts.py` for the full mapping. Two of those categories are the guardrails:

- **`irrelevant`** — the question isn't about this detection or about potholes/road safety at all.
  Short-circuited to a fixed refusal string without even calling the answering model.
- **`uncertain`** — the question *is* about this pothole, but asks for something the detection data
  fundamentally cannot supply: physical depth, danger/safety severity, repair cost, or structural
  integrity. A 2D image and a bounding box cannot measure any of these.

**Concrete example.** Given a detection result of one pothole (86% confidence, top-right position,
4.75% of the image area) and the question:

> "Can you determine the repair cost from this image?"

the classifier routes this to `uncertain`, which carries its own focused system prompt (not the
general one used for count/location/size questions):

> "The user is asking about something that CANNOT be determined from a single 2D image and a
> bounding box — e.g. depth, danger/safety severity, repair cost, or structural integrity. Say
> plainly that this cannot be determined from the image or detection data. Do NOT invent a
> specific depth, cost, or safety verdict. You may add brief, generic, non-specific guidance (e.g.
> potholes can damage tires/suspension and are worth a professional inspection), but never state a
> number or verdict as if it were measured."

The expected, deterministic behavior is an answer such as *"I can't determine a repair cost from
this image — that depends on depth, road material, and local labor rates, which aren't visible in
a 2D photo. A professional inspection would be needed for an accurate estimate."* — i.e. an
explicit "insufficient information" response, rather than either refusing the (on-topic) question
outright or fabricating a plausible-sounding number. This was verified at the routing-logic level
with mocked model calls (every category, including `uncertain`, correctly reaches the
category-specific prompt; `irrelevant` correctly short-circuits before any second model call is
made) — an end-to-end live confirmation with a real model reply is still pending a working
`GROQ_API_KEY` in this environment.

---

## Appendix: Methodology for Section 4

Section 4's numbers and images are reproducible, not asserted. `scripts/find_failures.py` loads
the deployed weights, runs every validation image through the model at a 0.05 confidence floor,
loads the corresponding YOLO-format ground-truth labels, and matches each ground-truth box to its
best-overlapping prediction by IoU (0.4 minimum to count as a match) — producing `failure_log.json`
with a per-instance status (`DETECTED`, `SEEN_BUT_SUPPRESSED`, `MISSED_ENTIRELY`) plus per-instance
diagnostics (relative box area, Laplacian blur variance, mean brightness). `scripts/
visualize_failures.py` renders the ground-truth/prediction overlays used as figures above. Both
scripts point at local paths from this project and need `ultralytics`/`opencv-python` installed
(already in `backend/requirements.txt`) to re-run.

Two things checked and *not* found to be significant drivers in this dataset, worth stating
explicitly since ruling something out is still a finding: overall image brightness showed
essentially no correlation with detection success (124.4 mean for detected instances vs. 124.5 for
missed/suppressed ones), and Laplacian blur variance did not show a consistent pattern across the
failure cases inspected — so "lighting" and "blur" were investigated but are not among the five
cases reported above because the evidence didn't support them as this model's actual weak points;
small object size, instance density, surface-texture domain gap, background class confusion, and
debris occlusion were the failure modes the data actually pointed to.
