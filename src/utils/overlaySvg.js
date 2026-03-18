import { WIDTH, HEIGHT, BAND_HEIGHT } from "../constants/render.constants.js";
import {
    escapeXml,
    formatPrice,
    getRouteFontSize,
    getPriceFontSize,
} from "./helpers.js";
import {
    localizeCityName,
    toTurkishUppercase,
} from "./city.js";

export function buildOverlaySvg({
                                    fromCity,
                                    toCity,
                                    price,
                                    currency,
                                    siteText,
                                    pricePrefix,
                                }) {
    const fromLabel = toTurkishUppercase(localizeCityName(fromCity));
    const toLabel = toTurkishUppercase(localizeCityName(toCity));

    const safeFrom = escapeXml(fromLabel);
    const safeTo = escapeXml(toLabel);

    const formattedPrice = formatPrice(price);
    const safePrice = escapeXml(formattedPrice);
    const safeCurrency = escapeXml(currency || "€");
    const safeSite = escapeXml(toTurkishUppercase(siteText || "INVOLATUS.COM"));
    const safePricePrefix = escapeXml(
        toTurkishUppercase(pricePrefix || "Başlayan fiyatlarla")
    );

    const routeFontSize = getRouteFontSize(fromLabel, toLabel);
    const priceFontSize = Math.min(getPriceFontSize(formattedPrice), 98);

    const bandY = HEIGHT - BAND_HEIGHT;
    const rightPad = 28;
    const priceRightX = WIDTH - rightPad;

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

      <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.50)"/>
      </filter>
    </defs>

    <rect x="0" y="0" width="${WIDTH}" height="90" fill="url(#topFade)" />

    <text
      x="${WIDTH / 2}"
      y="34"
      text-anchor="middle"
      fill="#ffffff"
      font-size="18"
      font-family="Arial, Helvetica, sans-serif"
      font-weight="800"
      letter-spacing="1"
      filter="url(#textShadow)"
    >
      ${safeSite}
    </text>

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

    <text
      x="28"
      y="${bandY + 54}"
      fill="#ffffff"
      font-size="${routeFontSize}"
      font-family="Arial Black, Arial, Helvetica, sans-serif"
      font-weight="900"
      letter-spacing="0.5"
      filter="url(#textShadow)"
    >
      ${safeFrom}
    </text>

    <text
      x="28"
      y="${bandY + 124}"
      fill="#ffffff"
      font-size="${routeFontSize}"
      font-family="Arial Black, Arial, Helvetica, sans-serif"
      font-weight="900"
      letter-spacing="0.5"
      filter="url(#textShadow)"
    >
      ${safeTo}
    </text>

    <text
      x="${WIDTH / 2}"
      y="${HEIGHT - 14}"
      text-anchor="middle"
      fill="#ffffff"
      font-size="15"
      font-family="Arial, Helvetica, sans-serif"
      font-weight="800"
      letter-spacing="1"
      filter="url(#textShadow)"
    >
      ${safeSite}
    </text>

    <text
      x="${priceRightX}"
      y="${bandY + 112}"
      text-anchor="end"
      fill="#ffffff"
      font-family="Arial Black, Arial, Helvetica, sans-serif"
      font-weight="900"
      filter="url(#textShadow)"
    >
      <tspan font-size="${priceFontSize}">${safePrice}</tspan>
      <tspan dx="4" font-size="56">${safeCurrency}</tspan>
    </text>

    <text
      x="${priceRightX}"
      y="${bandY + 146}"
      text-anchor="end"
      fill="#ffffff"
      font-size="15"
      font-family="Arial, Helvetica, sans-serif"
      font-weight="700"
      letter-spacing="0.8"
      filter="url(#textShadow)"
    >
      ${safePricePrefix}
    </text>
  </svg>
  `;
}