import { runInstagramAutomation } from "../services/automation.service.js";

async function runTrigger(req, res, triggerSource) {
    try {
        const result = await runInstagramAutomation({ triggerSource });
        return res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error) {
        return res.status(error?.statusCode || 500).json({
            success: false,
            error: error?.message || "Unexpected error",
        });
    }
}

export function manualTriggerPostController(req, res) {
    return runTrigger(req, res, "manual");
}

export function cronTriggerPostController(req, res) {
    return runTrigger(req, res, "cron");
}
