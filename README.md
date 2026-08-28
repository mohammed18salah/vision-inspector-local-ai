# Vision Inspector Local AI · منظومة الرؤية الحاسوبية والإنقاذ الذكي

> **تم التطوير بواسطة:** **Mohammed Salahuldeen Dev** ([@mohammed18salah](https://github.com/mohammed18salah))  
> **الإصدار:** `v1.3.0` | **الخصوصية:** معالجة محلية 100% (On-Device AI) بدون خوادم خارجية | **الترخيص:** MIT

[![Vercel Deployment](https://img.shields.io/badge/Deployment-Vercel-success?style=flat-square&logo=vercel)](https://vision-inspector-local-ai.vercel.app/)
[![Windows Desktop](https://img.shields.io/badge/Windows-Desktop%20App-0078D4?style=flat-square&logo=windows)](https://github.com/mohammed18salah/vision-inspector-local-ai/releases)
[![WebGPU & WASM](https://img.shields.io/badge/Inference-WebGPU%20%2F%20WASM-blue?style=flat-square)](https://huggingface.co/docs/transformers.js)
[![OCR Tesseract](https://img.shields.io/badge/OCR-Arabic%20%26%20English-green?style=flat-square)](https://github.com/naptha/tesseract.js)

---

## 🌟 نظرة عامة (Overview)

**Vision Inspector Local AI** هي منظومة متقدمة للرؤية الحاسوبية والإنقاذ في حالات الطوارئ والكوارث، تعمل بالكامل محلياً على جهاز المستخدم (Web & Windows Desktop). تم تطويرها لتوفير كشف فوري ودقيق للأشخاص، المركبات، الأجسام، الأفراد المحتجزين تحت الأنقاض، واستخراج النصوص باللغتين العربية والإنجليزية، وتتبع الفيديو مع الحفاظ على الصوت الأصلي، مع ضمان الخصوصية التامة حيث لا تغادر أي صورة أو فيديو حاسوبك.

---

## 🚨 وضع الإنقاذ والبحث في الكوارث (Disaster Search & Rescue Mode)

يتميز الإصدار الحديث بدعم متقدم لفرق الاستجابة السريعة، الدفاع المدني، والباحثين في مجالات الطوارئ:
- **كشف الأشخاص تحت الأنقاض:** فحص متقدم لكشف الضحايا أو الأطراف البشرية الجزئية الظاهرة بين الركام والحطام.
- **مسح متعدد المقاييس (Multi-Scale Tiling Pass):** تقطيع الصورة وفحص التفاصيل الدقيقة للأجسام البعيدة والصغيرة.
- **استدلال محلي في الميدان:** يعمل دون الحاجة إلى أي اتصال بالإنترنت في المناطق المنكوبة بعد التنزيل الأولي للنموذج.

---

## ⚡ الميزات والقدرات الرئيسية (Key Features)

| الميزة / Capability | التفاصيل والتقنيات المستخدمة |
| :--- | :--- |
| **كشف الكائنات الفوري** | نموذج `Xenova/yolos-tiny` عبر Transformers.js v3 و ONNX Runtime Web بتسريع عتادي WebGPU أو WASM. |
| **كشف المرشحين والمفردات المفتوحة** | استدلال بصري صفري `onnx-community/grounding-dino-tiny-ONNX` لكشف الأفراد في الركام والمباني. |
| **استخراج النصوص (OCR)** | محرك Tesseract.js يدعم اللغة العربية والإنجليزية مع إحداثيات الكلمات ومستوى الثقة. |
| **تتبع الفيديو الحي** | تتبع مستقر للكائنات المتحركة عبر الإطارات (Stable Track IDs) مع الحفاظ على الصوت الأصلي. |
| **لوحة تحكم وتكبير تفاعلية** | تكبير (Zoom)، تحريك (Pan)، والتركيز الفوري على الصندوق المحدد مع استعراض الأبعاد. |
| **تصدير التقارير** | تصدير فوري لنتائج التحليل والإحداثيات بصيغ `JSON` و `CSV`. |
| **مقياس الأداء المحلي** | أداة قياس مقارنة مباشرة لسرعة WebGPU مقابل CPU/WASM على عتاد الجهاز. |
| **تطبيق Windows مخصص** | نسخة مكتبية مبنية بـ Electron مع بروتوكول محلي آمن وإدارة سجلات التاريخ المحلي. |

---

## 🏗️ البنية الهندسية (Architecture)

```text
Vision Inspector Local AI
├── Web Client (Vite + React + TailwindCSS)
│   ├── Hugging Face Transformers.js v3 (Local WebGPU / WASM execution)
│   │   ├── Primary: YOLOS Tiny
│   │   └── Zero-Shot / Disaster: Grounding DINO Tiny
│   ├── Tesseract.js (Arabic & English OCR)
│   └── Audio & Canvas Video Frame Tracker
│
├── Desktop App (Electron Windows x64)
│   ├── Native IPC Bridge & Local File Protocols
│   ├── Offline Cache Management (ONNX + Weights)
│   └── Local History & PDF/CSV Export Engine
│
└── Developer: Mohammed Salahuldeen Dev
```

---

## 🚀 التشغيل والتثبيت السريع (Quick Start)

### المتطلبات الأساسية
- **Node.js**: الإصدار 20 أو 22+.
- **pnpm**: الإصدار 9 أو 10.
- متصفح يدعم **WebGPU** (مثل Google Chrome أو Microsoft Edge) للاستفادة من أقصى سرعة على كرت الشاشة.

### 1. تشغيل نسخة الويب محلياً
```bash
# تثبيت الاعتماديات
pnpm install

# تشغيل خادم التطوير
pnpm dev
```
افتح الرابط في المتصفح `http://localhost:5173`.

### 2. تشغيل تطبيق Windows Desktop من المصدر
```bash
pnpm desktop:dev
```

### 3. بناء حزمة التثبيت لنظام Windows (.exe)
```bash
pnpm desktop:pack:win
```
سيتم إنشاء ملف التثبيت المكتبي في مجلد `release/`.

---

## 🧪 الفحص والاختبار (Validation & Testing)

```bash
# تشغيل اختبارات الوحدة الشاملة
pnpm test

# فحص أنواع TypeScript
pnpm check

# بناء حزمة الإنتاج للويب
pnpm build
```

---

## 🌐 النشر على Vercel (Vercel Deployment)

المشروع مهيأ بالكامل للنشر على منصة Vercel عبر ملف `vercel.json`:
- **Framework Preset:** `Vite`
- **Build Command:** `pnpm build`
- **Output Directory:** `dist/public`

تأكد من عدم تعديل مسار الإخراج إلى `dist` حتى لا يتجاوز الخادم الثابت.

---

## 🔒 بيان الخصوصية والأمان (Privacy Manifesto)

- **صفر نقل بيانات:** لا يتم إرسال أي صورة، مقطع فيديو، أو نص مستخرج إلى أي خادم خارجي على الإطلاق.
- **تخزين محلي آمن:** تُخزن أوزان النماذج داخل ذاكرة المتصفح (`IndexedDB / CacheStorage`) لتعمل بدون إنترنت مستقبلاً.
- **إسناد وتطوير:** تم بناء وتطوير هذا النظام لخدمة الإنسانية والبحث العلمي في الرؤية الحاسوبية بواسطة **Mohammed Salahuldeen Dev**.

---

## 👨‍💻 المطور (Developer)

- **الاسم:** **Mohammed Salahuldeen Dev**
- **GitHub:** [@mohammed18salah](https://github.com/mohammed18salah)
- **المستودع:** [vision-inspector-local-ai](https://github.com/mohammed18salah/vision-inspector-local-ai)

---

## 📜 الترخيص (License)

هذا المشروع مرخص بموجب رخصة [MIT](LICENSE).
