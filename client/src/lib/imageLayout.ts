export type ImageLayout = { width: number; height: number; left: number; top: number };
export type NormalizedBox = { x: number; y: number; width: number; height: number };

export function getContainedImageLayout(containerWidth: number, containerHeight: number, imageWidth: number, imageHeight: number): ImageLayout {
  const imageRatio = imageWidth / imageHeight;
  const containerRatio = containerWidth / containerHeight;
  const width = imageRatio > containerRatio ? containerWidth : containerHeight * imageRatio;
  const height = imageRatio > containerRatio ? containerWidth / imageRatio : containerHeight;
  return { width, height, left: (containerWidth - width) / 2, top: (containerHeight - height) / 2 };
}

export function getBoxInImageSpace(box: NormalizedBox, layout: Pick<ImageLayout, "width" | "height">) {
  return {
    left: (box.x / 100) * layout.width,
    top: (box.y / 100) * layout.height,
    width: (box.width / 100) * layout.width,
    height: (box.height / 100) * layout.height,
  };
}
