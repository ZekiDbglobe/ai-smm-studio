import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { WIDTH, HEIGHT, BAND_HEIGHT } from "../constants/render.constants.js";
import { buildOverlaySvg } from "../utils/overlaySvg.js";
import {
    localizeCityName,
    toTurkishUppercase,
    getCurrencySymbol,
} from "../utils/city.js";
import {
    formatPrice,
    getRouteFontSize,
    getPriceFontSize,
} from "../utils/helpers.js";

const logoPath = path.join(process.cwd(), "assets", "logo.png");
const heartSvgPath = path.join(process.cwd(), "assets", "kalp-white.svg");
const regularFontPath = path.join(process.cwd(), "assets", "NotoSans-Regular.ttf");
const boldFontPath = path.join(process.cwd(), "assets", "NotoSans-Bold.ttf");

async function getLogoBuffer() {
    await fs.access(logoPath);

    return sharp(logoPath)
        .resize({ width: 210, withoutEnlargement: true })
        .png()
        .toBuffer();
}

async function getHeartBuffer() {
    await fs.access(heartSvgPath);

    return sharp(heartSvgPath)
        .resize({
            width: 190,
            height: 72,
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
            withoutEnlargement: false,
        })
        .png()
        .toBuffer();
}

async function downloadImage(url) {
    const response = await fetch(url, {
        headers: {
            "User-Agent": "instagram-renderer/1.0",
        },
    });

    if (!response.ok) {
        throw new Error(`Could not download background image: ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
}

function shadowSvg(width, height, blur = 4, opacity = 0.45) {
    return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="${blur}" flood-color="rgba(0,0,0,${opacity})"/>
      </filter>
      <rect x="0" y="0" width="${width}" height="${height}" fill="transparent" filter="url(#shadow)"/>
    </svg>
  `);
}

function makeTextLayer({
                           text,
                           fontfile,
                           font,
                           fontSize,
                           width,
                           height,
                           align = "left",
                           rgba = true,
                       }) {
    return {
        input: {
            text: {
                text: String(text ?? ""),
                fontfile,
                font,
                width,
                height,
                align,
                rgba,
                dpi: 300,
            },
        },
        fontSize,
    };
}

export async function renderInstagramCard({
                                              backgroundImageUrl,
                                              fromCity,
                                              toCity,
                                              price,
                                              currency = "€",
                                              siteText = "INVOLATUS.COM",
                                              pricePrefix = "Başlayan fiyatlarla",
                                          }) {
    const backgroundBuffer = await downloadImage(backgroundImageUrl);

    const resizedBackground = await sharp(backgroundBuffer)
        .resize(WIDTH, HEIGHT, {
            fit: "cover",
            position: "centre",
        })
        .jpeg({ quality: 95 })
        .toBuffer();

    const [logoBuffer, heartBuffer] = await Promise.all([
        getLogoBuffer(),
        getHeartBuffer(),
    ]);

    const overlaySvg = buildOverlaySvg();

    const fromLabel = toTurkishUppercase(localizeCityName(fromCity));
    const toLabel = toTurkishUppercase(localizeCityName(toCity));
    const siteLabel = toTurkishUppercase(siteText || "INVOLATUS.COM");
    const priceLabel = toTurkishUppercase(pricePrefix || "Başlayan fiyatlarla");

    const formattedPrice = formatPrice(price);
    const currencySymbol = getCurrencySymbol(currency);

    const routeFontSize = getRouteFontSize(fromLabel, toLabel);
    const priceFontSize = Math.min(getPriceFontSize(formattedPrice), 98);

    const bandY = HEIGHT - BAND_HEIGHT;
    const rightPad = 28;

    const heartWidth = 190;
    const heartHeight = 72;
    const heartLeft = Math.round(WIDTH / 2 - heartWidth / 2);
    const heartTop = HEIGHT - BAND_HEIGHT + 42;

    const composites = [
        {
            input: Buffer.from(overlaySvg),
            top: 0,
            left: 0,
        },
        {
            input: logoBuffer,
            top: 18,
            left: 18,
        },
        {
            input: heartBuffer,
            top: heartTop,
            left: heartLeft,
        },

        // top site text
        {
            input: {
                text: {
                    text: siteLabel,
                    fontfile: boldFontPath,
                    font: "Noto Sans Bold",
                    width: 700,
                    height: 40,
                    align: "center",
                    rgba: true,
                    dpi: 300,
                },
            },
            top: 14,
            left: Math.round(WIDTH / 2 - 350),
        },

        // from city
        {
            input: {
                text: {
                    text: fromLabel,
                    fontfile: boldFontPath,
                    font: "Noto Sans Bold",
                    width: 420,
                    height: 50,
                    align: "left",
                    rgba: true,
                    dpi: 300,
                },
            },
            top: bandY + 16,
            left: 28,
        },

        // to city
        {
            input: {
                text: {
                    text: toLabel,
                    fontfile: boldFontPath,
                    font: "Noto Sans Bold",
                    width: 420,
                    height: 50,
                    align: "left",
                    rgba: true,
                    dpi: 300,
                },
            },
            top: bandY + 86,
            left: 28,
        },

        // bottom site text
        {
            input: {
                text: {
                    text: siteLabel,
                    fontfile: boldFontPath,
                    font: "Noto Sans Bold",
                    width: 420,
                    height: 28,
                    align: "center",
                    rgba: true,
                    dpi: 300,
                },
            },
            top: HEIGHT - 30,
            left: Math.round(WIDTH / 2 - 210),
        },

        // price
        {
            input: {
                text: {
                    text: `${formattedPrice}${currencySymbol}`,
                    fontfile: boldFontPath,
                    font: "Noto Sans Bold",
                    width: 260,
                    height: 80,
                    align: "right",
                    rgba: true,
                    dpi: 300,
                },
            },
            top: bandY + 42,
            left: WIDTH - rightPad - 260,
        },

        // price label
        {
            input: {
                text: {
                    text: priceLabel,
                    fontfile: regularFontPath,
                    font: "Noto Sans Regular",
                    width: 260,
                    height: 24,
                    align: "right",
                    rgba: true,
                    dpi: 300,
                },
            },
            top: bandY + 126,
            left: WIDTH - rightPad - 260,
        },
    ];

    const rendered = await sharp(resizedBackground)
        .composite(
            composites.map((entry) => {
                if (entry.input?.text?.text === fromLabel) {
                    entry.input.text.font = "Noto Sans Bold";
                }
                return entry;
            })
        )
        .jpeg({
            quality: 92,
            mozjpeg: true,
        })
        .toBuffer();

    return rendered;
}