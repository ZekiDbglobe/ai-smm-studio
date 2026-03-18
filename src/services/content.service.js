import { env } from "../config/env.js";
import { ValidationError } from "../utils/errors.js";
import { getIsoWeekKey } from "../utils/date.js";
import { generateTurkishCaption } from "./caption.service.js";
import { fetchDestinationPhoto } from "./photo.service.js";
import { publishToInstagram } from "./publish.service.js";
import {
    claimNextQueueItem,
    createRevision,
    createRun,
    ensureWeeklyQueue,
    fetchQueueItemById,
    fetchQueueItemRevisions,
    finishRun,
    listQueueItems,
    markQueueItemFailed,
    markQueueItemPosted,
    markQueueItemReview,
    setQueueItemGenerating,
    setQueueItemPublishing,
} from "./queue.service.js";
import { renderInstagramCard } from "./render.service.js";
import { uploadToSupabase } from "./storage.service.js";

function normalizePlatforms(platforms = ["instagram"]) {
    const normalized = [...new Set((platforms || ["instagram"]).map((platform) => String(platform).trim().toLowerCase()))];

    if (!normalized.length) {
        return ["instagram"];
    }

    const unsupported = normalized.filter((platform) => platform !== "instagram");

    if (unsupported.length) {
        throw new ValidationError(`Unsupported platforms: ${unsupported.join(", ")}`);
    }

    return normalized;
}

function buildDraftResponse({ queueItem, revision, captionData }) {
    return {
        generated: true,
        posted: false,
        weekKey: queueItem.week_key,
        queueItemId: queueItem.id,
        position: queueItem.position,
        status: "review",
        revisionNumber: revision.revision_number,
        finalImageUrl: queueItem.rendered_image_url,
        caption: queueItem.caption,
        usedFallbackCaption: captionData.usedFallback,
    };
}

async function generateDraftForQueueItem(queueItem, { triggerSource, instructions = null }) {
    const flight = queueItem.flight_payload;
    const photo = await fetchDestinationPhoto(flight);
    const captionData = await generateTurkishCaption(flight, photo, {
        instructions,
    });

    const finalBuffer = await renderInstagramCard({
        backgroundImageUrl: photo.imageUrl,
        fromCity: flight.displayDepartureCity,
        toCity: flight.displayArrivalCity,
        price: flight.price,
        currency: flight.currencySymbol,
        siteText: "INVOLATUS.COM",
        pricePrefix: "Başlayan fiyatlarla",
    });

    const uploadResult = await uploadToSupabase(finalBuffer, {
        fromCity: flight.displayDepartureCity,
        toCity: flight.displayArrivalCity,
    });

    const nextRevisionNumber = Number(queueItem.current_revision || 0) + 1;
    const revision = await createRevision({
        queueItemId: queueItem.id,
        revisionNumber: nextRevisionNumber,
        generationTrigger: triggerSource,
        instructions,
        renderedImageUrl: uploadResult.publicUrl,
        caption: captionData.caption,
        photoUrl: photo.imageUrl,
        photoPayload: {
            credit: photo.credit,
            rawPayload: photo.rawPayload,
        },
        generationPayload: {
            provider: captionData.provider,
            usedFallback: captionData.usedFallback,
            instructions,
        },
    });

    await markQueueItemReview(queueItem.id, {
        current_revision: nextRevisionNumber,
        rendered_image_url: uploadResult.publicUrl,
        caption: captionData.caption,
        photo_url: photo.imageUrl,
        photo_payload: {
            credit: photo.credit,
            rawPayload: photo.rawPayload,
        },
        publish_response: null,
        selected_platforms: ["instagram"],
    });

    const refreshedItem = await fetchQueueItemById(queueItem.id);

    return buildDraftResponse({
        queueItem: refreshedItem,
        revision,
        captionData,
    });
}

