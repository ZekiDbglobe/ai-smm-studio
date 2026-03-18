import { env } from "../config/env.js";
import { safeCompareSecrets } from "../utils/auth.js";

const TRIGGER_HEADER_NAME = "x-trigger-secret";

export function requireTriggerSecret(req, res, next) {
    if (!env.TRIGGER_SECRET) {
        return res.status(500).json({
            error: "TRIGGER_SECRET is not configured",
        });
    }

    const receivedSecret = req.get(TRIGGER_HEADER_NAME);

    if (!safeCompareSecrets(env.TRIGGER_SECRET, receivedSecret)) {
        return res.status(401).json({
            error: "Unauthorized trigger",
        });
    }

    return next();
}

export { TRIGGER_HEADER_NAME };
