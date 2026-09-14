import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Boxes,
  Brain,
  ChevronRight,
  Copy,
  Check,
  Database,
  ExternalLink,
  GitBranch,
  Layers,
  ListChecks,
  Rocket,
  ShieldAlert,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";

interface Props {
  onBack: () => void;
}

const NAV_ITEMS = [
  { id: "overview",      label: "Overview",              icon: BookOpen },
  { id: "live-links",    label: "Live Links",            icon: ExternalLink },
  { id: "tech-stack",    label: "Tech Stack",            icon: Boxes },
  { id: "architecture",  label: "Architecture",          icon: Layers },
  { id: "model-spec",    label: "Model Specification",   icon: Brain },
  { id: "model-metrics", label: "Model Metrics",         icon: Sparkles },
  { id: "dataset",       label: "Dataset",               icon: Database },
  { id: "quickstart",    label: "Quickstart",            icon: Rocket },
  { id: "limitations",   label: "Limitations & Roadmap", icon: ListChecks },
] as const;

function Badge({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "orange" | "green" | "blue" }) {
  const colours: Record<string, string> = {
    default: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    orange:  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    green:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    blue:    "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${colours[variant]}`}>
      {children}
    </span>
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {children}
    </code>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      title="Copy"
      className="absolute right-3 top-3 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CodeBlock({ children, lang = "" }: { children: string; lang?: string }) {
  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#0d1117] p-4 text-[12px] leading-relaxed text-zinc-200">
        {lang && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{lang}</span>
            <div className="flex-1 border-t border-zinc-800" />
          </div>
        )}
        <code>{children}</code>
      </pre>
      <CopyButton text={children} />
    </div>
  );
}

function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="group flex scroll-mt-24 items-center gap-2 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
    >
      {children}
      <a href={`#${id}`} className="opacity-0 transition-opacity group-hover:opacity-100" aria-label="anchor">
        <span className="text-zinc-400">#</span>
      </a>
    </h2>
  );
}

function Divider() {
  return <hr className="border-zinc-200 dark:border-zinc-800" />;
}

