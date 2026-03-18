import { Router } from "express";
import {
    generateNextDraftController,
    getPostDetailController,
    listPostsController,
    publishPostController,
    regenerateDraftController,
} from "../controllers/admin.controller.js";

const router = Router();

router.get("/posts", listPostsController);
router.get("/posts/:id", getPostDetailController);
router.post("/generate-next", generateNextDraftController);
router.post("/posts/:id/regenerate", regenerateDraftController);
router.post("/posts/:id/publish", publishPostController);

export default router;
