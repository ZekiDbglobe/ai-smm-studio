import { createClient } from "@supabase/supabase-js";
import { env, validateEnv } from "./env.js";

validateEnv();

export const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);