export async function generateNextDraft({ triggerSource, now = new Date() }) {
    const weekKey = getIsoWeekKey(now, env.APP_TIMEZONE);
    await ensureWeeklyQueue(weekKey);

    const run = await createRun({
        triggerSource,
        weekKey,
    });

    let queueItem = null;

    try {
        queueItem = await claimNextQueueItem(weekKey);

        if (!queueItem) {
            const skippedResult = {
                generated: false,
                posted: false,
                weekKey,
                reason: "Yeni draft üretilecek uygun post bulunamadı.",
            };

            await finishRun(run.id, {
                status: "skipped",
                result: skippedResult,
            });

            return skippedResult;
        }

        const draftResult = await generateDraftForQueueItem(queueItem, {
            triggerSource,
        });

        await finishRun(run.id, {
            status: "generated",
            queue_item_id: queueItem.id,
            result: draftResult,
        });

        return draftResult;
    } catch (error) {
        if (queueItem?.id) {
            await markQueueItemFailed(queueItem.id, {
                errorMessage: error.message,
                stage: "generation",
            });
        }

        await finishRun(run.id, {
            status: "failed",
            queue_item_id: queueItem?.id || null,
            error: error.message,
            result: {
                generated: false,
                posted: false,
            },
        });

        throw error;
    }
}

export async function regenerateDraft({
    queueItemId,
    instructions = null,
    triggerSource = "admin_regenerate",
}) {
    const queueItem = await fetchQueueItemById(queueItemId);

    if (!queueItem) {
        throw new ValidationError("Queue item not found");
    }

    if (queueItem.status === "posted" || queueItem.status === "publishing") {
        throw new ValidationError("Published or publishing posts cannot be regenerated");
    }

    await setQueueItemGenerating(queueItem.id, {
        instructions,
    });

    const run = await createRun({
        triggerSource,
        weekKey: queueItem.week_key,
    });

    try {
        const refreshed = await fetchQueueItemById(queueItem.id);
        const draftResult = await generateDraftForQueueItem(refreshed, {
            triggerSource,
            instructions,
        });

        await finishRun(run.id, {
            status: "generated",
            queue_item_id: queueItem.id,
            result: draftResult,
        });

        return draftResult;
    } catch (error) {
        await markQueueItemFailed(queueItem.id, {
            errorMessage: error.message,
            stage: "generation",
        });

        await finishRun(run.id, {
            status: "failed",
            queue_item_id: queueItem.id,
            error: error.message,
        });

        throw error;
    }
}

export async function publishReviewedPost({
    queueItemId,
    selectedPlatforms = ["instagram"],
    triggerSource = "admin_publish",
}) {
    const queueItem = await fetchQueueItemById(queueItemId);

    if (!queueItem) {
        throw new ValidationError("Queue item not found");
    }

    if (!queueItem.rendered_image_url || !queueItem.caption) {
        throw new ValidationError("Draft is not ready for publishing");
    }

    if (!["review", "failed"].includes(queueItem.status)) {
        throw new ValidationError("Only reviewed posts can be published");
    }

    const platforms = normalizePlatforms(selectedPlatforms);

    await setQueueItemPublishing(queueItem.id, {
        platforms,
    });

    const run = await createRun({
        triggerSource,
        weekKey: queueItem.week_key,
    });

    try {
        const publishResponse = {};

        if (platforms.includes("instagram")) {
            publishResponse.instagram = await publishToInstagram({
                imageUrl: queueItem.rendered_image_url,
                caption: queueItem.caption,
            });
        }

        const result = {
            posted: true,
            queueItemId: queueItem.id,
            platforms,
            publishResponse,
        };

        await markQueueItemPosted(queueItem.id, {
            publish_response: publishResponse,
            selected_platforms: platforms,
        });

        await finishRun(run.id, {
            status: "posted",
            queue_item_id: queueItem.id,
            result,
        });

        return result;
    } catch (error) {
        await markQueueItemFailed(queueItem.id, {
            errorMessage: error.message,
            stage: "publish",
        });

        await finishRun(run.id, {
            status: "failed",
            queue_item_id: queueItem.id,
            error: error.message,
        });

        throw error;
    }
}

export async function getContentList({ status = "all" } = {}) {
    return listQueueItems({ status });
}

export async function getContentDetail(queueItemId) {
    const queueItem = await fetchQueueItemById(queueItemId);

    if (!queueItem) {
        throw new ValidationError("Queue item not found");
    }

    const revisions = await fetchQueueItemRevisions(queueItemId);

    return {
        item: queueItem,
        revisions,
    };
}
