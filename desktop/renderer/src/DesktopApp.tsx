import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, BarChart3, ChevronLeft, Cpu, Download, FileImage, FileText, FolderOpen, Gauge, Image, Loader2, MonitorCog, Pause, Play, ScanText, ShieldCheck, Video, Volume2 } from "lucide-react";
import { type Box, type Detection, type DeviceRuntime, type OcrResult, type PerformanceBenchmark, type TrackedDetection, benchmarkObjectDetection, detectObjects, detectOpenCandidates, getPreferredDevice, matchTracks, mergeDetections, recognizeText, selectedInferenceDevice, toCsv } from "./vision";

type Mode = "image" | "video";
type Status = "idle" | "loading" | "analyzing" | "complete" | "error";
type PickedFile = { name: string; size: number; path: string; url: string };
type DeviceInfo = Awaited<ReturnType<typeof window.visionDesktop.getDevice>>;

const arabicLabel: Record<string, string> = { person: "شخص", car: "سيارة", dog: "كلب", cat: "قطة", bird: "طائر", turtle: "سلحفاة", building: "مبنى", bicycle: "دراجة", bus: "حافلة", truck: "شاحنة", stop: "إشارة توقف", "stop sign": "لافتة توقف", unknown: "غير معروف" };
const readable = (label: string) => arabicLabel[label.toLowerCase()] ?? label;
const sizeText = (size: number) => size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(size / 1024)} KB`;

function containedLayout(stage: DOMRect | null, width: number, height: number) {
  if (!stage || !width || !height) return { left: 0, top: 0, width: 0, height: 0 };
  const scale = Math.min(stage.width / width, stage.height / height);
  const drawWidth = width * scale; const drawHeight = height * scale;
  return { left: (stage.width - drawWidth) / 2, top: (stage.height - drawHeight) / 2, width: drawWidth, height: drawHeight };
}

function DetectionBox({ item, layout, index }: { item: Detection | TrackedDetection; layout: ReturnType<typeof containedLayout>; index: number }) {
  const confirmed = !item.isUnknown;
  return <div className={`desktop-box ${confirmed ? "desktop-box-confirmed" : "desktop-box-tentative"}`} style={{ left: layout.left + item.box.x / 100 * layout.width, top: layout.top + item.box.y / 100 * layout.height, width: item.box.width / 100 * layout.width, height: item.box.height / 100 * layout.height }}><span className="desktop-box-label"><b>{"trackId" in item ? `#${String(item.trackId).padStart(2, "0")} · ` : `${String(index + 1).padStart(2, "0")} · `}</b>{item.isUnknown && item.label !== "unknown" ? `مرشح: ${readable(item.label)}` : readable(item.label)} <em>{item.confidence}%</em></span></div>;
}

