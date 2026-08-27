import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("visionDesktop", {
  pickMedia: (kind: "image" | "video") => ipcRenderer.invoke("vision:pick-media", kind),
  getSmokeMedia: () => ipcRenderer.invoke("vision:smoke-media"),
  saveResult: (request: { name: string; content: string; filters: { name: string; extensions: string[] }[] }) => ipcRenderer.invoke("vision:save-result", request),
  getDevice: () => ipcRenderer.invoke("vision:device"),
});
