import { env, pipeline, RawImage } from "@huggingface/transformers";

env.remoteHost = "http://localhost:3000/api/model/";
env.allowRemoteModels = true;
env.useBrowserCache = false;
const detector = await pipeline("object-detection", "Xenova/yolos-tiny", { device: "cpu", dtype: "q8" });
const image = await RawImage.read("/home/ubuntu/webdev-static-assets/vision-inspector-reference.jpg");
const result = await detector(image, { threshold: 0.28 });
console.log(JSON.stringify(result.slice(0, 5), null, 2));
