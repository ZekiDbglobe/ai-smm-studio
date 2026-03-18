import { env } from "../config/env.js";
import { RetryableError } from "../utils/errors.js";

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 7000;

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function parsePublishResponse(rawBody) {
    if (!rawBody) {
        return null;
    }

    try {
        return JSON.parse(rawBody);
    } catch {
        return { rawBody };
    }
}

function isMediaStillProcessing(data) {
    const errorMessage = String(data?.error?.error?.message || "").toLowerCase();
    const userMessage = String(data?.error?.error?.error_user_msg || "").toLowerCase();
    const code = data?.error?.error?.code;
    const subcode = data?.error?.error?.error_subcode;
    const step = data?.step;

    return (
        step === "publish_media"
        && (
            code === 9007
            || subcode === 2207027
            || errorMessage.includes("media id is not available")
            || userMessage.includes("hazır değil")
        )
    );
}

async function sendPublishRequest({ imageUrl, caption }, fetchImpl) {
    const response = await fetchImpl(env.PUBLISH_FUNCTION_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-internal-secret": env.PUBLISH_FUNCTION_SECRET,
        },
        body: JSON.stringify({
            imageUrl,
            caption: caption || "",
        }),
    });

    const rawBody = await response.text();
    const data = parsePublishResponse(rawBody);

    return {
        response,
        data,
    };
}

export async function publishToInstagram(
    { imageUrl, caption },
    {
        fetchImpl = fetch,
        maxAttempts = DEFAULT_MAX_ATTEMPTS,
        retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    } = {}
) {
    if (!env.PUBLISH_FUNCTION_URL || !env.PUBLISH_FUNCTION_SECRET) {
        throw new Error("Missing PUBLISH_FUNCTION_URL or PUBLISH_FUNCTION_SECRET");
    }

    let lastFailure = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const { response, data } = await sendPublishRequest({ imageUrl, caption }, fetchImpl);

        if (response.ok) {
            return data;
        }

        lastFailure = data;

        if (isMediaStillProcessing(data) && attempt < maxAttempts) {
            await sleep(retryDelayMs * attempt);
            continue;
        }

        if (isMediaStillProcessing(data)) {
            throw new RetryableError(`Instagram publish is still processing: ${JSON.stringify(data)}`);
        }

        throw new Error(`Instagram publish failed: ${JSON.stringify(data)}`);
    }

    throw new RetryableError(`Instagram publish is still processing: ${JSON.stringify(lastFailure)}`);
}

export { isMediaStillProcessing, parsePublishResponse };
