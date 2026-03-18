const CITY_LOCALIZATION_MAP = new Map([
    ["amsterdam", "Amsterdam"],
    ["antalya", "Antalya"],
    ["athens", "Atina"],
    ["berlin", "Berlin"],
    ["cologne", "Köln"],
    ["dusseldorf", "Düsseldorf"],
    ["duesseldorf", "Düsseldorf"],
    ["erfurt", "Erfurt"],
    ["frankfurt", "Frankfurt"],
    ["hanover", "Hannover"],
    ["hannover", "Hannover"],
    ["hurghada", "Hurgada"],
    ["istanbul", "İstanbul"],
    ["izmir", "İzmir"],
    ["koln", "Köln"],
    ["koeln", "Köln"],
    ["muenchen", "Münih"],
    ["munchen", "Münih"],
    ["munich", "Münih"],
    ["muenster", "Münster"],
    ["muenster/osnabrueck", "Münster"],
    ["nuernberg", "Nürnberg"],
    ["nuremberg", "Nürnberg"],
    ["paderborn", "Paderborn"],
    ["stuttgart", "Stuttgart"],
]);

const VOWEL_GROUPS = {
    a: "a",
    i: "a",
    o: "a",
    u: "a",
    e: "e",
    ö: "e",
    ü: "e",
    ı: "a",
};

const HARD_CONSONANTS = new Set(["ç", "f", "h", "k", "p", "s", "ş", "t"]);
const TURKISH_UPPERCASE_LOCALE = "tr-TR";

function normalizeCityKey(city) {
    return String(city || "")
        .trim()
        .toLowerCase()
        .replaceAll("ä", "a")
        .replaceAll("ö", "o")
        .replaceAll("ü", "u")
        .replaceAll("ß", "ss");
}

function titleCase(value = "") {
    return String(value)
        .toLocaleLowerCase(TURKISH_UPPERCASE_LOCALE)
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toLocaleUpperCase(TURKISH_UPPERCASE_LOCALE) + word.slice(1))
        .join(" ");
}

function getLastLetter(city) {
    return String(city || "").trim().slice(-1).toLocaleLowerCase(TURKISH_UPPERCASE_LOCALE);
}

function getLastVowel(city) {
    const letters = Array.from(String(city || "").toLocaleLowerCase(TURKISH_UPPERCASE_LOCALE));

    for (let index = letters.length - 1; index >= 0; index -= 1) {
        if (Object.hasOwn(VOWEL_GROUPS, letters[index])) {
            return letters[index];
        }
    }

    return "a";
}

function endsWithVowel(city) {
    return Object.hasOwn(VOWEL_GROUPS, getLastLetter(city));
}

export function localizeCityName(city) {
    const normalized = normalizeCityKey(city);
    return CITY_LOCALIZATION_MAP.get(normalized) || titleCase(city);
}

export function buildFromCityLabel(city) {
    const localizedCity = localizeCityName(city);
    const lastLetter = getLastLetter(localizedCity);
    const lastVowel = getLastVowel(localizedCity);
    const baseSuffix = VOWEL_GROUPS[lastVowel] === "e" ? "den" : "dan";
    const consonantAdjusted = HARD_CONSONANTS.has(lastLetter)
        ? baseSuffix.replace("d", "t")
        : baseSuffix;

    return `${localizedCity}'${consonantAdjusted}`;
}

export function buildToCityLabel(city) {
    const localizedCity = localizeCityName(city);
    const lastVowel = getLastVowel(localizedCity);
    const suffix = VOWEL_GROUPS[lastVowel] === "e" ? "e" : "a";
    const joiner = endsWithVowel(localizedCity) ? "y" : "";

    return `${localizedCity}'${joiner}${suffix}`;
}

export function toTurkishUppercase(value) {
    return String(value || "").toLocaleUpperCase(TURKISH_UPPERCASE_LOCALE);
}

export function getCurrencySymbol(currency) {
    const upperCurrency = String(currency || "").trim().toUpperCase();

    switch (upperCurrency) {
        case "EUR":
            return "€";
        case "TRY":
            return "₺";
        case "USD":
            return "$";
        case "GBP":
            return "£";
        default:
            return currency || "€";
    }
}

export function buildPhotoSearchQueries(city) {
    const localized = localizeCityName(city);
    const raw = titleCase(city);
    const candidates = [
        `${raw} skyline`,
        `${raw} city landmark`,
        `${localized} skyline`,
        `${localized} city center`,
    ];

    return [...new Set(candidates.filter(Boolean))];
}

export function buildCompactHashtag(value) {
    return String(value || "")
        .normalize("NFKD")
        .replace(/[^\p{Letter}\p{Number}\s]/gu, "")
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.toLowerCase())
        .join("");
}
