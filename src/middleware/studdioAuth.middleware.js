import crypto from "node:crypto";
import { env } from "../config/env.js";

const STUDIO_COOKIE_NAME = "studio_admin_session";
const STUDIO_SESSION_TTL_MS = 1000 * 60 * 60 * 12;

const studioSessions = new Map();

function parseCookies(req) {
    const cookieHeader = req.headers.cookie || "";

    return cookieHeader.split(";").reduce((acc, part) => {
        const [rawKey, ...rawValue] = part.trim().split("=");

        if (!rawKey) {
            return acc;
        }

        acc[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.join("="));
        return acc;
    }, {});
}

export function createStudioSession() {
    const sid = crypto.randomBytes(32).toString("hex");

    studioSessions.set(sid, {
        createdAt: Date.now(),
        expiresAt: Date.now() + STUDIO_SESSION_TTL_MS,
    });

    return sid;
}

export function getStudioSession(req) {
    const cookies = parseCookies(req);
    const sid = cookies[STUDIO_COOKIE_NAME];

    if (!sid) {
        return null;
    }

    const session = studioSessions.get(sid);

    if (!session) {
        return null;
    }

    if (session.expiresAt < Date.now()) {
        studioSessions.delete(sid);
        return null;
    }

    return {
        sid,
        ...session,
    };
}

export function setStudioCookie(res, sid) {
    const parts = [
        `${STUDIO_COOKIE_NAME}=${encodeURIComponent(sid)}`,
        "HttpOnly",
        "Path=/",
        `Max-Age=${Math.floor(STUDIO_SESSION_TTL_MS / 1000)}`,
        "SameSite=Lax",
    ];

    if (env.NODE_ENV === "production") {
        parts.push("Secure");
    }

    res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearStudioCookie(res) {
    const parts = [
        `${STUDIO_COOKIE_NAME}=`,
        "HttpOnly",
        "Path=/",
        "Max-Age=0",
        "SameSite=Lax",
    ];

    if (env.NODE_ENV === "production") {
        parts.push("Secure");
    }

    res.setHeader("Set-Cookie", parts.join("; "));
}

export function requireStudioAuth(req, res, next) {
    const session = getStudioSession(req);

    if (session) {
        return next();
    }

    const wantsJson =
        req.originalUrl.startsWith("/api/") ||
        (req.headers.accept || "").includes("application/json");

    if (wantsJson) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized",
        });
    }

    return res.redirect("/studio-login");
}