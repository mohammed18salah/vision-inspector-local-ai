/*
 * Vision Inspector Local AI — Apple-Grade About & System Information Modal
 * Designed with Apple macOS / iOS Sheet aesthetics: clean typography, hairline borders, inset grouped cards.
 */
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  ShieldCheck,
  Zap,
  Activity,
  HeartHandshake,
  Lock,
  Download,
  Github,
  Code2,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  Flame,
} from "lucide-react";

interface AboutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ModalAppleMark() {
  return (
    <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
      <div className="w-6 h-6 border border-white/80 rounded-lg relative flex items-center justify-center">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      </div>
    </div>
  );
}

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-2xl shadow-2xl rounded-3xl"
        dir="rtl"
      >
        <DialogTitle className="sr-only">حول منصة Vision Inspector Local AI</DialogTitle>

        {/* Apple Style Header */}
        <div className="pt-8 pb-6 px-7 sm:px-9 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-start gap-4">
            <ModalAppleMark />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Vision Inspector Local AI
                </h2>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                  v1.3.0 · Apple Design Edition
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                منظومة الرؤية الحاسوبية والذكاء الاصطناعي المحلي — كشف الكائنات، وتتبع الفيديو، واستخراج النصوص، والبحث في الكوارث بدون أي خوادم سحابية.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-7 sm:p-9 space-y-6">
          {/* Disaster Search & Rescue Mission Card */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <Flame className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                تطبيق مخصص لعمليات البحث والإنقاذ في الكوارث (Search & Rescue)
              </h3>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/70 leading-relaxed">
                مزودة بنظام مسح متعدد المقاييس (Multi-Scale Vision Scanning) وخوارزميات Zero-Shot متقدمة لكشف الأشخاص والأطراف البشرية المحتجزة تحت ركام المباني وحالات الطوارئ الميدانية في البيئات المنكوبة بدون إنترنت.
              </p>
            </div>
          </div>

          {/* Inset Grouped Feature List (Apple Style) */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 font-semibold">
              SYSTEM CAPABILITIES · القدرات والخصائص
            </span>
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5 bg-slate-50/40 dark:bg-white/[0.015] overflow-hidden">
              <div className="p-3.5 sm:p-4 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <strong className="text-xs font-semibold text-slate-900 dark:text-white block">
                    معالجة محلية 100% (Zero Cloud Leakage)
                  </strong>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    لا تغادر أي صورة أو مقطع فيديو أو نص جهازك نهائياً؛ جميع التنسورات والاستدلالات تتم داخل المتصفح وكرت الشاشة محلياً.
                  </p>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <strong className="text-xs font-semibold text-slate-900 dark:text-white block">
                    تسريع عتادي WebGPU و WASM فائق السرعة
                  </strong>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    استفادة مباشرة من قوة كرت الشاشة عبر واجهات WebGPU الحديثة، مع نظام WASM/CPU احتياطي للعمل الفوري على أي نظام.
                  </p>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                  <Code2 className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <strong className="text-xs font-semibold text-slate-900 dark:text-white block">
                    استخراج النصوص الذكي (Arabic & English OCR)
                  </strong>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    محرك Tesseract.js مدمج لاستخراج النصوص العربية والإنجليزية مع إحداثيات الكلمات بدقة وسرعة عالية.
                  </p>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <strong className="text-xs font-semibold text-slate-900 dark:text-white block">
                    تتبع الفيديو الحي وحفظ الصوت الأصلي
                  </strong>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    تتبع مستمر لمسارات الأجسام عبر إطارات الفيديو بمعرفات مستقرة (Stable Track IDs) مع بقاء صوت الفيديو فعالاً.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Model Architecture Stack */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 font-semibold">
              ARCHITECTURE · النماذج والمكتبات
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 block">YOLOS Tiny</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">كشف كائنات بصري</span>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 block">Grounding DINO</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">كشف إنقاذ مفتوح</span>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 block">Tesseract v7</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">OCR عربي وإنجليزي</span>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 block">ONNX Web</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">تسريع WebGPU</span>
              </div>
            </div>
          </div>

          {/* Developer Attribution Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white border border-slate-800 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/30 shrink-0">
                MS
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">Mohammed Salahuldeen Dev</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-medium">مطور المنظومة</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  مهندس ومطور المشروع · الرؤية الحاسوبية والذكاء الاصطناعي
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <a
                href="https://github.com/mohammed18salah/vision-inspector-local-ai"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/15 text-white transition-all flex-1 sm:flex-initial"
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub</span>
              </a>
              <a
                href="https://github.com/mohammed18salah/vision-inspector-local-ai/releases"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all flex-1 sm:flex-initial shadow-md shadow-blue-600/30"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تطبيق Windows</span>
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
