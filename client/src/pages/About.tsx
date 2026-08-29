/*
 * Vision Inspector Local AI — About & System Architecture Page
 * Designed in Apple's calm, clean aesthetic: quiet hierarchy, generous whitespace, disciplined monochrome with subtle blue accents.
 * Developed by: Mohammed Salahuldeen Dev
 */
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Download,
  Github,
  Code2,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  Flame,
  FileText,
  Lock,
  Box,
  CheckCircle2,
  Share2,
} from "lucide-react";

function VisionMark() {
  return (
    <div className="apple-mark" aria-hidden="true">
      <span /><span /><span />
    </div>
  );
}

const WINDOWS_DOWNLOAD_URL = "https://github.com/mohammed18salah/vision-inspector-local-ai/releases";
const REPOSITORY_URL = "https://github.com/mohammed18salah/vision-inspector-local-ai";

export default function About() {
  return (
    <div className="vision-app" dir="rtl">
      {/* Header */}
      <header className="apple-header">
        <div className="header-brand">
          <Link href="/" className="flex items-center gap-2.5 text-inherit no-underline">
            <VisionMark />
            <div>
              <strong>Vision Inspector</strong>
              <span>تحليل بصري محلي · ويب وWindows</span>
            </div>
          </Link>
        </div>

        <div className="header-center">
          <span className="privacy-pill">
            <ShieldCheck size={14} />
            <span>معالجة محلية 100% · لا تغادر جهازك</span>
          </span>
        </div>

        <div className="header-actions">
          <Link href="/">
            <Button variant="outline" size="sm" className="about-header-btn gap-1.5">
              <ArrowRight size={14} />
              <span>العودة لمساحة العمل</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="content-shell max-w-4xl mx-auto py-12 px-6">
        {/* Page Intro */}
        <section className="mb-12">
          <p className="section-eyebrow mb-2">
            <span className="eyebrow-dot" /> DOCUMENTATION & ABOUT · حول المنظومة
          </p>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-4 font-display">
            منظومة الرؤية الحاسوبية <span>والإنقاذ الذكي.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-500 leading-relaxed max-w-3xl">
            منصة متقدمة مفتوحة المصدر لمعالجة وتحليل الصور ومقاطع الفيديو محلياً داخل المتصفح وحواسيب Windows، مع دعم متخصص لفرق الإنقاذ في كشف الأفراد تحت الأنقاض واستخراج النصوص OCR دون الاعتماد على أي خوادم خارجية.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <Link href="/">
              <Button className="project-link project-link-primary gap-2">
                <Sparkles size={15} /> فتح مساحة التحليل
              </Button>
            </Link>
            <a href={WINDOWS_DOWNLOAD_URL} target="_blank" rel="noreferrer" className="project-link gap-2">
              <Download size={15} /> تنزيل تطبيق Windows
            </a>
            <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className="project-link gap-2">
              <Github size={15} /> المستودع المفتوح على GitHub
            </a>
          </div>
        </section>

        {/* Section 1: Disaster Search & Rescue */}
        <section className="mb-10 bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Flame size={18} />
            </div>
            <div>
              <span className="card-eyebrow block">HUMANITARIAN MISSION</span>
              <h2 className="text-lg font-bold text-slate-900 m-0">وضع البحث والإنقاذ في الكوارث (Search & Rescue)</h2>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            تم تطوير وضع الإنقاذ خصيصاً للمساعدة في البيئات المعقدة وحالات الطوارئ الميدانية مثل الزلازل وانهيارات المباني والحرائق:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <strong className="text-slate-900 block mb-1">كشف الأفراد تحت الأنقاض</strong>
              <span>استعلامات مخصصة لكشف الأشخاص المحتجزين أو الأطراف البشرية الجزئية الظاهرة بين الركام والحطام.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <strong className="text-slate-900 block mb-1">المسح متعدد المقاييس (Tiling Pass)</strong>
              <span>تقطيع الصور عالية الدقة وفحص التفاصيل الدقيقة للأجسام البعيدة والصغيرة بحساسية عالية.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <strong className="text-slate-900 block mb-1">العمل الميداني بدون إنترنت</strong>
              <span>تعمل المنظومة بالكامل دون اتصال بالإنترنت بعد تحميل النموذج لأول مرة، مما يتيح استخدامها في المناطق المنكوبة.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <strong className="text-slate-900 block mb-1">تصدير التقارير الفورية</strong>
              <span>إمكانية تصدير كافة الإحداثيات والصناديق ونسب الثقة بصيغ JSON و CSV و PDF للمشاركة الميدانية.</span>
            </div>
          </div>
        </section>

        {/* Section 2: Core Architecture Principles */}
        <section className="mb-10 bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers size={18} />
            </div>
            <div>
              <span className="card-eyebrow block">CORE ARCHITECTURE</span>
              <h2 className="text-lg font-bold text-slate-900 m-0">المعمارية التقنية والخصوصية</h2>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
              <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <Lock size={15} />
              </div>
              <div className="space-y-1">
                <strong className="text-sm font-semibold text-slate-900 block">خصوصية معالجة محلية 100% (Zero Cloud Leakage)</strong>
                <p className="text-xs text-slate-500 leading-relaxed m-0">
                  جميع العمليات الحسابية واستخراج التنسورات ونماذج OCR تعمل محلياً داخل ذاكرة المتصفح وعبر بطاقة الرسوميات. لا يتم رفع أي صورة أو فيديو إلى خوادم خارجية.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
              <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <Zap size={15} />
              </div>
              <div className="space-y-1">
                <strong className="text-sm font-semibold text-slate-900 block">استدلال عتادي هجين (WebGPU & WASM)</strong>
                <p className="text-xs text-slate-500 leading-relaxed m-0">
                  استفادة قصوى من بطاقة الرسوميات (GPU) عبر واجهات WebGPU الحديثة، مع نظام WASM/CPU تلقائي لضمان التوافق والأداء المستقر على أي جهاز.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
              <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <Code2 size={15} />
              </div>
              <div className="space-y-1">
                <strong className="text-sm font-semibold text-slate-900 block">استخراج النصوص الذكي (Arabic & English OCR)</strong>
                <p className="text-xs text-slate-500 leading-relaxed m-0">
                  محرك Tesseract.js مدمج لاستخراج النصوص العربية والإنجليزية بالتوازي مع كشف الكائنات، مع تخزين النماذج اللغوية في IndexedDB لمنع إعادة تنزيلها.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <Activity size={15} />
              </div>
              <div className="space-y-1">
                <strong className="text-sm font-semibold text-slate-900 block">تتبع الفيديو الحي مع الحفاظ على الصوت</strong>
                <p className="text-xs text-slate-500 leading-relaxed m-0">
                  تتبع مستمر لمسارات الأجسام عبر الإطارات بمعرفات ثابتة (Stable Track IDs) وحسابات تقاطع الصناديق (IoU) مع إمكانية سماع الصوت الأصلي للفيديو.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Vision Models & Tech Stack */}
        <section className="mb-10 bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Cpu size={18} />
            </div>
            <div>
              <span className="card-eyebrow block">AI MODELS & LIBRARIES</span>
              <h2 className="text-lg font-bold text-slate-900 m-0">النماذج والمكتبات المستخدمة</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between mb-1.5">
                <strong className="text-slate-900 font-mono text-sm">Xenova/yolos-tiny</strong>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-mono">Primary ViT</span>
              </div>
              <p className="text-slate-500 leading-relaxed m-0">
                نموذج محول بصري (Vision Transformer) لكشف 80 فئة كائنات في الوقت الفعلي بسرعة فائقة واستهلاك ذاكرة منخفض.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between mb-1.5">
                <strong className="text-slate-900 font-mono text-sm">Grounding DINO Tiny</strong>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-mono">Zero-Shot / Rescue</span>
              </div>
              <p className="text-slate-500 leading-relaxed m-0">
                نموذج استدلال لغوي-بصري مفتوح المفردات لكشف الأهداف المحددة والأشخاص تحت الأنقاض والمباني والمركبات.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between mb-1.5">
                <strong className="text-slate-900 font-mono text-sm">Tesseract.js v7</strong>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-mono">OCR Engine</span>
              </div>
              <p className="text-slate-500 leading-relaxed m-0">
                محرك التعرّف الضوئي على الحروف باللغتين العربية والإنجليزية مع إحداثيات الصناديق النصية ونسب الثقة.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between mb-1.5">
                <strong className="text-slate-900 font-mono text-sm">ONNX Runtime Web</strong>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-mono">Execution Provider</span>
              </div>
              <p className="text-slate-500 leading-relaxed m-0">
                بيئة تشغيل عالية الأداء تدعم مسرّعات WebGPU ومكتبات WebAssembly SIMD لتنفيذ النماذج على العتاد مباشرة.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Developer Attribution Card */}
        <section className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Code2 size={18} />
            </div>
            <div>
              <span className="card-eyebrow block">PROJECT AUTHOR & CREDITS</span>
              <h2 className="text-lg font-bold text-slate-900 m-0">المطور والمهندس المسؤول</h2>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                MS
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900 m-0">Mohammed Salahuldeen Dev</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-200/60">
                    Lead Developer
                  </span>
                </div>
                <p className="text-xs text-slate-500 m-0">
                  مهندس ومطور المشروع · أبحاث الرؤية الحاسوبية وتطبيقات الذكاء الاصطناعي المحلي
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <a
                href={REPOSITORY_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 transition-all flex-1 sm:flex-initial shadow-2xs"
              >
                <Github size={14} />
                <span>GitHub</span>
              </a>
              <a
                href={WINDOWS_DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all flex-1 sm:flex-initial shadow-xs"
              >
                <Download size={14} />
                <span>تطبيق Windows</span>
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="page-footer">
          <div className="footer-credits">
            <span><ShieldCheck size={14} className="text-emerald-600" /> معالجة محلية خاصة بالكامل</span>
            <span className="text-xs text-slate-500">
              تم التطوير بواسطة: <strong className="text-slate-800">Mohammed Salahuldeen Dev</strong>
            </span>
          </div>
          <span className="mono text-[10px] text-slate-400">
            VISION INSPECTOR LOCAL AI v1.3.0
          </span>
        </footer>
      </main>
    </div>
  );
}
