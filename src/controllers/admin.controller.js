import {
    generateNextDraft,
    getContentDetail,
    getContentList,
    publishReviewedPost,
    regenerateDraft,
} from "../services/content.service.js";

function handleError(res, error) {
    return res.status(error?.statusCode || 500).json({
        success: false,
        error: error?.message || "Unexpected error",
    });
}

export async function listPostsController(req, res) {
    try {
        const items = await getContentList({
            status: req.query.status || "all",
        });

        return res.json({
            success: true,
            items,
        });
    } catch (error) {
        return handleError(res, error);
    }
}

export async function getPostDetailController(req, res) {
    try {
        const detail = await getContentDetail(Number(req.params.id));

        return res.json({
            success: true,
            ...detail,
        });
    } catch (error) {
        return handleError(res, error);
    }
}

export async function generateNextDraftController(req, res) {
    try {
        const result = await generateNextDraft({
            triggerSource: "admin_generate",
        });

        return res.json({
            success: true,
            ...result,
        });
    } catch (error) {
        return handleError(res, error);
    }
}

export async function regenerateDraftController(req, res) {
    try {
        const result = await regenerateDraft({
            queueItemId: Number(req.params.id),
            instructions: req.body?.instructions || null,
        });

        return res.json({
            success: true,
            ...result,
        });
    } catch (error) {
        return handleError(res, error);
    }
}

export async function publishPostController(req, res) {
    try {
        const result = await publishReviewedPost({
            queueItemId: Number(req.params.id),
            selectedPlatforms: req.body?.platforms || ["instagram"],
        });

        return res.json({
            success: true,
            ...result,
        });
    } catch (error) {
        return handleError(res, error);
    }
}
