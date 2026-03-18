import express from "express";
import path from "node:path";
import renderRoutes from "./routes/render.routes.js";
import triggerRoutes from "./routes/trigger.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import studioAuthRoutes from "./routes/studioAuth.routes.js";
import {requireStudioAuth} from "./middleware/studdioAuth.middleware.js";


const app = express();
const studioPath = path.join(process.cwd(), "public", "studio");

app.use(express.json({ limit: "10mb" }));

app.use(studioAuthRoutes);

app.use("/api", triggerRoutes);
app.use("/api/admin", requireStudioAuth, adminRoutes);
app.use("/studio", requireStudioAuth, express.static(studioPath));
app.use("/", renderRoutes);

export default app;