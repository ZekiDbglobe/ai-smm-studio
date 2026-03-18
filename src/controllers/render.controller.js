import { renderInstagramCard } from "../services/render.service.js";
import { uploadToSupabase } from "../services/storage.service.js";
import { publishToInstagram } from "../services/publish.service.js";
import { isValidHttpUrl } from "../utils/helpers.js";

function validatePayload(body) {
    const {
        backgroundImageUrl,
        fromCity,
        toCity,
        price,
    } = body;

    if (!backgroundImageUrl || !isValidHttpUrl(backgroundImageUrl)) {
        return "backgroundImageUrl is required and must be a public http/https URL";
    }

    if (!fromCity || !toCity) {
        return "fromCity and toCity are required";
    }

    if (price === undefined || price === null || price === "") {
        return "price is required";
    }

    return null;
}

export function healthController(req, res) {
    return res.json({
        success: true,
        message: "instagram-renderer is alive",
    });
}

export async function renderInstagramCardController(req, res) {
    try {
        const validationError = validatePayload(req.body);

        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const {
            backgroundImageUrl,
            fromCity,
            toCity,
            price,
            currency,
            siteText,
            pricePrefix,
        } = req.body;

        const finalBuffer = await renderInstagramCard({
            backgroundImageUrl,
            fromCity,
            toCity,
            price,
            currency,
            siteText,
            pricePrefix,
        });

        const uploadResult = await uploadToSupabase(finalBuffer, {
            fromCity,
            toCity,
        });

        return res.json({
            success: true,
            fileName: uploadResult.fileName,
            publicUrl: uploadResult.publicUrl,
        });
    } catch (error) {
        return res.status(500).json({
            error: error?.message || "Unexpected error",
        });
    }
}

export async function renderAndPublishController(req, res) {
    try {
        const validationError = validatePayload(req.body);

        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const {
            backgroundImageUrl,
            fromCity,
            toCity,
            price,
            currency,
            siteText,
            pricePrefix,
            caption,
        } = req.body;

        const finalBuffer = await renderInstagramCard({
            backgroundImageUrl,
            fromCity,
            toCity,
            price,
            currency,
            siteText,
            pricePrefix,
        });

        const uploadResult = await uploadToSupabase(finalBuffer, {
            fromCity,
            toCity,
        });

        const publishData = await publishToInstagram({
            imageUrl: uploadResult.publicUrl,
            caption,
        });

        return res.json({
            success: true,
            fileName: uploadResult.fileName,
            finalImageUrl: uploadResult.publicUrl,
            publishData,
        });
    } catch (error) {
        return res.status(500).json({
            error: error?.message || "Unexpected error",
        });
    }
}