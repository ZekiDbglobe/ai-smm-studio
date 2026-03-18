import { Router } from "express";
import {
    cronTriggerPostController,
    manualTriggerPostController,
} from "../controllers/trigger.controller.js";
import { requireTriggerSecret } from "../middleware/trigger-auth.middleware.js";

const router = Router();

router.post("/manuel-trigger-post-to-instagram", requireTriggerSecret, manualTriggerPostController);
router.post("/manual-trigger-post-to-instagram", requireTriggerSecret, manualTriggerPostController);
router.post("/internal/cron-trigger-post-to-instagram", requireTriggerSecret, cronTriggerPostController);

export default router;