function CalloutBox({
  variant = "note",
  children,
}: {
  variant?: "note" | "warning" | "tip";
  children: ReactNode;
}) {
  const styles: Record<string, string> = {
    note:    "border-sky-400/40 bg-sky-50/60 text-sky-800 dark:bg-sky-950/30 dark:text-sky-300",
    warning: "border-amber-400/40 bg-amber-50/60 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
    tip:     "border-emerald-400/40 bg-emerald-50/60 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  };
  const icons: Record<string, ReactNode> = {
    note:    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />,
    warning: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />,
    tip:     <Zap className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />,
  };
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${styles[variant]}`}>
      {icons[variant]}
      <div className="flex-1 leading-relaxed">{children}</div>
    </div>
  );
}

function PropsTable({ rows }: { rows: [string, string, ReactNode][] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Field</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Type / Value</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map(([field, type, desc]) => (
            <tr key={field} className="bg-white transition-colors hover:bg-zinc-50 dark:bg-transparent dark:hover:bg-zinc-800/40">
              <td className="px-4 py-2.5 font-mono text-xs font-semibold text-orange-600 dark:text-orange-400">{field}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{type}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: (string | ReactNode)[][] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((row, i) => (
            <tr key={i} className="bg-white transition-colors hover:bg-zinc-50 dark:bg-transparent dark:hover:bg-zinc-800/40">
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-2.5 text-xs ${j === 0 ? "font-mono font-semibold text-zinc-700 dark:text-zinc-300" : "text-zinc-600 dark:text-zinc-400"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="group flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-orange-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-700">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
      <span className="text-3xl font-black tabular-nums text-orange-500 dark:text-orange-400">{value}</span>
      <span className="text-[11px] leading-snug text-zinc-500">{note}</span>
    </div>
  );
}

function StepBlock({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
          {number}
        </div>
        <div className="mt-1 flex-1 border-l-2 border-dashed border-zinc-200 dark:border-zinc-800" />
      </div>
      <div className="flex-1 pb-6">
        <p className="mb-2 font-semibold text-zinc-800 dark:text-zinc-200">{title}</p>
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </div>
  );
}

const LIVE_LINKS = [
  { label: "GitHub Repository",  href: "https://github.com/karthi-s-13/pothole_chatbot",  icon: GitBranch,    badge: "Source"  },
  { label: "Live Frontend",      href: "https://pothole-chatbot.vercel.app",              icon: ExternalLink, badge: "Vercel"  },
  { label: "Live Backend",       href: "https://pothole-chatbot.onrender.com",            icon: ExternalLink, badge: "Render"  },
  { label: "API Health Check",   href: "https://pothole-chatbot.onrender.com/api/health", icon: ExternalLink, badge: "GET"     },
  { label: "Swagger / API Docs", href: "https://pothole-chatbot.onrender.com/docs",       icon: ExternalLink, badge: "OpenAPI" },
];

const REASONING_CATEGORIES: [string, string, string][] = [
  ["presence",   "-> detection count",      "\"Is there a pothole?\" — reads the detection count directly"],
  ["count",      "-> detection count",      "\"How many potholes?\" — reads the detection count directly"],
  ["location",   "-> grid position",        "\"Where is it?\" — quotes the precomputed grid position"],
  ["size",       "-> size rank",            "\"Which is biggest?\" — quotes the precomputed size rank"],
  ["confidence", "-> confidence value",     "\"How sure are you?\" — quotes the confidence tier as an estimate"],
  ["summary",    "-> full structured data", "General overview — synthesizes the full detection payload"],
  ["uncertain",  "-> explicit decline",     "Depth, repair cost, safety — declines to guess, explains why"],
  ["irrelevant", "-> fixed refusal string", "Off-topic — no model call is made; returns a canned response"],
];

const MODEL_SPEC_ROWS: [string, string, ReactNode][] = [
  ["task",         "single-class object detection", "Bounding-box regression with class label"],
  ["class",        "0: pothole",                    "One class only"],
  ["architecture", "RT-DETR-L",                     "Real-Time Detection Transformer, large variant"],
  ["framework",    "Ultralytics v8.4.150",           "RTDETR trainer & inference API"],
  ["base_weights", "rtdetr-l.pt",                   "COCO-pretrained, fine-tuned on pothole dataset"],
  ["params",       "~32.0 M  |  105.3 GFLOPs",      "At 640×640 input resolution"],
  ["artifact",     "63.2 MB",                        <InlineCode key="a">model/pothole_rtdetr_best.pt</InlineCode>],
  ["input",        "RGB image (any resolution)",     "Resized to 640×640 by Ultralytics"],
  ["output",       "class · confidence · bbox",      "In original-image pixel coordinates [x1,y1,x2,y2]"],
];

export default function DocsPage({ onBack }: Props) {
  const [activeId, setActiveId] = useState("overview");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { root: null, rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );
    root.querySelectorAll("h2[id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex w-full flex-col">

      {/* ── Top breadcrumb bar ── */}
      <div className="mb-6 flex items-center gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition-all hover:border-zinc-300 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to App
        </button>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span>Docs</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium capitalize text-zinc-600 dark:text-zinc-300">
            {NAV_ITEMS.find((n) => n.id === activeId)?.label ?? "Overview"}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="green">v1.0</Badge>
          <Badge variant="blue">Open Source</Badge>
        </div>
      </div>

      <div className="flex gap-8">

        {/* ── Sticky sidebar ── */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-6">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">On this page</p>
            <nav className="flex flex-col gap-0.5">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                const active = activeId === id;
                return (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all ${
                      active
                        ? "bg-orange-50 font-semibold text-orange-600 dark:bg-orange-950/40 dark:text-orange-400"
                        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-orange-500" : "text-zinc-400"}`} />
                    {label}
                    {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-orange-500" />}
                  </button>
                );
              })}
            </nav>
            <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="mb-2 text-[11px] font-semibold text-zinc-500">Quick links</p>
              <div className="flex flex-col gap-1">
                <a href="https://github.com/karthi-s-13/pothole_chatbot" target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-orange-500">
                  <GitBranch className="h-3 w-3" /> GitHub
                </a>
                <a href="https://pothole-chatbot.onrender.com/docs" target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-orange-500">
                  <ExternalLink className="h-3 w-3" /> Swagger API
                </a>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main scrollable content ── */}
        <div ref={contentRef} className="min-w-0 flex-1 space-y-12 pb-20">

          {/* OVERVIEW */}
          <section>
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <Badge variant="orange">Platform</Badge>
              <Badge variant="green">RT-DETR</Badge>
              <Badge variant="blue">Groq LLM</Badge>
            </div>
            <SectionHeading id="overview">
              <BookOpen className="h-5 w-5 text-orange-500" />
              Overview
            </SectionHeading>
            <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              <strong className="text-zinc-900 dark:text-zinc-100">Pothole Detection &amp; AI Assistant</strong> is an
              end-to-end road-damage intelligence platform. An{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">RT-DETR</strong> object detector finds potholes in
              uploaded road imagery, and a{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">Groq-powered conversational assistant</strong>{" "}
              — backed by a dedicated query-classification layer — lets users ask natural-language questions about what
              was found, answering honestly when a question asks for something the detector fundamentally cannot know
              (depth, repair cost, structural safety).
            </p>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              <strong className="text-zinc-900 dark:text-zinc-100">Goal:</strong> give municipal teams and everyday users
              a fast, low-cost way to triage road-condition photos, without pretending the model can measure things a
              single 2D image never could.{" "}
              <strong className="text-zinc-900 dark:text-zinc-100">Objective:</strong> a full-stack, empirically-documented
              reference implementation — real-time inference, persistent history, an honest accounting of failure modes
              — not a notebook demo.
            </p>
            <p className="mt-3 text-[11px] text-zinc-400">Built by Rapid Acceleration Partners.</p>
          </section>

          <Divider />

          {/* LIVE LINKS */}
          <section>
            <SectionHeading id="live-links">
              <ExternalLink className="h-5 w-5 text-orange-500" />
              Live Links
            </SectionHeading>
            <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              {LIVE_LINKS.map(({ label, href, icon: Icon, badge }, i) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${
                    i !== 0 ? "border-t border-zinc-100 dark:border-zinc-800" : ""
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
                  <span className="flex-1 font-medium text-zinc-700 dark:text-zinc-200">{label}</span>
                  <code className="rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                    {badge}
                  </code>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-300 dark:text-zinc-600" />
                </a>
              ))}
            </div>
            <div className="mt-4">
              <CalloutBox variant="warning">
                The hosted demo backend runs on Render&apos;s <strong>free tier</strong>, which spins down after
                inactivity — the first request after being idle can time out or fail while the model reloads. If the
                live demo appears broken or slow, the application is <strong>fully functional</strong> and has been
                verified working end-to-end when run <strong>locally via Docker</strong> (see &ldquo;Quickstart&rdquo; below).
              </CalloutBox>
            </div>
          </section>

          <Divider />

          {/* TECH STACK */}
          <section>
            <SectionHeading id="tech-stack">
              <Boxes className="h-5 w-5 text-orange-500" />
              Tech Stack
            </SectionHeading>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                {
                  layer: "Frontend",
                  color: "border-sky-200 dark:border-sky-900",
                  dot: "bg-sky-400",
                  items: [
                    { name: "React 19",       v: "blue"    },
                    { name: "TypeScript",     v: "blue"    },
                    { name: "Vite",           v: "default" },
                    { name: "Tailwind v4",    v: "default" },
                    { name: "axios",          v: "default" },
                    { name: "react-markdown", v: "default" },
                    { name: "lucide-react",   v: "default" },
                  ],
                },
                {
                  layer: "Backend",
                  color: "border-orange-200 dark:border-orange-900",
                  dot: "bg-orange-400",
                  items: [
                    { name: "FastAPI",          v: "orange"  },
                    { name: "Uvicorn",          v: "default" },
                    { name: "RT-DETR",          v: "orange"  },
                    { name: "OpenCV",           v: "default" },
                    { name: "PyMongo",          v: "default" },
                    { name: "Groq SDK",         v: "orange"  },
                    { name: "Cloudinary SDK",   v: "default" },
                  ],
                },
                {
                  layer: "Infrastructure",
                  color: "border-emerald-200 dark:border-emerald-900",
                  dot: "bg-emerald-400",
                  items: [
                    { name: "MongoDB Atlas", v: "green"   },
                    { name: "Cloudinary",    v: "default" },
                    { name: "Groq LLM API", v: "green"   },
                    { name: "Docker",        v: "default" },
                    { name: "Render",        v: "default" },
                    { name: "Vercel",        v: "default" },
                  ],
                },
              ].map(({ layer, color, dot, items }) => (
                <div key={layer} className={`rounded-xl border bg-white p-4 dark:bg-zinc-900 ${color}`}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${dot}`} />
                    <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">{layer}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map(({ name, v }) => (
                      <Badge key={name} variant={v as "default" | "orange" | "green" | "blue"}>{name}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Divider />

          {/* ARCHITECTURE */}
          <section>
            <SectionHeading id="architecture">
              <Layers className="h-5 w-5 text-orange-500" />
              Architecture
            </SectionHeading>
            <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              A user drops an image into the chat composer. The pipeline runs through three stages:
            </p>
            <div className="mt-6">
              <StepBlock number={1} title="Detect — POST /api/detect">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  RT-DETR runs inference and enriches every bounding box in code: grid position, relative size,
                  confidence tier, and size rank. The result is persisted to MongoDB.
                </p>
              </StepBlock>
              <StepBlock number={2} title="Classify — POST /api/chat">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  If a question was asked, the message is routed into one of eight categories by a lightweight
                  classifier before the Groq LLM is invoked.
                </p>
                <SimpleTable
                  headers={["Category", "Source", "Strategy"]}
                  rows={REASONING_CATEGORIES.map(([cat, src, desc]) => [
                    <InlineCode key={cat}>{cat}</InlineCode>,
                    src,
                    desc,
                  ])}
                />
              </StepBlock>
              <StepBlock number={3} title="Respond — Groq LLM">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  A category-focused system prompt is assembled, grounded in the structured detection data from Step 1.
                  The LLM generates a response constrained by what the detection data actually knows.
                  Everything is persisted to MongoDB and browsable from history.
                </p>
              </StepBlock>
            </div>
            <CalloutBox variant="tip">
              Being a DETR-style detector, RT-DETR needs <strong>no NMS post-processing</strong> — the decoder&apos;s
              bipartite matching already produces one box per instance.
            </CalloutBox>
          </section>

          <Divider />

          {/* MODEL SPEC */}
          <section>
            <SectionHeading id="model-spec">
              <Brain className="h-5 w-5 text-orange-500" />
              Model Specification
            </SectionHeading>
            <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              Stages: <strong>HGNetv2 backbone</strong> → <strong>AIFI transformer encoder</strong> →{" "}
              <strong>CCFM-style fusion neck</strong> → <strong>RTDETRDecoder head</strong>.
            </p>
            <div className="mt-4">
              <PropsTable rows={MODEL_SPEC_ROWS} />
            </div>
            <div className="mt-4">
              <CalloutBox variant="note">
                <strong>Lesson learned:</strong> the first training run used mixed precision (AMP) and diverged to
                NaN losses around epoch 34. Disabling AMP (full fp32) plus hardening the VOC→YOLO label conversion
                (clip-to-bounds, drop degenerate zero-area boxes) resolved it.
              </CalloutBox>
            </div>
          </section>

          <Divider />

          {/* MODEL METRICS */}
          <section>
            <SectionHeading id="model-metrics">
              <Sparkles className="h-5 w-5 text-orange-500" />
              Model Metrics
            </SectionHeading>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="mAP50"     value="0.822" note="Loose 50% IoU match" />
              <MetricCard label="mAP50-95"  value="0.560" note="Averaged over IoU 0.5–0.95" />
              <MetricCard label="Precision" value="0.763" note="Of predicted, % correct" />
              <MetricCard label="Recall"    value="0.797" note="Of real potholes, % found" />
            </div>
            <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              Computed on the 66-image / 187-instance validation split, which also served as the
              checkpoint-selection split — these are{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">best validation</strong> numbers, not an unbiased
              held-out estimate (a 67-image test split exists but has not been used for a final independent evaluation yet).
            </p>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              The shipped confidence threshold (0.66) has a real, measured cost: scanning down to a near-zero
              confidence floor, the model proposes a correctly-located box for{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">99%</strong> of ground-truth potholes, but only{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">73.8%</strong> clear the 0.66 bar in production —
              concentrated on small/distant objects. Confidence scores are not calibrated.
            </p>
          </section>

          <Divider />

          {/* DATASET */}
          <section>
            <SectionHeading id="dataset">
              <Database className="h-5 w-5 text-orange-500" />
              Dataset &amp; Dataset Quality
            </SectionHeading>
            <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              Trained on{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">andrewmvd/pothole-detection</strong> (Kaggle) —
              665 images, single class (<InlineCode>pothole</InlineCode>), Pascal-VOC-XML annotations converted to
              YOLO format, downloaded reproducibly via <InlineCode>kagglehub</InlineCode>. A second candidate dataset
              was evaluated and rejected: it turned out to be image-level classification data only (no bounding boxes),
              so it was repurposed as an out-of-distribution sanity-check set instead.
            </p>
            <div className="mt-4">
              <SimpleTable
                headers={["Split", "Count", "Details"]}
                rows={[
                  ["train",      "532 images", "80% — random image-level, seed 42"],
                  ["validation", "66 images",  "10% — checkpoint selection split"],
                  ["test",       "67 images",  "10% — independent evaluation pending"],
                ]}
              />
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Known quality caveats</p>
              <ul className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                {[
                  "Bounding-box labels are inherited from the dataset publisher, not independently audited beyond degenerate-box cleanup.",
                  "The split is not stratified by pothole-count-per-image, so the validation set can over/under-represent dense multi-pothole scenes purely by chance.",
                  "All images are Kaggle-curated; real user uploads (motion blur, angle, rain, night, heavy compression) are not represented in any controlled way.",
                ].map((item, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <Divider />

          {/* QUICKSTART */}
          <section>
            <SectionHeading id="quickstart">
              <Rocket className="h-5 w-5 text-orange-500" />
              Quickstart
            </SectionHeading>
            <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              The app is fully dockerized. Prerequisites: Docker, and a Groq API key (free at{" "}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-orange-500 hover:underline"
              >
                console.groq.com/keys
              </a>
              ) — MongoDB is provisioned automatically as a container.
            </p>
            <div className="mt-6 space-y-0">
              <StepBlock number={1} title="Add your keys to backend/.env">
                <CodeBlock lang="env">{`GROQ_API_KEY=your_key_here\nMONGODB_URI=mongodb://mongodb:27017`}</CodeBlock>
              </StepBlock>
              <StepBlock number={2} title="Build and start the full stack">
                <CodeBlock lang="shell">{`docker compose up --build`}</CodeBlock>
                <SimpleTable
                  headers={["Service", "URL"]}
                  rows={[
                    ["Frontend",     "http://localhost:3000"],
                    ["Backend API",  "http://localhost:8000"],
                    ["Swagger Docs", "http://localhost:8000/docs"],
                    ["Health Check", "http://localhost:8000/api/health"],
                  ]}
                />
              </StepBlock>
              <StepBlock number={3} title="Without Docker (manual dev servers)">
                <CodeBlock lang="shell">{`cd backend\npython -m venv .venv\n.venv\\Scripts\\activate\npip install --upgrade pip\npip install torch torchvision --index-url https://download.pytorch.org/whl/cpu\npip install -r requirements.txt\ncopy .env.example .env\nuvicorn app.main:app --reload --port 8000`}</CodeBlock>
                <CodeBlock lang="shell">{`cd frontend\nnpm install\nnpm run dev`}</CodeBlock>
              </StepBlock>
            </div>
          </section>

          <Divider />

          {/* LIMITATIONS */}
          <section>
            <SectionHeading id="limitations">
              <ListChecks className="h-5 w-5 text-orange-500" />
              Limitations &amp; Roadmap
            </SectionHeading>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: "Current Limitations",
                  dot:   "bg-amber-400",
                  box:   "border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20",
                  lbl:   "text-amber-600 dark:text-amber-400",
                  items: [
                    "Single-class only — no notion of pothole depth, severity, or type.",
                    "Validation metrics double as the model-selection criterion; a true held-out test evaluation is still pending.",
                    "Weak points: small/distant objects, dense instance clusters, non-asphalt surfaces, and vehicle/shadow false positives.",
                    "Confidence scores are not calibrated (no reliability-diagram check has been done).",
                  ],
                },
                {
                  title: "Roadmap",
                  dot:   "bg-emerald-400",
                  box:   "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20",
                  lbl:   "text-emerald-600 dark:text-emerald-400",
                  items: [
                    "Run held-out test evaluation on the 67-image test split.",
                    "Add confidence calibration and reliability diagrams.",
                    "Introduce hard-negative training examples for weak cases.",
                    "Support GPU-backed inference for production throughput.",
                  ],
                },
              ].map(({ title, dot, box, lbl, items }) => (
                <div key={title} className={`rounded-xl border px-4 py-4 ${box}`}>
                  <p className={`mb-3 text-xs font-bold uppercase tracking-wide ${lbl}`}>{title}</p>
                  <ul className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    {items.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <div className="flex items-center gap-2 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <Terminal className="h-3.5 w-3.5 text-zinc-400" />
            <p className="text-[11px] text-zinc-400">
              Full technical write-ups live in the repo:{" "}
              <InlineCode>README.md</InlineCode> · <InlineCode>document/document.md</InlineCode> ·{" "}
              <InlineCode>document/model_specification.md</InlineCode>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
