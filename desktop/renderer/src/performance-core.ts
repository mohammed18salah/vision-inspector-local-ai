export type BenchmarkStats = {
  samplesMs: number[];
  medianMs: number | null;
  minMs: number | null;
  maxMs: number | null;
};

export type BenchmarkComparison = {
  baseline: "wasm";
  webgpuMedianMs: number | null;
  wasmMedianMs: number | null;
  improvementPercent: number | null;
};

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function benchmarkStats(samplesMs: number[]): BenchmarkStats {
  return {
    samplesMs,
    medianMs: median(samplesMs),
    minMs: samplesMs.length ? Math.min(...samplesMs) : null,
    maxMs: samplesMs.length ? Math.max(...samplesMs) : null,
  };
}

export function compareToWasm(webgpuMedianMs: number | null, wasmMedianMs: number | null): BenchmarkComparison {
  const improvementPercent = webgpuMedianMs !== null && wasmMedianMs !== null && wasmMedianMs > 0
    ? Math.round((1 - webgpuMedianMs / wasmMedianMs) * 100)
    : null;
  return { baseline: "wasm", webgpuMedianMs, wasmMedianMs, improvementPercent };
}
