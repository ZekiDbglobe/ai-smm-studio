import { env } from "../config/env.js";
import { buildCompactHashtag } from "../utils/city.js";
import { formatTurkishDate } from "../utils/date.js";

const DEFAULT_MODEL = "gemini-2.5-flash";

function buildCaptionSchema() {
    return {
        type: "OBJECT",
        properties: {
            caption: {
                type: "STRING",
                description: "2-3 cümlelik Türkçe Instagram açıklaması.",
            },
            hashtags: {
                type: "ARRAY",
                items: {
                    type: "STRING",
                },
                description: "8-12 adet benzersiz hashtag.",
            },
        },
        required: ["caption", "hashtags"],
    };
}

function uniqueHashtags(hashtags = []) {
    return [...new Set(hashtags.map((tag) => String(tag || "").trim()).filter(Boolean))];
}

function ensureHashtagPrefix(tag) {
    if (!tag) {
        return null;
    }

    return tag.startsWith("#") ? tag : `#${tag}`;
}

export function buildFallbackHashtags(flight) {
    const routeTags = [
        buildCompactHashtag(flight.displayDepartureCity),
        buildCompactHashtag(flight.displayArrivalCity),
    ]
        .filter(Boolean)
        .map((tag) => `#${tag}`);

    return uniqueHashtags([
        "#ucakbileti",
        "#ucusfirsati",
        "#seyahat",
        "#gezgin",
        "#tatilfirsati",
        "#uygunfiyat",
        "#ucuzucakbileti",
        "#involatus",
        ...routeTags,
    ]);
}

export function buildFallbackCaption(flight) {
    const formattedDate = formatTurkishDate(flight.travelDate, env.APP_TIMEZONE);
    const flightDateText = formattedDate ? ` ${formattedDate} tarihli uçuş için` : "";
    const caption = [
        `${flight.displayDepartureCity} çıkışlı ${flight.displayArrivalCity} uçuşlarında${flightDateText} ${flight.price} ${flight.currencySymbol}'den başlayan fiyatlar öne çıkıyor.`,
        `${flight.displayArrivalCity} için bu haftanın en dikkat çeken fırsatlarından birini kaçırmamak için planını erkenden yapabilirsin.`,
        flight.bookingUrl ? `Detaylar: ${flight.bookingUrl}` : null,
    ]
        .filter(Boolean)
        .join(" ");

    return `${caption}\n\n${buildFallbackHashtags(flight).join(" ")}`;
}

export function normalizeCaptionPayload(payload, flight) {
    const caption = String(payload?.caption || "").trim();
    const hashtags = uniqueHashtags(payload?.hashtags || [])
        .map(ensureHashtagPrefix)
        .filter(Boolean);

    if (!caption || !hashtags.length) {
        return buildFallbackCaption(flight);
    }

    return `${caption}\n\n${hashtags.join(" ")}`;
}

function extractCandidateText(responseData) {
    return responseData?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || "")
        .join("")
        .trim();
}

export async function generateTurkishCaption(flight, photo, { instructions = null } = {}) {
    if (!env.GOOGLE_API_KEY) {
        return {
            caption: buildFallbackCaption(flight),
            usedFallback: true,
            provider: "fallback",
        };
    }

    try {
        const prompt = [
            "Sen bir Instagram seyahat içerik editörüsün.",
            "Türkçe yaz.",
            "Marka adı INVOLATUS.COM.",
            "Aşağıdaki uçuş için en fazla 3 cümlelik sıcak, net ve satış odaklı bir açıklama üret.",
            "Fırsat hissi ver ama abartılı vaatlerde bulunma.",
            "Hashtag'ler kısa, doğal ve benzersiz olsun.",
            `Kalkış şehri: ${flight.displayDepartureCity}`,
            `Varış şehri: ${flight.displayArrivalCity}`,
            `Fiyat: ${flight.price} ${flight.currencySymbol}`,
            flight.travelDate ? `Uçuş tarihi: ${formatTurkishDate(flight.travelDate, env.APP_TIMEZONE)}` : null,
            flight.bookingUrl ? `Rezervasyon linki: ${flight.bookingUrl}` : null,
            instructions ? `Marketing geri bildirimi: ${instructions}` : null,
        ]
            .filter(Boolean)
            .join("\n");

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${env.GOOGLE_MODEL || DEFAULT_MODEL}:generateContent`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": env.GOOGLE_API_KEY,
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [
                            {
                                text: "Yalnızca geçerli JSON döndür. caption alanı Türkçe açıklama, hashtags alanı hashtag dizisi olmalı.",
                            },
                        ],
                    },
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: prompt }],
                        },
                    ],
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: buildCaptionSchema(),
                        temperature: 0.8,
                    },
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Gemini request failed with status ${response.status}`);
        }

        const candidateText = extractCandidateText(data);
        const parsed = JSON.parse(candidateText);

        return {
            caption: normalizeCaptionPayload(parsed, flight),
            usedFallback: false,
            provider: "gemini",
            rawResponse: data,
        };
    } catch (error) {
        return {
            caption: buildFallbackCaption(flight),
            usedFallback: true,
            provider: "fallback",
            error: error.message,
        };
    }
}
