// Match the centered object-fit: cover transform used by the camera feed.
export function projectVideoPoint(point, videoWidth, videoHeight, width, height, mirrored) {
  if (!videoWidth || !videoHeight) {
    return { x: (mirrored ? 1 - point.x : point.x) * width, y: point.y * height };
  }
  const scale = Math.max(width / videoWidth, height / videoHeight);
  const renderedWidth = videoWidth * scale;
  const renderedHeight = videoHeight * scale;
  const x = point.x * renderedWidth + (width - renderedWidth) / 2;
  return {
    x: mirrored ? width - x : x,
    y: point.y * renderedHeight + (height - renderedHeight) / 2,
  };
}
