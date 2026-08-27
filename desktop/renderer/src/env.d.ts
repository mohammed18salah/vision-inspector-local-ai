export {};

declare global {
  interface Window {
    visionDesktop: {
      pickMedia(kind: "image" | "video"): Promise<{ name: string; size: number; path: string; url: string } | null>;
      getSmokeMedia(): Promise<{ name: string; size: number; path: string; url: string } | null>;
      saveResult(request: { name: string; content: string; filters: { name: string; extensions: string[] }[] }): Promise<{ saved: boolean; path?: string; checksum?: string }>;
      getDevice(): Promise<{ platform: string; arch: string; appVersion: string; hardwareAcceleration: boolean; gpuFeatures: Record<string, string>; gpuInfo: unknown }>;
    };
  }
}
