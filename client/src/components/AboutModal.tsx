import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Zap,
  Activity,
  HeartHandshake,
  Lock,
  Download,
  Github,
  Code2,
  Layers,
  Sparkles,
} from "lucide-react";

interface AboutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto p-0 border-border bg-card/95 backdrop-blur-2xl shadow-2xl rounded-2xl" dir="rtl">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden p-6 sm:p-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white rounded-t-2xl">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-none text-xs backdrop-blur-md px-3 py-1">
                <Sparkles className="w-3.5 h-3.5 ml-1.5 inline" /> الإصدار 1.3.0 المطور
              </Badge>
              <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400/40 text-xs px-3 py-1">
                <ShieldCheck className="w-3.5 h-3.5 ml-1.5 inline" /> معالجة محلية 100% (Offline-First)
              </Badge>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 text-white">
              Vision Inspector Local AI
            </h2>
            <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed max-w-2xl">
              منظومة الرؤية الحاسوبية والذكاء الاصطناعي المحلي — كشف وتحليل الكائنات، واستخراج النصوص، والبحث والإنقاذ الذكي في الكوارث والبيئات المعقدة.
            </p>

            <div className="pt-2 flex items-center gap-2 text-xs text-blue-200/80">
              <span>تم التطوير بواسطة:</span>
              <span className="font-bold text-white bg-white/15 px-2.5 py-0.5 rounded-full">
                Mohammed Salahuldeen Dev
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 text-foreground">
          {/* Mission & Disaster Rescue Highlight */}
          <div className="p-4 sm:p-5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent flex flex-col sm:flex-row gap-4 items-start">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <span>تطبيق مخصص للبحث والإنقاذ في الكوارث (Disaster Search & Rescue)</span>
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                تم تزويد المنصة بنظام متقدم للمسح متعدد المقاييس (Multi-Scale Vision Scanning) ونماذج Zero-Shot مخصصة لكشف الأفراد والأطراف البشرية المحتجزة جزئياً تحت الأنقاض وركام المباني المنهارة، لمساعدة طواقم الإسعاف والإنقاذ في تحديد المؤشرات الحيوية بسرعة وبدون الحاجة لإنترنت.
              </p>
            </div>
          </div>

          {/* Core Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/60 transition-colors space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Lock className="w-4 h-4" />
                <span>خصوصية مطلقة لا تنازل عنها</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                الصور، مقاطع الفيديو، إطارات التتبع، والنصوص المستخرجة لا تغادر ذاكرة جهازك نهائياً. يتم تنفيذ الاستدلال بالكامل على متصفحك أو حاسوبك المحلي.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/60 transition-colors space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                <Zap className="w-4 h-4" />
                <span>تسريع عتادي WebGPU و WASM</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                استفادة كاملة من كرت الشاشة (GPU) عبر واجهة WebGPU الحديثة، مع نظام استدلال احتياطي على المعالج (WASM/CPU) لضمان العمل على أي جهاز.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/60 transition-colors space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                <Code2 className="w-4 h-4" />
                <span>استخراج نصوص ذكي OCR</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                محرك Tesseract.js مدمج باللغتين العربية والإنجليزية مع إحداثيات الكلمات ومستويات الثقة وتخزين مؤقت للغات.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/60 transition-colors space-y-2">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold text-sm">
                <Activity className="w-4 h-4" />
                <span>تتبع فيديو متعدد الأجسام</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                تتبع كائنات الفيديو عبر الإطارات بمعرفات ثابتة (Stable Track IDs) وحسابات تقاطع الصناديق (IoU) مع الحفاظ على الصوت الأصلي للفيديو.
              </p>
            </div>
          </div>

          {/* Technology Stack */}
          <div className="space-y-3 pt-2">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <Layers className="w-4 h-4 text-primary" />
              <span>النماذج والتقنيات المستخدمة</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg border border-border/60 bg-background text-center">
                <div className="font-bold text-foreground">YOLOS Tiny</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">كشف كائنات بصري (ViT)</div>
              </div>
              <div className="p-2.5 rounded-lg border border-border/60 bg-background text-center">
                <div className="font-bold text-foreground">Grounding DINO</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">كشف مفتوح وكوارث</div>
              </div>
              <div className="p-2.5 rounded-lg border border-border/60 bg-background text-center">
                <div className="font-bold text-foreground">Tesseract.js</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">OCR عربي وإنجليزي</div>
              </div>
              <div className="p-2.5 rounded-lg border border-border/60 bg-background text-center">
                <div className="font-bold text-foreground">ONNX Runtime</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">تسريع WebGPU/WASM</div>
              </div>
            </div>
          </div>

          {/* Developer Attribution Card */}
          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-lg shadow-blue-500/30">
                MS
              </div>
              <div>
                <div className="font-bold text-sm text-white">Mohammed Salahuldeen Dev</div>
                <div className="text-xs text-slate-400">مهندس ومطور المشروع · الرؤية الحاسوبية والذكاء الاصطناعي</div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href="https://github.com/mohammed18salah/vision-inspector-local-ai"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors flex-1 sm:flex-initial"
              >
                <Github className="w-3.5 h-3.5" />
                GitHub
              </a>
              <a
                href="https://github.com/mohammed18salah/vision-inspector-local-ai/releases"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors flex-1 sm:flex-initial"
              >
                <Download className="w-3.5 h-3.5" />
                نسخة Windows
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
