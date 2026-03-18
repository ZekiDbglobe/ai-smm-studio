import { supabase } from "../config/supabase.js";
import { buildQueueRows, loadFlightsFromFile, selectFlightsForQueue } from "./flights.service.js";
import { ConfigurationError, RetryableError } from "../utils/errors.js";

function wrapSupabaseError(error, message) {
    if (!error) {
        return null;
    }

    return new RetryableError(`${message}: ${error.message}`, { cause: error });
}

export async function fetchQueueByWeek(weekKey) {
    const { data, error } = await supabase
        .from("instagram_post_queue")
        .select("*")
        .eq("week_key", weekKey)
        .order("position", { ascending: true });

    if (error) {
        throw wrapSupabaseError(error, "Failed to load queue");
    }

    return data || [];
}

export async function listQueueItems({ status = "all", limit = 50 } = {}) {
    let query = supabase
        .from("instagram_post_queue")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(limit);

    if (status && status !== "all") {
        query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
        throw wrapSupabaseError(error, "Failed to list queue items");
    }

    return data || [];
}

export async function fetchQueueItemById(id) {
    const { data, error } = await supabase
        .from("instagram_post_queue")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        throw wrapSupabaseError(error, "Failed to load queue item");
    }

    return data || null;
}

export async function fetchQueueItemRevisions(queueItemId) {
    const { data, error } = await supabase
        .from("instagram_post_revisions")
        .select("*")
        .eq("queue_item_id", queueItemId)
        .order("revision_number", { ascending: false });

    if (error) {
        throw wrapSupabaseError(error, "Failed to load queue revisions");
    }

    return data || [];
}

export async function ensureWeeklyQueue(weekKey) {
    const existingQueue = await fetchQueueByWeek(weekKey);

    if (existingQueue.length) {
        return existingQueue;
    }

    const flights = await loadFlightsFromFile();
    const selectedFlights = selectFlightsForQueue(flights, 7);
    const rows = buildQueueRows(selectedFlights, weekKey);

    if (!rows.length) {
        throw new ConfigurationError("No eligible flights found for the weekly queue");
    }

    const { data, error } = await supabase
        .from("instagram_post_queue")
        .insert(rows)
        .select("*")
        .order("position", { ascending: true });

    if (error) {
        if (error.code === "23505") {
            return fetchQueueByWeek(weekKey);
        }

        throw wrapSupabaseError(error, "Failed to create weekly queue");
    }

    return data || [];
}

export async function claimNextQueueItem(weekKey) {
    const { data, error } = await supabase.rpc("claim_next_instagram_queue_item", {
        p_week_key: weekKey,
    });

    if (error) {
        throw new ConfigurationError(
            `Failed to claim queue item. Run the latest Supabase migrations first: ${error.message}`,
            { cause: error }
        );
    }

    return data || null;
}

export async function createRun({ triggerSource, weekKey }) {
    const { data, error } = await supabase
        .from("instagram_post_runs")
        .insert({
            trigger_source: triggerSource,
            week_key: weekKey,
            status: "started",
        })
        .select()
        .single();

    if (error) {
        throw wrapSupabaseError(error, "Failed to create automation run");
    }

    return data;
}

export async function createRevision({
    queueItemId,
    revisionNumber,
    generationTrigger,
    instructions,
    renderedImageUrl,
    caption,
    photoUrl,
    photoPayload,
    generationPayload,
}) {
    const { data, error } = await supabase
        .from("instagram_post_revisions")
        .insert({
            queue_item_id: queueItemId,
            revision_number: revisionNumber,
            generation_trigger: generationTrigger,
            instructions,
            rendered_image_url: renderedImageUrl,
            caption,
            photo_url: photoUrl,
            photo_payload: photoPayload,
            generation_payload: generationPayload,
        })
        .select()
        .single();

    if (error) {
        throw wrapSupabaseError(error, "Failed to create post revision");
    }

    return data;
}

export async function finishRun(runId, patch) {
    const { error } = await supabase
        .from("instagram_post_runs")
        .update({
            ...patch,
            finished_at: new Date().toISOString(),
        })
        .eq("id", runId);

    if (error) {
        throw wrapSupabaseError(error, "Failed to finish automation run");
    }
}

export async function setQueueItemGenerating(itemId, { instructions = null } = {}) {
    const { error } = await supabase
        .from("instagram_post_queue")
        .update({
            status: "generating",
            processing_started_at: new Date().toISOString(),
            last_generation_instructions: instructions,
            last_error: null,
        })
        .eq("id", itemId);

    if (error) {
        throw wrapSupabaseError(error, "Failed to mark queue item as generating");
    }
}

export async function markQueueItemReview(itemId, patch) {
    const { error } = await supabase
        .from("instagram_post_queue")
        .update({
            ...patch,
            status: "review",
            processing_started_at: null,
            generated_at: new Date().toISOString(),
            last_error: null,
        })
        .eq("id", itemId);

    if (error) {
        throw wrapSupabaseError(error, "Failed to move queue item to review");
    }
}

export async function setQueueItemPublishing(itemId, { platforms = ["instagram"] } = {}) {
    const { error } = await supabase
        .from("instagram_post_queue")
        .update({
            status: "publishing",
            approved_at: new Date().toISOString(),
            publishing_started_at: new Date().toISOString(),
            selected_platforms: platforms,
            last_error: null,
        })
        .eq("id", itemId);

    if (error) {
        throw wrapSupabaseError(error, "Failed to mark queue item as publishing");
    }
}

export async function markQueueItemPosted(itemId, patch) {
    const { error } = await supabase
        .from("instagram_post_queue")
        .update({
            ...patch,
            status: "posted",
            posted_at: new Date().toISOString(),
            publishing_started_at: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", itemId);

    if (error) {
        throw wrapSupabaseError(error, "Failed to mark queue item as posted");
    }
}

export async function markQueueItemFailed(
    itemId,
    {
        errorMessage,
        patch = {},
        stage = "generation",
    }
) {
    const nextStatus = stage === "generation" ? "generation_failed" : "failed";

    const { error } = await supabase
        .from("instagram_post_queue")
        .update({
            ...patch,
            status: nextStatus,
            last_error: errorMessage,
            processing_started_at: null,
            publishing_started_at: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", itemId);

    if (error) {
        throw wrapSupabaseError(error, "Failed to update failed queue item");
    }
}
