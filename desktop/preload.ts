import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("visionDesktop", {
  pickMedia: (kind: "image" | "video") => ipcRenderer.invoke("vision:pick-media", kind),
  getSmokeMedia: () => ipcRenderer.invoke("vision:smoke-media"),
  saveResult: (request: { name: string; content: string; filters: { name: string; extensions: string[] }[] }) => ipcRenderer.invoke("vision:save-result", request),
  getDevice: () => ipcRenderer.invoke("vision:device"),
  listHistory: () => ipcRenderer.invoke("vision:history-list"),
  addHistory: (request: unknown) => ipcRenderer.invoke("vision:history-add", request),
  removeHistory: (id: string) => ipcRenderer.invoke("vision:history-remove", id),
  clearHistory: () => ipcRenderer.invoke("vision:history-clear"),
  exportHistory: (format: "csv" | "pdf", entries: unknown) => ipcRenderer.invoke("vision:history-export", format, entries),
});
