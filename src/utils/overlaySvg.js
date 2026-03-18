import { WIDTH, HEIGHT, BAND_HEIGHT } from "../constants/render.constants.js";

export function buildOverlaySvg() {
    const bandY = HEIGHT - BAND_HEIGHT;

    return `
  <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bandGradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgba(124,52,76,0.56)" />
        <stop offset="50%" stop-color="rgba(97,44,67,0.46)" />
        <stop offset="100%" stop-color="rgba(74,34,53,0.56)" />
      </linearGradient>

      <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(0,0,0,0.18)" />
        <stop offset="100%" stop-color="rgba(0,0,0,0)" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" width="${WIDTH}" height="90" fill="url(#topFade)" />

    <rect
      x="0"
      y="${bandY}"
      width="${WIDTH}"
      height="${BAND_HEIGHT}"
      fill="url(#bandGradient)"
    />

    <rect
      x="0"
      y="${bandY}"
      width="${WIDTH}"
      height="${BAND_HEIGHT}"
      fill="rgba(255,255,255,0.04)"
    />
  </svg>
  `;
}