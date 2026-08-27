import { env, pipeline, RawImage } from "@huggingface/transformers";
import { matchVideoTracks } from "../client/src/lib/videoTracking.ts";

env.remoteHost = "http://localhost:3000/api/model/";
env.allowRemoteModels = true;
env.useBrowserCache = false;

const detector = await pipeline("object-detection", "Xenova/yolos-tiny", { device: "cpu", dtype: "q8" });
const frames = ["/tmp/vision-webm-frame-01.jpg", "/tmp/vision-webm-frame-02.jpg"];
let tracks = [];
let nextTrackId = 1;

for (const [index, path] of frames.entries()) {
  const image = await RawImage.read(path);
  const output = await detector(image, { threshold: 0.3 });
  const detections = output.map((item, itemIndex) => ({
    id: itemIndex + 1,
    label: item.label,
    confidence: Math.round(item.score * 100),
    box: {
      x: (item.box.xmin / image.width) * 100,
      y: (item.box.ymin / image.height) * 100,
      width: ((item.box.xmax - item.box.xmin) / image.width) * 100,
      height: ((item.box.ymax - item.box.ymin) / image.height) * 100,
    },
    sourceModel: "YOLOS Tiny · local",
    isUnknown: false,
  }));
  const matched = matchVideoTracks(tracks, detections, nextTrackId, 2 + index * 0.5);
  tracks = matched.tracked;
  nextTrackId = matched.nextTrackId;
  console.log(JSON.stringify({ frame: index + 1, tracks: tracks.map(({ trackId, label, confidence }) => ({ trackId, label, confidence })) }, null, 2));
}
