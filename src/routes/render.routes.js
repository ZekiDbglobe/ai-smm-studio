import { Router } from "express";
import {
    healthController,
    renderInstagramCardController,
    renderAndPublishController,
} from "../controllers/render.controller.js";

const router = Router();

router.get("/health", healthController);
router.post("/render-instagram-card", renderInstagramCardController);
router.post("/render-and-publish", renderAndPublishController);

export default router;