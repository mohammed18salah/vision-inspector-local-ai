import { createWorker } from 'tesseract.js';

const worker = await createWorker(['eng', 'ara'], undefined, {
  logger: (message) => {
    if (typeof message.progress === 'number') {
      console.log(`${message.status}: ${Math.round(message.progress * 100)}%`);
    }
  },
});

const result = await worker.recognize('/home/ubuntu/webdev-static-assets/vision-inspector-reference.jpg');
console.log(JSON.stringify({ text: result.data.text.trim(), confidence: result.data.confidence }, null, 2));
await worker.terminate();
