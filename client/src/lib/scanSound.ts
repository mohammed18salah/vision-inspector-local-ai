export type ScanSoundCue = "start" | "pulse" | "detected" | "complete";

let audioContext: AudioContext | null = null;
let soundEnabled = false;

function getContext() {
  if (typeof window === "undefined") return null;
  if (!audioContext) audioContext = new AudioContext();
  return audioContext;
}

export async function setScanSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  const context = getContext();
  if (enabled && context?.state === "suspended") await context.resume();
}

export function playScanSound(cue: ScanSoundCue) {
  if (!soundEnabled) return;
  const context = getContext();
  if (!context || context.state !== "running") return;

  const patterns: Record<ScanSoundCue, { frequency: number; duration: number; volume: number; rise?: number }> = {
    start: { frequency: 320, duration: 0.08, volume: 0.025, rise: 520 },
    pulse: { frequency: 680, duration: 0.035, volume: 0.012, rise: 760 },
    detected: { frequency: 880, duration: 0.06, volume: 0.022, rise: 1060 },
    complete: { frequency: 660, duration: 0.11, volume: 0.026, rise: 990 },
  };
  const pattern = patterns[cue];
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  oscillator.type = cue === "pulse" ? "sine" : "triangle";
  oscillator.frequency.setValueAtTime(pattern.frequency, now);
  if (pattern.rise) oscillator.frequency.exponentialRampToValueAtTime(pattern.rise, now + pattern.duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(pattern.volume, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + pattern.duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + pattern.duration + 0.02);
}
