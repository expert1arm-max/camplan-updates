const DEFAULT_TEXT_FONT_SIZE = 16;

export function getTextElementBounds(label?: string, fontSize = DEFAULT_TEXT_FONT_SIZE) {
  const width = Math.max(60, (label?.length ?? 0) * (fontSize * 0.6) + 8);
  const height = Math.max(24, fontSize + 10);
  return { width, height };
}

export { DEFAULT_TEXT_FONT_SIZE };
