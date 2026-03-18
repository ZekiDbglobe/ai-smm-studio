export function escapeXml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

export function slugify(value = "") {
    return String(value)
        .toLowerCase()
        .trim()
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ı/g, "i")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function isValidHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

export function formatPrice(value) {
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);

    return Number.isInteger(num)
        ? String(num)
        : num.toLocaleString("tr-TR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
}

export function getRouteFontSize(fromCity, toCity) {
    const longest = Math.max(String(fromCity || "").length, String(toCity || "").length);

    if (longest >= 14) return 44;
    if (longest >= 11) return 50;
    return 56;
}

export function getPriceFontSize(price) {
    const len = String(price || "").length;

    if (len >= 5) return 78;
    if (len >= 4) return 88;
    return 96;
}
