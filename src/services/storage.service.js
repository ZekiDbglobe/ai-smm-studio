import { supabase } from "../config/supabase.js";
import { env } from "../config/env.js";
import { slugify } from "../utils/helpers.js";

export async function uploadToSupabase(finalBuffer, { fromCity, toCity }) {
    const datePart = new Date().toISOString().slice(0, 10);
    const fileName = `instagram/${datePart}/${Date.now()}-${slugify(fromCity)}-to-${slugify(toCity)}.jpg`;

    const { error } = await supabase.storage
        .from(env.SUPABASE_BUCKET)
        .upload(fileName, finalBuffer, {
            contentType: "image/jpeg",
            upsert: true,
            cacheControl: "3600",
        });

    if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`);
    }

    const { data } = supabase.storage
        .from(env.SUPABASE_BUCKET)
        .getPublicUrl(fileName);

    return {
        fileName,
        publicUrl: data.publicUrl,
    };
}