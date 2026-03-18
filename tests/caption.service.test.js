import test from "node:test";
import assert from "node:assert/strict";
import {
    buildFallbackCaption,
    buildFallbackHashtags,
    normalizeCaptionPayload,
} from "../src/services/caption.service.js";

const flight = {
    displayDepartureCity: "Münih",
    displayArrivalCity: "Antalya",
    price: 47,
    currencySymbol: "€",
    travelDate: "2026-03-24T10:00:00Z",
    bookingUrl: "https://example.com/booking",
};

test("buildFallbackHashtags includes route hashtags", () => {
    const hashtags = buildFallbackHashtags(flight);

    assert.ok(hashtags.includes("#munih"));
    assert.ok(hashtags.includes("#antalya"));
});

test("buildFallbackCaption returns Turkish caption without photo credit", () => {
    const caption = buildFallbackCaption(flight);

    assert.match(caption, /Münih çıkışlı Antalya uçuşlarında/);
    assert.doesNotMatch(caption, /Fotoğraf:/);
});

test("normalizeCaptionPayload appends hashtags without photo credit", () => {
    const caption = normalizeCaptionPayload(
        {
            caption: "Antalya için güzel bir fırsat seni bekliyor.",
            hashtags: ["antalya", "#ucakbileti", "antalya"],
        },
        flight
    );

    assert.match(caption, /#antalya #ucakbileti/);
    assert.doesNotMatch(caption, /Fotoğraf:/);
});
