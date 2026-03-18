function getFormatter(timeZone) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

export function getTimeZoneDateParts(date = new Date(), timeZone = "Europe/Istanbul") {
    const formatter = getFormatter(timeZone);
    const parts = formatter.formatToParts(date);
    const values = Object.fromEntries(
        parts
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value])
    );

    return {
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day),
    };
}

export function getIsoWeekKey(date = new Date(), timeZone = "Europe/Istanbul") {
    const { year, month, day } = getTimeZoneDateParts(date, timeZone);
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    const weekDay = utcDate.getUTCDay() || 7;

    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - weekDay);

    const weekYear = utcDate.getUTCFullYear();
    const yearStart = new Date(Date.UTC(weekYear, 0, 1));
    const diffDays = Math.floor((utcDate - yearStart) / 86400000);
    const weekNumber = Math.ceil((diffDays + 1) / 7);

    return `${weekYear}-W${String(weekNumber).padStart(2, "0")}`;
}

export function formatTurkishDate(value, timeZone = "Europe/Istanbul") {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat("tr-TR", {
        timeZone,
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date);
}

export function getIsoTimestamp(date = new Date()) {
    return date.toISOString();
}
