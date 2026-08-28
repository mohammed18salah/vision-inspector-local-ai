import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vercel deployment configuration", () => {
  it("publishes only the Vite client and routes API requests to the Express function", () => {
    const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) as {
      outputDirectory?: string;
      rewrites?: Array<{ source: string; destination: string }>;
    };

    expect(config.outputDirectory).toBe("dist/public");
    expect(config.rewrites).toContainEqual({ source: "/api/:path*", destination: "/api" });
    expect(config.rewrites).toContainEqual({ source: "/(.*)", destination: "/index.html" });
    expect(readFileSync(new URL("../client/src/lib/ocr.ts", import.meta.url), "utf8")).toContain('import.meta.env.DEV ? "/api/ocr/" : "/ocr-assets/"');
    expect(readFileSync(new URL("../scripts/copy-ocr-assets.mjs", import.meta.url), "utf8")).toContain('"dist", "public", "ocr-assets"');
  });

  it("exports the API application without starting a listener", () => {
    const handler = readFileSync(new URL("../api/index.ts", import.meta.url), "utf8");
    expect(handler).toContain("export default createApiApp()");
    expect(handler).not.toMatch(/^\s*[A-Za-z_$][\w$]*\.listen\s*\(/m);
  });
});
