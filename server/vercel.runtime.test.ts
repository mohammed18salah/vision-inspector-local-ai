import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import vercelHandler from "../api/index";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe("Vercel API function", () => {
  it("runs as an Express handler and preserves the ONNX asset allowlist", async () => {
    const server = createServer(vercelHandler);
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind a TCP port");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/ort/not-allowed.wasm`);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "ONNX Runtime asset is not allowed" });
  });
});
