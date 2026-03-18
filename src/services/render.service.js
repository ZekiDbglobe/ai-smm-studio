import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { WIDTH, HEIGHT, BAND_HEIGHT } from "../constants/render.constants.js";
import { buildOverlaySvg } from "../utils/overlaySvg.js";
import { getCurrencySymbol } from "../utils/city.js";

const logoPath = path.join(process.cwd(), "assets", "logo.png");
const heartSvgPath = path.join(process.cwd(), "assets", "kalp-white.svg");

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

    const logoBuffer = await getLogoBuffer();
    const heartBuffer = await getHeartBuffer();

    const overlaySvg = buildOverlaySvg({
        fromCity,
        toCity,
        price,
        currency: getCurrencySymbol(currency),
        siteText,
        pricePrefix,
    });

    const heartWidth = 190;
    const heartHeight = 72;
    const heartLeft = Math.round(WIDTH / 2 - heartWidth / 2);
    const heartTop = HEIGHT - BAND_HEIGHT + 42;

    return sharp(resizedBackground)
        .composite([
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
        ])
        .jpeg({
            quality: 92,
            mozjpeg: true,
        })
        .toBuffer();
}