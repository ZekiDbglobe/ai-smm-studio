import { Router } from "express";
import path from "node:path";
import { env } from "../config/env.js";
import {
    clearStudioCookie,
    createStudioSession,
    getStudioSession,
    setStudioCookie
} from "../middleware/studdioAuth.middleware.js";


const router = Router();

router.get("/studio-login", (req, res) => {
    const session = getStudioSession(req);

    if (session) {
        return res.redirect("/studio");
    }

    return res.sendFile(path.join(process.cwd(), "public", "studio-login.html"));
});

router.post("/api/studio/login", (req, res) => {
    const { secret } = req.body || {};

    if (!env.ADMIN_SECRET) {
        return res.status(500).json({
            success: false,
            error: "ADMIN_SECRET tanımlı değil.",
        });
    }

    if (!secret || secret !== env.ADMIN_SECRET) {
        return res.status(401).json({
            success: false,
            error: "Kod hatalı.",
        });
    }

    const sid = createStudioSession();
    setStudioCookie(res, sid);

    return res.json({
        success: true,
    });
});

router.post("/api/studio/logout", (req, res) => {
    clearStudioCookie(res);

    return res.json({
        success: true,
    });
});

export default router;