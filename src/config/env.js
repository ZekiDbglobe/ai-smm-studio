import dotenv from "dotenv";

dotenv.config();

export const env = {
    PORT: Number(process.env.PORT || 3001),
    APP_TIMEZONE: process.env.APP_TIMEZONE || "Europe/Istanbul",
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_BUCKET: process.env.SUPABASE_BUCKET,
    PUBLISH_FUNCTION_URL: process.env.PUBLISH_FUNCTION_URL,
    PUBLISH_FUNCTION_SECRET: process.env.PUBLISH_FUNCTION_SECRET,
    TRIGGER_SECRET: process.env.TRIGGER_SECRET,
    ADMIN_SECRET: process.env.ADMIN_SECRET || process.env.TRIGGER_SECRET,
    FLIGHTS_JSON_PATH: process.env.FLIGHTS_JSON_PATH,
    PHOTO_PROVIDER: process.env.PHOTO_PROVIDER || "pexels",
    PHOTO_API_KEY: process.env.PHOTO_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    GOOGLE_MODEL: process.env.GOOGLE_MODEL || "gemini-2.5-flash",
};

export function validateEnv() {
    const required = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_BUCKET",
    ];

    const missing = required.filter((key) => !env[key]);

    if (missing.length) {
        throw new Error(`Missing required env vars: ${missing.join(", ")}`);
    }
}
