/*
 * Vision Inspector Local AI — Clean Apple-Style Visual Workspace
 * Privacy-First Local AI: 100% on-device WebGPU/WASM inference with zero data leakage.
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { RawImage } from "@huggingface/transformers";
import { detectObjects, getDetectorErrorMessage, getInferenceDevice, yieldToMainThread, type LocalDetection } from "@/lib/detector";
import { recognizeText, type LocalOcrResult } from "@/lib/ocr";
import { buildDetectionCsvRows, toCsv, toExportDetection } from "@/lib/export";
import { getBoxInImageSpace, getContainedImageLayout, type ImageLayout } from "@/lib/imageLayout";
import { detectImageWithDetailPass, mergeDetections } from "@/lib/multiScaleDetection";
import { detectOpenVocabularyObjects } from "@/lib/openVocabularyDetector";
import { playScanSound, setScanSoundEnabled } from "@/lib/scanSound";
import { matchVideoTracks, type TrackedDetection } from "@/lib/videoTracking";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AboutModal } from "@/components/AboutModal";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Cpu,
  Crosshair,
  Download,
  FileImage,
  FileJson2,
  Gauge,
  Github,
  ImagePlus,
  Info,
  Loader2,
  Maximize2,
  Minus,
  Move,
  Plus,
  ScanSearch,
  ScanText,
  ShieldCheck,
  Sparkles,
  Upload,
  Video,
  Volume2,
  VolumeX,
  X,
  Zap,
  Flame,
} from "lucide-react";

const MODEL_NAME = "YOLOS Tiny · local";
const SMOKE_IMAGE = "/manus-storage/vision-inspector-reference_db9c3cb7.jpg";
const MOUNTAIN_SMOKE_IMAGE = "/manus-storage/vision-inspector-mountain-multisubject-test_909f48e7.jpg";
const SMOKE_VIDEO = "/manus-storage/vision-inspector-video-smoke_1b5f1d55.webm";
const WINDOWS_DOWNLOAD_URL = "https://github.com/mohammed18salah/vision-inspector-local-ai/releases";
const REPOSITORY_URL = "https://github.com/mohammed18salah/vision-inspector-local-ai";

const SAMPLE_IMAGES = [
  { label: "شارع وسيارات", url: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1600&q=85" },
  { label: "شخص وحيوان", url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=85" },
  { label: "كوارث وركام", url: "https://images.unsplash.com/photo-1541888946425-d0fbb18015f6?auto=format&fit=crop&w=1600&q=85" },
  { label: "أشياء متعددة", url: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1600&q=85" },
];

type AnalysisStatus = "idle" | "loading" | "scanning" | "complete" | "error";
type Filter = "all" | "known" | "unknown" | "rescue";
type OcrStatus = "idle" | "loading" | "complete" | "error";
type VideoStatus = "idle" | "ready" | "tracking" | "error";
type AnalysisMode = "image" | "video" | null;

type ColorSet = { accent: string; background: string; label: string };
const COLORS: ColorSet[] = [
  { accent: "#1677ff", background: "rgba(22,119,255,.12)", label: "blue" },
  { accent: "#16a085", background: "rgba(22,160,133,.12)", label: "teal" },
  { accent: "#e78a2f", background: "rgba(231,138,47,.14)", label: "orange" },
  { accent: "#9b6cff", background: "rgba(155,108,255,.14)", label: "purple" },
  { accent: "#dc2626", background: "rgba(220,38,38,.14)", label: "red" },
];

function readableLabel(label: string) {
  const translations: Record<string, string> = {
    person: "شخص",
    car: "سيارة",
    truck: "شاحنة",
    bus: "حافلة",
    bicycle: "دراجة",
    motorcycle: "دراجة نارية",
    dog: "كلب",
    cat: "قطة",
    bird: "طائر",
    turtle: "سلحفاة",
    animal: "حيوان",
    horse: "حصان",
    cup: "كوب",
    bottle: "زجاجة",
    chair: "كرسي",
    backpack: "حقيبة ظهر",
    handbag: "حقيبة",
    suitcase: "حقيبة سفر",
    laptop: "حاسوب محمول",
    "cell phone": "هاتف",
    book: "كتاب",
    clock: "ساعة",
    umbrella: "مظلة",
    building: "مبنى",
    tree: "شجرة",
    vehicle: "مركبة",
    unknown: "غير معروف",
    "trapped person": "شخص محتجز",
    "human body": "جسم بشري",
    "human limb": "طرف بشري",
    rubble: "ركام / أنقاض",
    debris: "حطام",
    helmet: "خوذة",
  };
  return translations[label.toLowerCase()] ?? label;
}

function displayDetectionLabel(detection: LocalDetection) {
  if (detection.sourceModel?.includes("Rescue")) {
    return `🚨 إنقاذ: ${readableLabel(detection.label)}`;
  }
  if (!detection.isUnknown) return readableLabel(detection.label);
  if (detection.label === "unknown") return "غير معروف";
  return `مرشح: ${readableLabel(detection.label)}`;
}

function formatSize(bytes: number) {
  if (!bytes) return "صورة تجريبية";
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

function saveFile(contents: string, filename: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function VisionMark() {
  return (
    <div className="apple-mark" aria-hidden="true">
      <span /><span /><span />
    </div>
  );
}

export default function Home() {
  const smokeMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("smoke") === "1";
  const mountainSmokeMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mountainSmoke") === "1";
  const smokeVideoMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("videoSmoke") === "1";
  const videoProbeMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("videoProbe") === "1";

  const fileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStageRef = useRef<HTMLDivElement>(null);
  const videoOverlayRef = useRef<HTMLCanvasElement>(null);
  const videoLoopRef = useRef<number | null>(null);
  const videoProcessingRef = useRef(false);
  const videoTracksRef = useRef<TrackedDetection[]>([]);
  const nextTrackIdRef = useRef(1);
  const lastVideoAnalysisRef = useRef(-Infinity);
  const videoRateRef = useRef(1);
  const panRef = useRef<{ pointerX: number; pointerY: number; startX: number; startY: number } | null>(null);
  const lastPulseRef = useRef(0);

  const videoFrameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const analysisCacheRef = useRef<Map<string, { detections: LocalDetection[]; duration: number }>>(new Map());

  const [aboutOpen, setAboutOpen] = useState(false);
  const [rescueMode, setRescueMode] = useState(false);
  const [imageSrc, setImageSrc] = useState(mountainSmokeMode ? MOUNTAIN_SMOKE_IMAGE : smokeMode ? SMOKE_IMAGE : "");
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>(() => (smokeMode || mountainSmokeMode ? "image" : smokeVideoMode ? "video" : null));
  const [fileName, setFileName] = useState(mountainSmokeMode ? "mountain multi-subject test" : smokeMode ? "smoke test" : "لم يتم اختيار صورة");
  const [fileSize, setFileSize] = useState(0);
  const [detections, setDetections] = useState<LocalDetection[]>([]);
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [modelProgress, setModelProgress] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [ocrResult, setOcrResult] = useState<LocalOcrResult | null>(null);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [imageLayout, setImageLayout] = useState<ImageLayout>({ width: 0, height: 0, left: 0, top: 0 });
  const [soundEnabled, setSoundEnabled] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("vision-inspector-sound") === "on");
  const [videoSrc, setVideoSrc] = useState(smokeVideoMode ? SMOKE_VIDEO : "");
  const [videoName, setVideoName] = useState(smokeVideoMode ? "video smoke test" : "لم يتم اختيار فيديو");
  const [videoStatus, setVideoStatus] = useState<VideoStatus>(smokeVideoMode ? "ready" : "idle");
  const [videoError, setVideoError] = useState("");
  const [videoTracks, setVideoTracks] = useState<TrackedDetection[]>([]);
  const [videoRate, setVideoRate] = useState(1);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoLayout, setVideoLayout] = useState<ImageLayout>({ width: 0, height: 0, left: 0, top: 0 });

  const activeDetection = detections.find((detection) => detection.id === activeId) ?? detections[0] ?? null;
  const visibleDetections = useMemo(() => {
    if (filter === "known") return detections.filter((item) => !item.isUnknown);
    if (filter === "unknown") return detections.filter((item) => item.isUnknown);
    if (filter === "rescue") return detections.filter((item) => item.sourceModel?.includes("Rescue") || item.label.includes("person") || item.label.includes("human"));
    return detections;
  }, [detections, filter]);

  const rescueCandidateCount = detections.filter((item) => item.sourceModel?.includes("Rescue") || item.label.includes("person") || item.label.includes("human")).length;
  const averageConfidence = detections.length ? Math.round(detections.reduce((sum, item) => sum + item.confidence, 0) / detections.length) : 0;
  const device = getInferenceDevice();
  const hasExportableResults = status === "complete" || Boolean(ocrResult);
  const videoProgress = videoDuration > 0 ? Math.min(100, Math.max(0, (videoTime / videoDuration) * 100)) : 0;

  const recalculateImageLayout = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image?.naturalWidth || !image.naturalHeight) return;
    setImageLayout(getContainedImageLayout(canvas.clientWidth, canvas.clientHeight, image.naturalWidth, image.naturalHeight));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(recalculateImageLayout);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [imageSrc]);

  useEffect(() => {
    window.localStorage.setItem("vision-inspector-sound", soundEnabled ? "on" : "off");
  }, [soundEnabled]);

  useEffect(() => { videoRateRef.current = videoRate; }, [videoRate]);

  useEffect(() => () => {
    if (videoLoopRef.current) window.cancelAnimationFrame(videoLoopRef.current);
    if (videoSrc.startsWith("blob:")) URL.revokeObjectURL(videoSrc);
  }, [videoSrc]);

  useEffect(() => () => {
    if (imageSrc.startsWith("blob:")) URL.revokeObjectURL(imageSrc);
  }, [imageSrc]);

  const recalculateVideoLayout = () => {
    const stage = videoStageRef.current;
    const video = videoRef.current;
    if (!stage || !video?.videoWidth || !video.videoHeight) return;
    setVideoLayout(getContainedImageLayout(stage.clientWidth, stage.clientHeight, video.videoWidth, video.videoHeight));
  };

  useEffect(() => {
    const stage = videoStageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(recalculateVideoLayout);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [videoSrc]);

  const focusDetection = (item: LocalDetection) => {
    setActiveId(item.id);
    const targetZoom = 2.1;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !imageLayout.width || !imageLayout.height) return;
    const centerX = ((item.box.x + item.box.width / 2) / 100) * imageLayout.width;
    const centerY = ((item.box.y + item.box.height / 2) / 100) * imageLayout.height;
    setZoom(targetZoom);
    setPan({ x: rect.width / 2 - imageLayout.left - centerX * targetZoom, y: rect.height / 2 - imageLayout.top - centerY * targetZoom });
  };

  const handleCanvasWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const nextZoom = Math.max(1, Math.min(3.5, zoom + (event.deltaY < 0 ? 0.18 : -0.18)));
    if (nextZoom === 1) setPan({ x: 0, y: 0 });
    setZoom(nextZoom);
  };

  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(".real-box")) return;
    panRef.current = { pointerX: event.clientX, pointerY: event.clientY, startX: pan.x, startY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
  };

  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!panRef.current) return;
    setPan({ x: panRef.current.startX + event.clientX - panRef.current.pointerX, y: panRef.current.startY + event.clientY - panRef.current.pointerY });
  };

  const endPan = () => { panRef.current = null; setIsPanning(false); };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    void setScanSoundEnabled(next);
    if (next) window.setTimeout(() => playScanSound("start"), 80);
  };

  const drawVideoOverlay = (tracks: TrackedDetection[]) => {
    const video = videoRef.current;
    const overlay = videoOverlayRef.current;
    const stage = videoStageRef.current;
    if (!video || !overlay || !stage || !video.videoWidth || !video.videoHeight) return;
    overlay.width = stage.clientWidth;
    overlay.height = stage.clientHeight;
    const layout = getContainedImageLayout(overlay.width, overlay.height, video.videoWidth, video.videoHeight);
    const context = overlay.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, overlay.width, overlay.height);
    tracks.forEach((track, index) => {
      const color = COLORS[index % COLORS.length].accent;
      const x = layout.left + (track.box.x / 100) * layout.width;
      const y = layout.top + (track.box.y / 100) * layout.height;
      const width = (track.box.width / 100) * layout.width;
      const height = (track.box.height / 100) * layout.height;
      context.strokeStyle = color;
      context.lineWidth = Math.max(2, layout.width / 420);
      context.strokeRect(x, y, width, height);
      const label = `#${String(track.trackId).padStart(2, "0")} ${readableLabel(track.label)} ${track.confidence}%`;
      context.font = `${Math.max(14, layout.width / 36)}px IBM Plex Mono, sans-serif`;
      const labelWidth = context.measureText(label).width + 16;
      context.fillStyle = color;
      context.fillRect(x, Math.max(0, y - 28), labelWidth, 28);
      context.fillStyle = "#ffffff";
      context.fillText(label, x + 8, Math.max(20, y - 9));
    });
  };

  useEffect(() => {
    if (videoTracksRef.current.length) drawVideoOverlay(videoTracksRef.current);
  }, [videoLayout]);

  const processVideoFrame = async (allowPaused = false) => {
    const video = videoRef.current;
    if (!video || videoProcessingRef.current || (!allowPaused && video.paused) || video.ended || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (video.videoWidth < 16 || video.videoHeight < 16) return;
    videoProcessingRef.current = true;
    setVideoStatus("tracking");
    setVideoError("");
    try {
      let frameCanvas = videoFrameCanvasRef.current;
      const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
      const targetW = Math.max(1, Math.round(video.videoWidth * scale));
      const targetH = Math.max(1, Math.round(video.videoHeight * scale));
      if (!frameCanvas || frameCanvas.width !== targetW || frameCanvas.height !== targetH) {
        frameCanvas = document.createElement("canvas");
        frameCanvas.width = targetW;
        frameCanvas.height = targetH;
        videoFrameCanvasRef.current = frameCanvas;
      }
      const frameContext = frameCanvas.getContext("2d");
      if (!frameContext) throw new Error("تعذر تجهيز إطار الفيديو للتحليل.");
      frameContext.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);
      const frameImage = RawImage.fromCanvas(frameCanvas);
      const detectionsForFrame = await detectObjects(frameImage, { threshold: 0.28 });
      const result = matchVideoTracks(videoTracksRef.current, detectionsForFrame, nextTrackIdRef.current, video.currentTime);
      nextTrackIdRef.current = result.nextTrackId;
      videoTracksRef.current = result.tracked;
      setVideoTracks(result.tracked);
      setVideoTime(video.currentTime);
      drawVideoOverlay(result.tracked);
      if (result.tracked.length) playScanSound("detected");
    } catch (caught) {
      console.error("[Vision Inspector] video tracking failed", caught);
      const isTaintedCanvas = caught instanceof DOMException && caught.name === "SecurityError";
      setVideoError(isTaintedCanvas
        ? "لا يستطيع المتصفح قراءة إطار هذا المصدر للتحليل بسبب إعدادات الأمان. حمّل الفيديو من جهازك أو استخدم مصدرًا يسمح بـ CORS."
        : getDetectorErrorMessage(caught));
      setVideoStatus("error");
    } finally {
      videoProcessingRef.current = false;
    }
  };

  const scheduleVideoAnalysis = () => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended) return;
    const interval = 1 / videoRateRef.current;
    if (video.currentTime - lastVideoAnalysisRef.current >= interval && !videoProcessingRef.current) {
      lastVideoAnalysisRef.current = video.currentTime;
      void processVideoFrame();
    }
    videoLoopRef.current = window.requestAnimationFrame(scheduleVideoAnalysis);
  };

  const beginVideoTracking = () => {
    const video = videoRef.current;
    if (!video) return;
    void video.play().then(() => {
      if (!videoLoopRef.current) scheduleVideoAnalysis();
    }).catch((caught) => {
      setVideoError("تعذر تشغيل الفيديو. جرّب الضغط على زر التشغيل في مشغل الفيديو.");
      console.error("[Vision Inspector] video playback failed", caught);
    });
  };

  const stopVideoTracking = () => {
    videoRef.current?.pause();
    if (videoLoopRef.current) window.cancelAnimationFrame(videoLoopRef.current);
    videoLoopRef.current = null;
    if (videoStatus !== "error") setVideoStatus(videoSrc ? "ready" : "idle");
  };

  const acceptVideo = (file?: File) => {
    if (!file || !file.type.startsWith("video/")) {
      setVideoError("يرجى اختيار ملف فيديو صالح.");
      return;
    }
    stopVideoTracking();
    if (videoSrc.startsWith("blob:")) URL.revokeObjectURL(videoSrc);
    setVideoSrc(URL.createObjectURL(file));
    setVideoName(file.name);
    setVideoStatus("ready");
    setVideoError("");
    setVideoTracks([]);
    videoTracksRef.current = [];
    nextTrackIdRef.current = 1;
    lastVideoAnalysisRef.current = -Infinity;
  };

  const chooseFile = () => fileRef.current?.click();
  const resetToReference = () => {
    setImageSrc("");
    setFileName("لم يتم اختيار صورة");
    setFileSize(0);
    setOcrResult(null);
    setOcrStatus("idle");
    setOcrProgress(0);
    setOcrError("");
    setDetections([]);
    setActiveId(null);
    setStatus("idle");
    setError("");
    setDuration(null);
    setModelProgress(0);
  };

  const acceptFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("يرجى اختيار ملف صورة صالح بصيغة JPG أو PNG أو WebP.");
      return;
    }
    setImageSrc((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setFileName(file.name);
    setFileSize(file.size);
    setOcrResult(null);
    setOcrStatus("idle");
    setOcrProgress(0);
    setOcrError("");
    setDetections([]);
    setActiveId(null);
    setStatus("idle");
    setError("");
    setDuration(null);
    setModelProgress(0);
  };

  const chooseSample = (sample: (typeof SAMPLE_IMAGES)[number]) => {
    setImageSrc(sample.url);
    setFileName(sample.label);
    setFileSize(0);
    setOcrResult(null);
    setOcrStatus("idle");
    setOcrProgress(0);
    setOcrError("");
    setDetections([]);
    setActiveId(null);
    setStatus("idle");
    setError("");
    setDuration(null);
    setModelProgress(0);
  };

  const analyze = async () => {
    if (!imageRef.current || !imageSrc) return;
    setStatus("loading");
    setError("");
    setModelProgress(6);
    setOcrStatus("loading");
    setOcrProgress(5);
    setOcrError("");
    lastPulseRef.current = 0;
    playScanSound("start");
    const started = performance.now();
    const sourceImage = imageRef.current;
    const cacheKey = `${imageSrc}_${rescueMode ? "rescue" : "normal"}`;

    // Run OCR asynchronously in background so detection starts immediately
    const ocrPromise = recognizeText(sourceImage, { width: sourceImage.naturalWidth, height: sourceImage.naturalHeight }, (progress) => {
      setOcrProgress(Math.max(2, Math.min(100, Math.round(progress * 100))));
    })
      .then((result) => {
        setOcrResult(result);
        setOcrProgress(100);
        setOcrStatus("complete");
      })
      .catch((ocrFailure) => {
        console.error("[Vision Inspector] OCR failed", ocrFailure);
        setOcrError("تعذر استخراج النص من هذه الصورة.");
        setOcrStatus("error");
      });

    try {
      const cached = analysisCacheRef.current.get(cacheKey);
      let result: LocalDetection[];
      let elapsedSeconds: number;

      if (cached) {
        result = cached.detections;
        elapsedSeconds = cached.duration;
        setModelProgress(100);
        setStatus("scanning");
      } else {
        await yieldToMainThread(10);
        let rawResult = await detectImageWithDetailPass(sourceImage, {
          rescueMode,
          threshold: rescueMode ? 0.12 : 0.18,
          onProgress: (event) => {
            if (event && typeof event === "object" && "progress" in event) {
              const value = Number((event as { progress?: number }).progress);
              if (Number.isFinite(value)) {
                const progress = Math.max(6, Math.min(90, Math.round(value)));
                setModelProgress(progress);
                if (progress >= lastPulseRef.current + 25) {
                  lastPulseRef.current = progress;
                  playScanSound("pulse");
                }
              }
            }
            setStatus("scanning");
          },
          onDetailProgress: (completedTiles, totalTiles) => {
            setStatus("scanning");
            setModelProgress(Math.max(70, Math.min(94, 70 + Math.round((completedTiles / totalTiles) * 24))));
          },
        });

        // Run zero-shot detector only when necessary or in rescue mode
        if (rawResult.length < 5 || rescueMode) {
          await yieldToMainThread(10);
          setStatus("scanning");
          setModelProgress(84);
          const openVocabularyDetections = await detectOpenVocabularyObjects(sourceImage, {
            rescueMode,
            onCategoryProgress: (completed, total) => {
              setModelProgress(Math.max(84, Math.min(98, 84 + Math.round((completed / total) * 14))));
            },
          });
          rawResult = mergeDetections([...rawResult, ...openVocabularyDetections], 0.38);
        }

        result = rawResult;
        elapsedSeconds = Math.max(0.01, (performance.now() - started) / 1000);

        if (analysisCacheRef.current.size >= 10) {
          const oldestKey = analysisCacheRef.current.keys().next().value;
          if (oldestKey !== undefined) analysisCacheRef.current.delete(oldestKey);
        }
        analysisCacheRef.current.set(cacheKey, { detections: result, duration: elapsedSeconds });
      }

      setDetections(result);
      setActiveId(result[0]?.id ?? null);
      setDuration(elapsedSeconds);
      setModelProgress(100);
      setStatus("complete");
      if (result.length) playScanSound("detected");
      window.setTimeout(() => playScanSound("complete"), result.length ? 100 : 0);
      void ocrPromise;
    } catch (caught) {
      console.error("[Vision Inspector] inference failed", caught);
      setStatus("error");
      setError(getDetectorErrorMessage(caught));
    }
  };

  const buildExport = () => ({
    generatedAt: new Date().toISOString(),
    system: "Vision Inspector Local AI",
    developer: "Mohammed Salahuldeen Dev",
    image: {
      name: fileName,
      sizeBytes: fileSize,
      width: imageRef.current?.naturalWidth ?? 0,
      height: imageRef.current?.naturalHeight ?? 0,
    },
    inference: {
      model: MODEL_NAME,
      rescueModeEnabled: rescueMode,
      device,
      durationSeconds: duration,
      objectCount: detections.length,
      rescueCandidatesCount: rescueCandidateCount,
    },
    detections: detections.map(toExportDetection),
    ocr: ocrResult ? { text: ocrResult.text, confidence: ocrResult.confidence, language: ocrResult.language, words: ocrResult.words } : null,
  });

  const exportJson = () => saveFile(JSON.stringify(buildExport(), null, 2), "vision-inspector-results.json", "application/json;charset=utf-8");
  const exportCsv = () => {
    const rows = [
      ["type", "label", "candidate_label", "status", "tentative", "confidence", "x_percent", "y_percent", "width_percent", "height_percent", "text"],
      ...buildDetectionCsvRows(detections),
      ...(ocrResult?.words ?? []).map((word) => ["text", "ocr", "", "confirmed", false, word.confidence, word.box.x, word.box.y, word.box.width, word.box.height, word.text]),
    ];
    saveFile(toCsv(rows), "vision-inspector-results.csv", "text/csv;charset=utf-8");
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => acceptFile(event.target.files?.[0]);
  const onVideoFileChange = (event: ChangeEvent<HTMLInputElement>) => acceptVideo(event.target.files?.[0]);
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  };
  const statusText = status === "loading" ? "يجهّز النموذج…" : status === "scanning" ? (rescueMode ? "يمسح بحثاً عن ناجين وركام…" : "يحلّل الصورة…") : status === "complete" ? "اكتمل التحليل" : status === "error" ? "تعذر التحليل" : "جاهز للتحليل";

  return (
    <div className="vision-app" dir="rtl">
      {/* Header — Clean & Apple-like with About Button */}
      <header className="apple-header">
        <div className="header-brand">
          <VisionMark />
          <div>
            <strong>Vision Inspector</strong>
            <span>تحليل بصري محلي · ويب وWindows</span>
          </div>
        </div>

        <div className="header-center">
          <span className="privacy-pill">
            <ShieldCheck size={14} />
            <span>معالجة محلية 100% · لا تغادر جهازك</span>
          </span>
        </div>

        <div className="header-actions">
          <span className="runtime-pill">
            <span className="runtime-dot" />
            {device === "webgpu" ? "WebGPU تسريع عتادي" : "WASM / CPU"}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="header-icon sound-toggle"
            aria-label={soundEnabled ? "كتم مؤثرات المسح" : "تشغيل مؤثرات المسح"}
            title={soundEnabled ? "كتم مؤثرات المسح" : "تشغيل مؤثرات المسح"}
            onClick={toggleSound}
          >
            {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="about-header-btn"
            onClick={() => setAboutOpen(true)}
          >
            <Sparkles size={14} />
            <span>حول المنصة</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="content-shell">
        {/* Hero Section */}
        <section className="page-intro">
          <div>
            <p className="section-eyebrow">
              <span className="eyebrow-dot" /> مساحة الرؤية والإنقاذ الذكي
            </p>

            <h1>
              فحص ذكي للصور <span>ومقاطع الفيديو.</span>
            </h1>

            <p className="lede">
              كشف الكائنات، تتبع الحركة بين الإطارات، واستخراج النصوص، مع دعم وضع البحث في الكوارث والأنقاض — كل ذلك يتم محلياً بالكامل على معالج وكرت جهازك.
            </p>

            <div className="project-links" aria-label="روابط المشروع">
              <a className="project-link project-link-primary" href={WINDOWS_DOWNLOAD_URL} target="_blank" rel="noreferrer">
                <Download size={15} /> تنزيل تطبيق Windows
              </a>
              <a className="project-link" href={REPOSITORY_URL} target="_blank" rel="noreferrer">
                <Github size={15} /> المستودع المفتوح على GitHub
              </a>
              <button type="button" className="project-link" onClick={() => setAboutOpen(true)}>
                <Info size={15} /> تفاصيل المنصة والمطور
              </button>
            </div>
          </div>

          <div className="intro-model">
            <Cpu size={17} />
            <div>
              <span>النموذج المحلي</span>
              <strong>{MODEL_NAME}</strong>
            </div>
          </div>
        </section>

        {/* Mode Selector */}
        <section className="analysis-mode-picker" aria-label="اختر نوع التحليل">
          <div className="mode-picker-copy">
            <span className="card-eyebrow">WORKFLOW SELECTION</span>
            <strong>ماذا تريد أن تحلّل الآن؟</strong>
            <span>اختر نمط التحليل المناسب للبدء بالمعالجة الفورية على كرت الشاشة والمعالج.</span>
          </div>
          <div className="mode-picker-options">
            <button
              type="button"
              className={cn("mode-choice", analysisMode === "image" && "mode-choice-active")}
              onClick={() => setAnalysisMode("image")}
            >
              <span className="mode-choice-icon"><ImagePlus size={22} /></span>
              <span>
                <strong>تحليل الصور والأنقاض</strong>
                <small>كشف العناصر، الأفراد المحتجزين، استخراج OCR، وتصدير النتائج</small>
              </span>
              <ChevronRight size={17} />
            </button>
            <button
              type="button"
              className={cn("mode-choice", analysisMode === "video" && "mode-choice-active")}
              onClick={() => setAnalysisMode("video")}
            >
              <span className="mode-choice-icon"><Video size={22} /></span>
              <span>
                <strong>تتبع الفيديو الحي</strong>
                <small>تتبع مسارات الكائنات بين الإطارات مع الحفاظ على الصوت الأصلي</small>
              </span>
              <ChevronRight size={17} />
            </button>
          </div>
        </section>

        {/* Image Analysis Mode */}
        {analysisMode === "image" && (
          <>
            {/* Stats Row */}
            <section className="stat-row" aria-label="حالة التحليل">
              <div className="stat">
                <span>الكائنات المكتشفة</span>
                <strong>{detections.length}</strong>
              </div>
              <div className="stat">
                <span>متوسط الثقة</span>
                <strong>{averageConfidence ? `${averageConfidence}%` : "—"}</strong>
              </div>
              <div className="stat">
                <span>زمن الاستدلال</span>
                <strong>{duration ? `${duration.toFixed(2)}s` : "—"}</strong>
              </div>
              <div className="stat stat-status">
                <span>حالة المنظومة</span>
                <strong>
                  <span className={cn("status-dot", status === "error" && "status-dot-error")} />
                  {statusText}
                </strong>
              </div>
            </section>

            {/* Work Grid */}
            <div className="work-grid">
              {/* Canvas Column */}
              <section className="canvas-column">
                <div className="section-bar">
                  <div className="section-title">
                    <ScanSearch size={17} />
                    <strong>المشهد البصري المباشر</strong>
                    <span>LIVE INFERENCE CANVAS</span>
                  </div>
                  <div className="bar-actions">
                    <span className="image-dimensions mono">
                      {imageSrc && imageRef.current?.naturalWidth ? `${imageRef.current.naturalWidth} × ${imageRef.current.naturalHeight}` : "—"}
                    </span>
                    <Button variant="outline" size="sm" className="reset-btn" onClick={resetToReference}>
                      إعادة ضبط
                    </Button>
                  </div>
                </div>

                <div className={cn("image-card", status === "scanning" && "image-card-scanning")}>
                  <div className="canvas-toolbar">
                    <div className="toolbar-left">
                      <span className={cn("analysis-state", status)}>
                        <span /> {statusText}
                      </span>
                      {status === "complete" && (
                        <span className="real-badge">
                          <Check size={12} /> نتائج معالجة حقيقية
                        </span>
                      )}
                      {rescueMode && (
                        <span className="rescue-badge">
                          <Flame size={12} /> وضع الإنقاذ مفعّل
                        </span>
                      )}
                    </div>
                    <span className="mono canvas-index">FRAME / 01</span>
                  </div>

                  <div
                    ref={canvasRef}
                    className={cn("image-canvas interactive-canvas", isPanning && "canvas-panning")}
                    onWheel={handleCanvasWheel}
                    onPointerDown={startPan}
                    onPointerMove={movePan}
                    onPointerUp={endPan}
                    onPointerCancel={endPan}
                  >
                    {imageSrc ? (
                      <div
                        className="image-stage"
                        style={{
                          width: `${imageLayout.width}px`,
                          height: `${imageLayout.height}px`,
                          left: `${imageLayout.left}px`,
                          top: `${imageLayout.top}px`,
                          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        }}
                      >
                        <img
                          ref={imageRef}
                          src={imageSrc}
                          crossOrigin={imageSrc.startsWith("http") ? "anonymous" : undefined}
                          alt="الصورة التي سيحللها النموذج"
                          className="source-image"
                          draggable={false}
                          onLoad={() => {
                            setError("");
                            requestAnimationFrame(recalculateImageLayout);
                          }}
                        />
                        {status === "scanning" && <div className="scan-sweep" />}
                        {detections.map((item, index) => {
                          const color = COLORS[index % COLORS.length];
                          const isActive = item.id === activeDetection?.id;
                          const isRescueItem = item.sourceModel?.includes("Rescue") || item.label.includes("person");
                          const displayBox = getBoxInImageSpace(item.box, imageLayout);
                          const boxColor = isRescueItem ? "#dc2626" : item.isUnknown ? "#e78a2f" : color.accent;
                          const bgColor = isActive
                            ? (isRescueItem ? "rgba(220,38,38,.16)" : item.isUnknown ? "rgba(231,138,47,.16)" : color.background)
                            : "transparent";

                          return (
                            <button
                              key={item.id}
                              type="button"
                              aria-label={`عرض ${displayDetectionLabel(item)}`}
                              className={cn(
                                "real-box",
                                isActive && "real-box-active",
                                item.isUnknown && "real-box-unknown",
                                isRescueItem && "real-box-rescue"
                              )}
                              style={{
                                left: `${displayBox.left}px`,
                                top: `${displayBox.top}px`,
                                width: `${displayBox.width}px`,
                                height: `${displayBox.height}px`,
                                borderColor: boxColor,
                                backgroundColor: bgColor,
                              }}
                              onClick={() => focusDetection(item)}
                            >
                              <span style={{ backgroundColor: boxColor }}>
                                <b className="mono">{String(item.id).padStart(2, "0")}</b> {displayDetectionLabel(item)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="canvas-empty">
                        <ImagePlus size={36} />
                        <span>ارفع صورة أو اختر عينة لبدء التحليل</span>
                        <small>يتم تشغيل نماذج الذكاء الاصطناعي محلياً على جهازك</small>
                      </div>
                    )}

                    {(status === "loading" || status === "scanning") && (
                      <div className="loading-overlay">
                        <Loader2 size={32} className="loader-spin" />
                        <strong>{status === "loading" ? "تجهيز النموذج المحلي…" : "يمسح الصورة بدقة متعددة المقاييس…"}</strong>
                        <span>تظهر الصناديق فور اكتمال التحليل بدون تعليق الواجهة.</span>
                        <Progress value={status === "loading" ? modelProgress : 75} className="model-progress" />
                      </div>
                    )}

                    {!detections.length && status === "idle" && imageSrc && (
                      <div className="canvas-empty">
                        <Crosshair size={32} />
                        <span>اضغط «بدء التحليل البصري» لمعالجة الصورة</span>
                        <small>يمكنك تحريك وتكبير الصورة بعد اكتمال النتائج</small>
                      </div>
                    )}

                    {imageSrc && (
                      <div className="canvas-controls">
                        <button type="button" onClick={() => setZoom(Math.max(1, zoom - 0.2))} aria-label="تصغير">
                          <Minus size={15} />
                        </button>
                        <span className="mono">{Math.round(zoom * 100)}%</span>
                        <button type="button" onClick={() => setZoom(Math.min(3.5, zoom + 0.2))} aria-label="تكبير">
                          <Plus size={15} />
                        </button>
                        <button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} aria-label="إعادة توسيط">
                          <Move size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="canvas-footer">
                    <span>
                      <Maximize2 size={13} /> اسحب للتحريك · عجلة الماوس للتكبير · انقر أي عنصر للتركيز عليه
                    </span>
                    <span className="mono">OFFLINE / LOCAL GPU</span>
                  </div>
                </div>

                {error && (
                  <div className="error-banner">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                    <button type="button" onClick={() => setError("")} aria-label="إغلاق الخطأ">
                      <X size={15} />
                    </button>
                  </div>
                )}
              </section>

              {/* Control Column */}
              <aside className="control-column">
                {/* Upload & Setup Card */}
                <section className="control-card upload-card">
                  <div className="card-heading">
                    <div>
                      <span className="card-eyebrow">INPUT MEDIA</span>
                      <h2>تحميل أو اختيار صورة</h2>
                    </div>
                    <ImagePlus size={19} />
                  </div>

                  <div
                    className={cn("drop-surface", dragging && "drop-surface-active")}
                    onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                  >
                    <Upload size={24} />
                    <strong>اسحب وأفلت الصورة هنا</strong>
                    <span>JPG, PNG, WebP (بحد أقصى 50MB)</span>
                    <input ref={fileRef} className="sr-only" type="file" accept="image/*" onChange={onFileChange} />
                    <Button variant="outline" size="sm" onClick={chooseFile}>
                      اختيار من الجهاز <ChevronRight size={14} />
                    </Button>
                  </div>

                  {/* Disaster Rescue Mode Toggle — Neatly Placed Under Upload Dropzone */}
                  <div className="rescue-switch-row">
                    <div className="rescue-switch-info">
                      <Flame size={16} className={rescueMode ? "text-amber-600" : "text-slate-400"} />
                      <div>
                        <strong>وضع البحث في الكوارث والأنقاض</strong>
                        <span>كشف عميق للأشخاص المحتجزين والأطراف الجزئية</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={rescueMode ? "default" : "outline"}
                      size="sm"
                      className={cn("rescue-switch-btn", rescueMode && "rescue-switch-btn-active")}
                      onClick={() => setRescueMode(!rescueMode)}
                    >
                      {rescueMode ? "مفعّل" : "معطّل"}
                    </Button>
                  </div>

                  <div className="selected-file">
                    <FileImage size={17} />
                    <div>
                      <strong>{fileName}</strong>
                      <span>{formatSize(fileSize)}</span>
                    </div>
                    {imageSrc && (
                      <button type="button" onClick={resetToReference} aria-label="إزالة الصورة">
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  <div className="sample-links">
                    <span>أو جرب عينة سريعة:</span>
                    <div>
                      {SAMPLE_IMAGES.map((sample) => (
                        <button key={sample.url} type="button" onClick={() => chooseSample(sample)}>
                          {sample.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="primary-action"
                    onClick={analyze}
                    disabled={!imageSrc || status === "loading" || status === "scanning"}
                  >
                    <span>{status === "loading" || status === "scanning" ? "جارٍ التحليل المحلي…" : "بدء التحليل البصري"}</span>
                    {status === "loading" || status === "scanning" ? <Loader2 size={17} className="loader-spin" /> : <Zap size={16} />}
                  </Button>
                </section>

                {/* Results Card */}
                <section className="control-card results-card">
                  <div className="card-heading results-heading">
                    <div>
                      <span className="card-eyebrow">DETECTIONS</span>
                      <h2>العناصر المكتشفة</h2>
                    </div>
                    <span className="result-count mono">{String(detections.length).padStart(2, "0")}</span>
                  </div>

                  <div className="filter-tabs">
                    <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
                      الكل ({detections.length})
                    </button>
                    {rescueCandidateCount > 0 && (
                      <button type="button" className={filter === "rescue" ? "active" : ""} onClick={() => setFilter("rescue")}>
                        إنقاذ ({rescueCandidateCount})
                      </button>
                    )}
                    <button type="button" className={filter === "known" ? "active" : ""} onClick={() => setFilter("known")}>
                      مؤكد
                    </button>
                    <button type="button" className={filter === "unknown" ? "active" : ""} onClick={() => setFilter("unknown")}>
                      مرشح
                    </button>
                  </div>

                  <div className="result-list">
                    {visibleDetections.length ? (
                      visibleDetections.map((item, index) => {
                        const isRescueItem = item.sourceModel?.includes("Rescue") || item.label.includes("person");
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={cn(
                              "result-item",
                              item.id === activeDetection?.id && "result-item-active",
                              isRescueItem && "result-item-rescue"
                            )}
                            onClick={() => focusDetection(item)}
                          >
                            <span
                              className="result-thumb"
                              style={{
                                backgroundImage: `url("${imageSrc}")`,
                                backgroundSize: `${10000 / Math.max(item.box.width, 4)}% ${10000 / Math.max(item.box.height, 4)}%`,
                                backgroundPosition: `${item.box.x}% ${item.box.y}%`,
                              }}
                            />
                            <span
                              className="result-color"
                              style={{ background: isRescueItem ? "#dc2626" : item.isUnknown ? "#e78a2f" : COLORS[index % COLORS.length].accent }}
                            />
                            <span className="result-label">
                              <strong>{displayDetectionLabel(item)}</strong>
                              <span className="mono">{item.isUnknown ? "tentative / low confidence" : item.label}</span>
                            </span>
                            <span className="result-score mono">{item.confidence}%</span>
                            <ChevronRight size={15} />
                          </button>
                        );
                      })
                    ) : (
                      <div className="results-empty">
                        <Gauge size={24} />
                        <span>{status === "idle" ? "بانتظار بدء التحليل" : "لم يجد النموذج كائنات تطابق هذا الفلتر"}</span>
                        <small>{status === "idle" ? "اضغط «بدء التحليل البصري» للفحص" : "جرّب تغيير الفلتر"}</small>
                      </div>
                    )}
                  </div>

                  <div className="model-note">
                    <ShieldCheck size={15} />
                    <span>الاستدلال يتم داخل المتصفح بالكامل، لا يتم إرسال صورك لأي خادم خارجي.</span>
                  </div>
                </section>

                {/* OCR Card */}
                <section className="control-card ocr-card">
                  <div className="card-heading">
                    <div>
                      <span className="card-eyebrow">TEXT EXTRACTION</span>
                      <h2>النصوص المستخرجة (OCR)</h2>
                    </div>
                    <ScanText size={19} />
                  </div>

                  {ocrStatus === "loading" && (
                    <div className="ocr-progress">
                      <span>يستخرج النصوص العربية والإنجليزية محلياً… {ocrProgress}%</span>
                      <Progress value={ocrProgress} className="model-progress" />
                    </div>
                  )}

                  {ocrStatus === "complete" && (
                    <div className="ocr-output">
                      <div className="ocr-meta">
                        <span>{ocrResult?.words.length ?? 0} كلمة مكتشفة</span>
                        <span>{ocrResult?.confidence ?? 0}% دقة المحرك</span>
                      </div>
                      <p>{ocrResult?.text || "لم يُعثر على نصوص مقروءة في هذه الصورة."}</p>
                    </div>
                  )}

                  {ocrStatus === "error" && (
                    <div className="ocr-error">
                      <AlertCircle size={14} /> {ocrError}
                    </div>
                  )}

                  {ocrStatus === "idle" && (
                    <div className="ocr-empty">
                      سيتم استخراج النصوص العربية والإنجليزية تلقائياً عند بدء التحليل.
                    </div>
                  )}
                </section>

                {/* Export Card */}
                <section className="control-card export-card">
                  <div className="card-heading">
                    <div>
                      <span className="card-eyebrow">STRUCTURED EXPORT</span>
                      <h2>تصدير البيانات والتقارير</h2>
                    </div>
                    <Download size={19} />
                  </div>
                  <p>تصدير كامل لكافة إحداثيات الصناديق والكائنات ومستويات الثقة والنصوص المستخرجة.</p>
                  <div className="export-actions">
                    <Button variant="outline" size="sm" onClick={exportJson} disabled={!hasExportableResults || ocrStatus === "loading"}>
                      <FileJson2 size={15} /> تقرير JSON
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportCsv} disabled={!hasExportableResults || ocrStatus === "loading"}>
                      <Download size={15} /> جدول CSV
                    </Button>
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}

        {/* Video Tracking Mode */}
        {analysisMode === "video" && (
          <section className="video-tracking-panel">
            <div className="video-panel-heading">
              <div>
                <span className="card-eyebrow">REAL-TIME VIDEO TRACKING</span>
                <h2>تتبّع الكائنات عبر مقاطع الفيديو</h2>
                <p>
                  يحلل النظام الإطارات المتتابعة محلياً، ويربط الكائن المتحرك بمعرّف ثابت (Stable Track ID) مع الإبقاء على مسار الصوت الأصلي للفيديو.
                </p>
              </div>
              <Video size={24} />
            </div>

            <div className="video-tracking-grid">
              <div className="video-stage-wrap">
                {videoSrc ? (
                  <div ref={videoStageRef} className="video-stage">
                    <video
                      ref={videoRef}
                      src={videoSrc}
                      crossOrigin="anonymous"
                      controls
                      playsInline
                      onPlay={() => { if (!videoLoopRef.current) scheduleVideoAnalysis(); }}
                      onPause={stopVideoTracking}
                      onEnded={stopVideoTracking}
                      onTimeUpdate={(event) => setVideoTime(event.currentTarget.currentTime)}
                      onSeeked={() => { if (videoProbeMode) window.setTimeout(() => void processVideoFrame(true), 160); }}
                      onLoadedMetadata={(event) => {
                        setVideoStatus("ready");
                        setVideoDuration(event.currentTarget.duration || 0);
                        if (videoProbeMode) event.currentTarget.currentTime = Math.min(2, event.currentTarget.duration / 2);
                        requestAnimationFrame(() => {
                          recalculateVideoLayout();
                          drawVideoOverlay(videoTracksRef.current);
                        });
                      }}
                    />
                    <canvas ref={videoOverlayRef} className="video-overlay" aria-label="مربعات الكشف المتحركة" />
                    <div className={cn("video-live-chip", videoStatus === "tracking" && "video-live-chip-active")}>
                      <span /> {videoStatus === "tracking" ? "LIVE TRACKING" : videoStatus === "error" ? "TRACKING ERROR" : "READY"}
                    </div>
                  </div>
                ) : (
                  <div className="video-empty">
                    <Video size={36} />
                    <strong>اختر ملف فيديو لبدء التتبّع</strong>
                    <span>يدعم MP4 و WebM و MOV. لا يتم رفع الفيديو لأي خادم خارجي.</span>
                  </div>
                )}

                {videoError && (
                  <div className="video-error">
                    <AlertCircle size={15} /> <span>{videoError}</span>
                  </div>
                )}
              </div>

              <aside className="video-controls-card">
                <div className="video-file-row">
                  <Video size={18} />
                  <div>
                    <strong>{videoName}</strong>
                    <span>{videoSrc ? "فيديو محلي · الصوت الأصلي مفعل" : "اختر ملف فيديو من حاسوبك"}</span>
                  </div>
                </div>

                <input ref={videoFileRef} className="sr-only" type="file" accept="video/*" onChange={onVideoFileChange} />
                <Button variant="outline" className="video-picker" onClick={() => videoFileRef.current?.click()}>
                  <Upload size={15} /> اختيار ملف فيديو
                </Button>

                <label className="video-rate">
                  <span>معدل تحليل الإطارات</span>
                  <select value={videoRate} onChange={(event) => setVideoRate(Number(event.target.value))}>
                    <option value={0.5}>إطار كل ثانيتين (خفيف)</option>
                    <option value={1}>1 إطار / ثانية (متوازن)</option>
                    <option value={2}>2 إطار / ثانية (دقيق)</option>
                  </select>
                </label>

                <div className="video-control-actions">
                  <Button className="primary-action video-start" onClick={beginVideoTracking} disabled={!videoSrc || videoStatus === "tracking"}>
                    <Zap size={16} /> ابدأ التتبع
                  </Button>
                  <Button variant="outline" className="video-stop" onClick={stopVideoTracking} disabled={!videoSrc || videoStatus !== "tracking"}>
                    إيقاف
                  </Button>
                </div>

                <div className="video-metrics">
                  <div>
                    <span>المسارات</span>
                    <strong>{videoTracks.length}</strong>
                  </div>
                  <div>
                    <span>الموضع</span>
                    <strong className="mono">{videoTime.toFixed(1)}s</strong>
                  </div>
                  <div>
                    <span>المحرك</span>
                    <strong className="mono">LOCAL</strong>
                  </div>
                </div>

                <div className="video-progress-block">
                  <div>
                    <span>تقدم التشغيل</span>
                    <strong className="mono">{videoDuration ? `${videoTime.toFixed(1)} / ${videoDuration.toFixed(1)}s` : "—"}</strong>
                  </div>
                  <Progress value={videoProgress} className="video-progress" />
                </div>

                <div className="track-list">
                  {videoTracks.length ? (
                    videoTracks.map((track, index) => (
                      <div className="track-item" key={track.trackId}>
                        <span className="track-color" style={{ background: COLORS[index % COLORS.length].accent }} />
                        <span className="track-id mono">#{String(track.trackId).padStart(2, "0")}</span>
                        <span className="track-name">{readableLabel(track.label)}</span>
                        <span className="track-confidence mono">{track.confidence}%</span>
                      </div>
                    ))
                  ) : (
                    <span className="track-empty">ستظهر هنا الكائنات المكتشفة والمرتبطة بين الإطارات.</span>
                  )}
                </div>
              </aside>
            </div>
          </section>
        )}

        {/* Selected Item Inspector */}
        {analysisMode === "image" && (
          <section className="detail-panel">
            <div className="detail-heading">
              <div>
                <span className="card-eyebrow">INSPECTOR</span>
                <h2>{activeDetection ? `تفاصيل الكائن المحدد · #${String(activeDetection.id).padStart(2, "0")}` : "مفتش العناصر"}</h2>
              </div>
              <span className="mono detail-source">{activeDetection?.sourceModel ?? "awaiting inference"}</span>
            </div>

            {activeDetection ? (
              <div className="detail-content">
                <div className="detail-main">
                  <span className={cn("detail-dot", activeDetection.isUnknown && "unknown-dot")} />
                  <div>
                    <strong>{displayDetectionLabel(activeDetection)}</strong>
                    <span className="mono">{activeDetection.isUnknown ? "tentative / low confidence" : activeDetection.label}</span>
                  </div>
                </div>
                <div className="detail-metric">
                  <span>نسبة الثقة</span>
                  <strong>{activeDetection.confidence}%</strong>
                </div>
                <div className="detail-metric">
                  <span>الموقع في المشهد</span>
                  <strong className="mono">{Math.round(activeDetection.box.x)}% · {Math.round(activeDetection.box.y)}%</strong>
                </div>
                <div className="detail-metric">
                  <span>الأبعاد النسبية</span>
                  <strong className="mono">{Math.round(activeDetection.box.width)} × {Math.round(activeDetection.box.height)}%</strong>
                </div>
              </div>
            ) : (
              <div className="detail-empty">
                اختر أي كائن من المشهد لعرض إحداثياته الدقيقة ونسبة الثقة ونموذج الاستدلال الخاص به.
              </div>
            )}
          </section>
        )}

        {/* Footer */}
        <footer className="page-footer">
          <div className="footer-credits">
            <span><ShieldCheck size={14} className="text-emerald-600" /> معالجة محلية خاصة بالكامل</span>
            <button type="button" className="text-xs text-muted-foreground hover:text-primary transition-colors" onClick={() => setAboutOpen(true)}>
              حول المنصة والمطور
            </button>
          </div>
          <span className="mono text-[10px] text-muted-foreground">
            VISION INSPECTOR LOCAL AI v1.3.0
          </span>
        </footer>
      </main>

      {/* About Platform & Developer Modal */}
      <AboutModal open={aboutOpen} onOpenChange={setAboutOpen} />
    </div>
  );
}
