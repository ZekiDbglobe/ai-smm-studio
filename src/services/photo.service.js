import { env } from "../config/env.js";
import { buildPhotoSearchQueries } from "../utils/city.js";
import { ConfigurationError, RetryableError } from "../utils/errors.js";

const PEXELS_BASE_URL = "https://api.pexels.com/v1/search";

function ensurePhotoConfiguration() {
    if ((env.PHOTO_PROVIDER || "pexels").toLowerCase() !== "pexels") {
        throw new ConfigurationError(`Unsupported photo provider: ${env.PHOTO_PROVIDER}`);
    }

    if (!env.PHOTO_API_KEY) {
        throw new ConfigurationError("PHOTO_API_KEY is not configured");
    }
}

function buildSearchUrl(query) {
    const url = new URL(PEXELS_BASE_URL);
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "5");
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("locale", "tr-TR");

    return url.toString();
}

function selectBestPhoto(photos = []) {
    return [...photos]
        .filter((photo) => photo?.src?.large2x || photo?.src?.original || photo?.src?.large)
        .sort((left, right) => {
            const leftScore = (left.width || 0) * (left.height || 0);
            const rightScore = (right.width || 0) * (right.height || 0);
            return rightScore - leftScore;
        })[0];
}

export async function fetchDestinationPhoto(flight) {
    ensurePhotoConfiguration();

    const queries = buildPhotoSearchQueries(flight.arrivalCity);

    for (const query of queries) {
        const response = await fetch(buildSearchUrl(query), {
            headers: {
                Authorization: env.PHOTO_API_KEY,
            },
        });

        if (!response.ok) {
            throw new RetryableError(`Pexels search failed with status ${response.status}`);
        }

        const data = await response.json();
        const photo = selectBestPhoto(data?.photos);

        if (!photo) {
            continue;
        }

        const imageUrl = photo.src.large2x || photo.src.original || photo.src.large;

        return {
            imageUrl,
            credit: {
                photographer: photo.photographer,
                photographerUrl: photo.photographer_url,
                photoPageUrl: photo.url,
                pexelsUrl: "https://www.pexels.com",
                query,
            },
            rawPayload: photo,
        };
    }

    throw new RetryableError(`No destination photo found for ${flight.displayArrivalCity}`);
}