export function DesktopApp() {
  const [mode, setMode] = useState<Mode>("image");
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [runtimeDevice, setRuntimeDevice] = useState<DeviceRuntime>("wasm");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("جاهز لاختيار ملف محلي");
  const [detections, setDetections] = useState<Detection[]>([]);
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [mediaSize, setMediaSize] = useState({ width: 0, height: 0 });
  const [stageRect, setStageRect] = useState<DOMRect | null>(null);
  const [tracks, setTracks] = useState<TrackedDetection[]>([]);
  const [tracking, setTracking] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [analysisRate, setAnalysisRate] = useState(1);
  const [lastSeen, setLastSeen] = useState(-Infinity);
  const [videoError, setVideoError] = useState("");
  const [benchmark, setBenchmark] = useState<PerformanceBenchmark | null>(null);
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState("");
  const [history, setHistory] = useState<LocalHistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const imageRef = useRef<HTMLImageElement>(null); const videoRef = useRef<HTMLVideoElement>(null); const stageRef = useRef<HTMLDivElement>(null); const frameRef = useRef<HTMLCanvasElement>(null); const fileInputRef = useRef<HTMLInputElement>(null); const tracksRef = useRef<TrackedDetection[]>([]); const nextTrackRef = useRef(1); const frameBusy = useRef(false); const videoHistoryRecordedRef = useRef(false);

  const refreshHistory = useCallback(async () => {
    try { setHistory(await window.visionDesktop.listHistory()); setHistoryError(""); }
    catch { setHistoryError("تعذر قراءة السجل المحلي."); }
  }, []);
  const appendHistory = useCallback(async (record: LocalHistoryInput) => {
    try { const entry = await window.visionDesktop.addHistory(record); setHistory((current) => [entry, ...current.filter((item) => item.id !== entry.id)].slice(0, 100)); }
    catch { setHistoryError("تعذر حفظ هذا الحدث في السجل المحلي."); }
  }, []);

  useEffect(() => {
    void window.visionDesktop.getDevice().then(setDeviceInfo).catch(() => setMessage("تعذر قراءة حالة الجهاز."));
    void getPreferredDevice().then(setRuntimeDevice);
  }, []);
  useEffect(() => {
    void window.visionDesktop.getSmokeMedia().then((smoke) => {
      if (!smoke) return;
      setFile(smoke);
      setMessage(`عينة تطوير محلية: ${smoke.name}`);
    });
  }, []);
  useEffect(() => { void refreshHistory(); }, [refreshHistory]);
  useEffect(() => { const observer = new ResizeObserver(() => setStageRect(stageRef.current?.getBoundingClientRect() ?? null)); if (stageRef.current) observer.observe(stageRef.current); return () => observer.disconnect(); }, [mode, file?.url]);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  const layout = useMemo(() => containedLayout(stageRect, mediaSize.width, mediaSize.height), [stageRect, mediaSize]);

  const pickFile = useCallback((nextMode: Mode) => {
    setMode(nextMode); setStatus("idle"); setMessage("يفتح مربع اختيار الملف المحلي…"); setDetections([]); setOcr(null); setTracks([]); setBenchmark(null); setBenchmarkError(""); tracksRef.current = []; nextTrackRef.current = 1; videoHistoryRecordedRef.current = false; setSelected(null); setVideoError(""); setTracking(false);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }, []);
  const onFileChosen = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!picked) { setMessage("لم يتم اختيار ملف."); return; }
    if (mode === "image" && !picked.type.startsWith("image/")) { setMessage("اختر ملف صورة مدعومًا."); return; }
    if (mode === "video" && !picked.type.startsWith("video/")) { setMessage("اختر ملف فيديو مدعومًا."); return; }
    setTracks([]); setBenchmark(null); setBenchmarkError(""); tracksRef.current = []; nextTrackRef.current = 1; videoHistoryRecordedRef.current = false;
    setFile({ name: picked.name, size: picked.size, path: "", url: URL.createObjectURL(picked) }); setMessage(`${picked.name} · ${sizeText(picked.size)}`);
  }, [mode]);

  const analyzeImage = useCallback(async () => {
    const image = imageRef.current;
    if (!image || !file) return;
    setStatus("loading"); setMessage("يحمّل محرك الكشف المحلي على جهازك…"); setDetections([]); setOcr(null);
    try {
      const primary = await detectObjects(image, (progress) => { if (progress.status) setMessage(`محرك YOLOS: ${progress.status}`); });
      setRuntimeDevice(selectedInferenceDevice());
      setStatus("analyzing"); setMessage("يفحص التفاصيل والكائنات البعيدة محليًا…");
      const candidates = primary.length < 5 ? await detectOpenCandidates(image).catch(() => []) : [];
      const merged = mergeDetections([...primary, ...candidates]); setDetections(merged); setSelected(merged[0]?.id ?? null);
      setMessage("يستخرج النصوص العربية والإنجليزية محليًا…");
      const result = await recognizeText(image); setOcr(result); setStatus("complete"); setMessage(`اكتمل التحليل: ${merged.length} كائنات · ${result.words.length} كلمات`);
      void appendHistory({ action: "analysis", mediaKind: "image", fileName: file.name, engine: selectedInferenceDevice(), detectionCount: merged.length, ocrWordCount: result.words.length });
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "تعذر تحليل الصورة محليًا."); }
  }, [appendHistory, file]);

  const processFrame = useCallback(async (force = false) => {
    const video = videoRef.current; const canvas = frameRef.current;
    if (!video || !canvas || frameBusy.current || video.videoWidth === 0) return;
    if (!force && video.currentTime - lastSeen < 1 / analysisRate) return;
    frameBusy.current = true;
    try {
      const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight)); canvas.width = Math.max(1, Math.round(video.videoWidth * scale)); canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) throw new Error("تعذر إنشاء مساحة إطار الفيديو."); context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const { RawImage } = await import("@huggingface/transformers");
      const detected = await detectObjects(RawImage.fromCanvas(canvas)); setRuntimeDevice(selectedInferenceDevice());
      const next = matchTracks(tracksRef.current, detected, nextTrackRef.current, video.currentTime); nextTrackRef.current = next.nextTrackId; setTracks(next.tracked); setLastSeen(video.currentTime); setMessage(`تتبع حي · ${next.tracked.length} مسارات · ${video.currentTime.toFixed(1)}s`);
      if (!videoHistoryRecordedRef.current && file) { videoHistoryRecordedRef.current = true; void appendHistory({ action: "analysis", mediaKind: "video", fileName: file.name, engine: selectedInferenceDevice(), trackCount: next.tracked.length }); }
    } catch (error) { setVideoError(error instanceof Error ? error.message : "تعذر تحليل إطار الفيديو."); setTracking(false); }
    finally { frameBusy.current = false; }
  }, [analysisRate, appendHistory, file, lastSeen]);

  useEffect(() => { if (!tracking) return; const interval = window.setInterval(() => void processFrame(), 250); return () => window.clearInterval(interval); }, [tracking, processFrame]);
  const startTracking = useCallback(async () => { const video = videoRef.current; if (!video) return; setTracking(true); setVideoError(""); await video.play(); void processFrame(true); }, [processFrame]);
  const stopTracking = () => { setTracking(false); videoRef.current?.pause(); };

  const exportResult = async (format: "json" | "csv") => {
    const payload = format === "json" ? JSON.stringify({ application: "Vision Inspector Local AI Desktop", exportedAt: new Date().toISOString(), inferenceDevice: selectedInferenceDevice(), file: file?.name, detections, ocr }, null, 2) : toCsv(detections, ocr);
    const outcome = await window.visionDesktop.saveResult({ name: `vision-inspector-${Date.now()}.${format}`, content: payload, filters: [{ name: format.toUpperCase(), extensions: [format] }] });
    if (outcome.saved) {
      setMessage(`حُفظ ${format.toUpperCase()} محليًا · SHA-256 ${outcome.checksum?.slice(0, 10)}…`);
      void appendHistory({ action: "export", mediaKind: mode, fileName: file?.name ?? "نتيجة محلية", engine: selectedInferenceDevice(), detectionCount: detections.length, trackCount: tracks.length, ocrWordCount: ocr?.words.length ?? 0, exportFormat: format, checksum: outcome.checksum });
    }
  };

  const runBenchmark = useCallback(async () => {
    const image = imageRef.current;
    if (!image || !file || benchmarking) return;
    setBenchmarking(true); setBenchmarkError(""); setMessage("يقيس الاستدلال محليًا على المسارات المتاحة…");
    try {
      const result = await benchmarkObjectDetection(image);
      setBenchmark(result);
      const wasm = result.runs.find((run) => run.device === "wasm");
      const gpu = result.runs.find((run) => run.device === "webgpu");
      if (!result.webgpuAvailable) setMessage(`اكتمل قياس WASM/CPU: ${wasm?.stats.medianMs ?? "—"} ms. WebGPU غير متاح على هذا الجهاز.`);
      else if (gpu?.error) setMessage("أخفق قياس WebGPU؛ راجع تفاصيل الأداء.");
      else setMessage(`اكتملت المقارنة المحلية: WebGPU ${gpu?.stats.medianMs ?? "—"} ms مقابل WASM/CPU ${wasm?.stats.medianMs ?? "—"} ms.`);
    } catch (error) { setBenchmarkError(error instanceof Error ? error.message : "تعذر تشغيل قياس الأداء."); }
    finally { setBenchmarking(false); }
  }, [benchmarking, file]);

  const removeHistoryEntry = useCallback(async (id: string) => { try { await window.visionDesktop.removeHistory(id); setHistory((current) => current.filter((entry) => entry.id !== id)); } catch { setHistoryError("تعذر حذف السجل."); } }, []);
  const clearHistory = useCallback(async () => { if (!window.confirm("هل تريد مسح سجل التحليلات والتصديرات المحلي بالكامل؟")) return; try { await window.visionDesktop.clearHistory(); setHistory([]); setHistoryError(""); } catch { setHistoryError("تعذر مسح السجل المحلي."); } }, []);
  const changeMode = (nextMode: Mode) => { setMode(nextMode); setFile(null); setDetections([]); setTracks([]); setBenchmark(null); setBenchmarkError(""); tracksRef.current = []; nextTrackRef.current = 1; videoHistoryRecordedRef.current = false; setOcr(null); setStatus("idle"); setMessage("اختر ملفًا محليًا لبدء التحليل."); setTracking(false); };
  const deviceName = runtimeDevice === "webgpu" ? "WebGPU / GPU" : "WASM / CPU";
  const deviceState = runtimeDevice === "webgpu" ? "تسريع GPU قيد الاستخدام" : deviceInfo?.hardwareAcceleration ? "GPU متاح عند توافق WebGPU" : "معالجة CPU احتياطية";

  return <div className="desktop-shell"><input ref={fileInputRef} type="file" hidden accept={mode === "image" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/webm,video/quicktime"} onChange={onFileChosen}/>
    <header className="desktop-titlebar"><div className="desktop-brand"><strong>Vision Inspector</strong><span>تحليل محلي · Windows</span></div><div className="desktop-device"><span className={`device-dot ${runtimeDevice === "webgpu" ? "device-dot-ready" : ""}`}/><span>{deviceState}</span><b>{deviceName}</b></div></header>
    <div className="desktop-workspace">
      <aside className="desktop-nav"><div className="nav-caption">مساحة العمل</div><button className={mode === "image" ? "nav-active" : ""} onClick={() => changeMode("image")}><Image size={18}/>تحليل صورة</button><button className={mode === "video" ? "nav-active" : ""} onClick={() => changeMode("video")}><Video size={18}/>تحليل فيديو</button><button onClick={() => { setHistoryOpen(true); void refreshHistory(); }}><FileText size={18}/>السجل المحلي <small className="nav-count">{history.length}</small></button><div className="nav-divider"/><div className="nav-caption">الجهاز</div><div className="engine-card"><Cpu size={17}/><span>المحرك الفعلي</span><strong dir="ltr">{deviceName}</strong><small>{runtimeDevice === "webgpu" ? "WebGPU قيد الاستخدام" : "WASM / CPU"}</small></div><div className="privacy-card"><ShieldCheck size={17}/><p><strong>خصوصية محلية</strong>تبقى ملفاتك على جهازك. يحتاج تنزيل النموذج لأول مرة فقط إلى اتصال.</p></div></aside>
      <main className="desktop-main"><section className="desktop-command"><div><span className="eyebrow">{mode === "image" ? "فحص صورة" : "تتبّع فيديو"}</span><h1>{mode === "image" ? "راجع الصورة بوضوح." : "تتبّع الكائنات في الفيديو."}</h1><p>{mode === "image" ? "كشف الكائنات وOCR والتصدير، مع مربعات مرتبطة بمحتوى الصورة." : "إطارات محلية ومسارات ثابتة ومشغل يحافظ على صوت الفيديو الأصلي."}</p></div><div className="command-actions"><button className="fs-button fs-button-secondary" onClick={() => void pickFile(mode)}><FolderOpen size={16}/>اختيار {mode === "image" ? "صورة" : "فيديو"}</button>{mode === "image" ? <button className="fs-button fs-button-primary" disabled={!file || status === "loading" || status === "analyzing"} onClick={() => void analyzeImage()}>{status === "loading" || status === "analyzing" ? "جارٍ التحليل…" : "حلل الآن"}</button> : <button className="fs-button fs-button-primary" disabled={!file || tracking} onClick={() => void startTracking()}><Play size={16}/>ابدأ التتبع</button>}</div></section>
        <section className="desktop-stage-panel fs-panel"><div className="stage-toolbar"><span className={`fs-status ${status === "error" || videoError ? "status-error" : mode === "video" && tracking ? "fs-status-local" : status === "complete" ? "fs-status-local" : "status-neutral"}`}><Activity size={12}/>{mode === "video" ? tracking ? "TRACKING LIVE" : "TRACKING READY" : status === "complete" ? "ANALYSIS COMPLETE" : "LOCAL READY"}</span><span className="stage-file">{file ? `${file.name} · ${sizeText(file.size)}` : "لا يوجد ملف محدد"}</span><span className="stage-meta" dir="ltr">{mediaSize.width ? `${mediaSize.width} × ${mediaSize.height}` : "—"}</span></div><div ref={stageRef} className="desktop-media-stage">
          {!file && <div className="desktop-empty"><div className="empty-mark">{mode === "image" ? <Image size={34}/> : <Video size={34}/>}</div><h2>{mode === "image" ? "ابدأ بصورة من جهازك" : "ابدأ بفيديو من جهازك"}</h2><p>{mode === "image" ? "الصور لا تغادر جهازك، وتظهر نتائج الكشف وOCR هنا." : "يبقى الصوت الأصلي متاحًا في المشغل، بينما يحلل التطبيق الإطارات محليًا."}</p><button className="fs-button fs-button-primary" onClick={() => void pickFile(mode)}><FolderOpen size={16}/>فتح ملف محلي</button></div>}
          {file && mode === "image" && <><img ref={imageRef} src={file.url} alt="الصورة المختارة" className="desktop-media" onLoad={(event) => { const image = event.currentTarget; setMediaSize({ width: image.naturalWidth, height: image.naturalHeight }); setStageRect(stageRef.current?.getBoundingClientRect() ?? null); }}/>{detections.map((item, index) => <button aria-label={`تفاصيل ${readable(item.label)}`} className="box-hit" key={item.id} style={{ left: layout.left + item.box.x / 100 * layout.width, top: layout.top + item.box.y / 100 * layout.height, width: item.box.width / 100 * layout.width, height: item.box.height / 100 * layout.height }} onClick={() => setSelected(item.id)}><DetectionBox item={item} layout={layout} index={index}/></button>)}</>}
          {file && mode === "video" && <><video ref={videoRef} className="desktop-media" src={file.url} controls playsInline onLoadedMetadata={(event) => { const video = event.currentTarget; setMediaSize({ width: video.videoWidth, height: video.videoHeight }); setVideoDuration(video.duration); setStageRect(stageRef.current?.getBoundingClientRect() ?? null); }} onTimeUpdate={(event) => setVideoTime(event.currentTarget.currentTime)} onEnded={() => setTracking(false)} /><canvas ref={frameRef} className="frame-capture"/>{tracks.map((track, index) => <DetectionBox key={track.trackId} item={track} layout={layout} index={index}/>)}</>}
          {status === "loading" || status === "analyzing" ? <div className="desktop-analysis-overlay"><Loader2 className="spin" size={30}/><strong>{status === "loading" ? "تجهيز نموذج الجهاز…" : "تحليل التفاصيل والنصوص…"}</strong><span>تظهر النتائج الحقيقية حال اكتمال الاستدلال المحلي.</span></div> : null}
        </div><div className="stage-footer"><span><ShieldCheck size={14}/> تحليل محلي · لا تُرسل ملفاتك إلى السحابة</span>{mode === "video" && <span className="timecode" dir="ltr">{videoTime.toFixed(1)} / {videoDuration.toFixed(1)}s</span>}</div></section>
        <section className="desktop-status-line"><Gauge size={16}/><span>{videoError || message}</span><span className="status-runtime"><MonitorCog size={15}/>{deviceInfo?.platform === "win32" ? "Windows" : "Development host"} · {deviceInfo?.arch ?? "x64"}</span></section>
        {mode === "image" && <section className="performance-zone fs-panel"><div className="performance-head"><div><span className="eyebrow">الأداء المحلي</span><h2>قارن محركات الاستدلال</h2><p>ثلاث تكرارات بعد إحماء منفصل. لا تُعرض نتيجة WebGPU إلا إذا كان متاحًا فعليًا.</p></div><BarChart3 size={19}/></div>{benchmark ? <div className="benchmark-results">{benchmark.runs.map((run) => <div className="benchmark-run" key={run.device}><span>{run.device === "webgpu" ? "WebGPU" : "WASM / CPU"}</span>{run.error ? <b className="benchmark-error">غير متاح</b> : <b dir="ltr">{run.stats.medianMs ?? "—"} ms</b>}<small dir="ltr">warm-up {run.warmupMs ?? "—"} ms · {benchmark.iterations} runs</small></div>)}<p className="benchmark-note">{benchmark.comparison.improvementPercent === null ? "لا توجد مقارنة GPU قابلة للقياس على هذا الجهاز." : benchmark.comparison.improvementPercent >= 0 ? `WebGPU أسرع بنسبة ${benchmark.comparison.improvementPercent}% مقارنةً بـWASM/CPU.` : `WASM/CPU أسرع بنسبة ${Math.abs(benchmark.comparison.improvementPercent)}% في هذا القياس.`}</p></div> : <p className="benchmark-empty">اختر صورة محلية ثم شغّل المقارنة. لا تحفظ الأداة أي نسخة من الصورة.</p>}{benchmarkError && <p className="benchmark-error">{benchmarkError}</p>}<button className="fs-button fs-button-secondary" disabled={!file || status !== "complete" || benchmarking} onClick={() => void runBenchmark()}>{benchmarking ? "جارٍ القياس…" : "تشغيل المقارنة"}</button></section>}
      </main>
      <aside className="desktop-inspector fs-panel"><div className="inspector-head"><div><span className="eyebrow">{mode === "image" ? "النتائج" : "المسارات"}</span><h2>{mode === "image" ? "الكائنات المكتشفة" : "المسارات الحية"}</h2></div><span className="big-count">{mode === "image" ? detections.length : tracks.length}</span></div>{mode === "image" ? <><div className="result-stack">{detections.length ? detections.map((item, index) => <button key={item.id} className={`desktop-result ${selected === item.id ? "desktop-result-active" : ""}`} onClick={() => setSelected(item.id)}><span className={`result-marker ${item.isUnknown ? "marker-tentative" : ""}`}/><span><strong>{item.isUnknown && item.label !== "unknown" ? `مرشح: ${readable(item.label)}` : readable(item.label)}</strong><small>{item.sourceModel}</small></span><b>{item.confidence}%</b><ChevronLeft size={16}/></button>) : <div className="results-placeholder"><FileImage size={23}/><strong>بانتظار نتيجة</strong><span>اختر صورة ثم اضغط «حلل الآن».</span></div>}</div><div className="export-zone"><div><FileText size={17}/><span>التصدير المحلي<small>يتضمن الإحداثيات وحالة المرشح وOCR.</small></span></div><div className="export-buttons"><button className="fs-button fs-button-secondary" disabled={!detections.length} onClick={() => void exportResult("json")}><Download size={14}/>JSON</button><button className="fs-button fs-button-secondary" disabled={!detections.length} onClick={() => void exportResult("csv")}><Download size={14}/>CSV</button></div></div><div className="ocr-zone"><div className="ocr-heading"><ScanText size={17}/><strong>OCR محلي</strong>{ocr && <span>{ocr.confidence}%</span>}</div>{ocr ? <p>{ocr.text || "لم يُعثر على نص قابل للقراءة."}</p> : <p className="muted">سيظهر النص العربي والإنجليزي بعد تحليل الصورة.</p>}</div></> : <><div className="rate-control"><label>معدل تحليل الإطارات</label><select value={analysisRate} onChange={(event) => setAnalysisRate(Number(event.target.value))}><option value={0.5}>إطار كل ثانيتين</option><option value={1}>إطار / ثانية</option><option value={2}>إطاران / ثانية</option></select></div><div className="track-stack">{tracks.length ? tracks.map((track) => <div key={track.trackId} className="desktop-track"><span className="track-number">#{String(track.trackId).padStart(2, "0")}</span><span><strong>{readable(track.label)}</strong><small>{track.sourceModel}</small></span><b>{track.confidence}%</b></div>) : <div className="results-placeholder"><Video size={23}/><strong>بانتظار مسار</strong><span>اختر فيديو ثم ابدأ التتبع.</span></div>}</div><div className="video-controls"><button className="fs-button fs-button-primary" disabled={!file || tracking} onClick={() => void startTracking()}><Play size={15}/>بدء</button><button className="fs-button fs-button-secondary" disabled={!tracking} onClick={stopTracking}><Pause size={15}/>إيقاف</button><span><Volume2 size={15}/>صوت المصدر متاح</span></div></>}</aside>
    </div>
    {historyOpen && <div className="history-scrim" role="presentation" onMouseDown={() => setHistoryOpen(false)}><aside className="history-panel fs-panel" role="dialog" aria-modal="true" aria-label="السجل المحلي" onMouseDown={(event) => event.stopPropagation()}><header className="history-head"><div><span className="eyebrow">بيانات محفوظة على هذا الجهاز</span><h2>السجل المحلي</h2><p>ملخصات التحليل والتصدير فقط. لا تحفظ صورك أو فيديوهاتك أو مساراتها.</p></div><button className="fs-button fs-button-quiet" onClick={() => setHistoryOpen(false)}>إغلاق</button></header>{historyError && <p className="history-error">{historyError}</p>}<div className="history-list">{history.length ? history.map((entry) => <article key={entry.id} className="history-entry"><div className="history-entry-main"><div><strong>{entry.fileName}</strong><span>{entry.action === "analysis" ? "تحليل" : `تصدير ${entry.exportFormat?.toUpperCase()}`}</span></div><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString("ar-IQ")}</time></div><p><b dir="ltr">{entry.engine === "webgpu" ? "WebGPU" : "WASM / CPU"}</b><span>{entry.mediaKind === "image" ? "صورة" : "فيديو"}</span>{entry.action === "analysis" ? <span>{entry.mediaKind === "image" ? `${entry.detectionCount ?? 0} كائنات` : `${entry.trackCount ?? 0} مسارات`}</span> : <span dir="ltr">SHA-256 {entry.checksum?.slice(0, 10) ?? "—"}…</span>}</p><button className="fs-button fs-button-quiet history-remove" onClick={() => void removeHistoryEntry(entry.id)}>حذف</button></article>) : <div className="history-empty"><FileText size={22}/><strong>لا توجد عناصر بعد</strong><span>ستظهر هنا ملخصات التحليلات والتصديرات التي تُنجزها محليًا.</span></div>}</div><footer className="history-foot"><span>{history.length} عنصرًا محفوظًا محليًا</span><button className="fs-button fs-button-secondary" disabled={!history.length} onClick={() => void clearHistory()}>مسح السجل</button></footer></aside></div>}
  </div>;
}
