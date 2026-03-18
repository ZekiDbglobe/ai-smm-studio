import test from "node:test";
import assert from "node:assert/strict";
import { safeCompareSecrets } from "../src/utils/auth.js";
import { buildFromCityLabel, buildToCityLabel, localizeCityName } from "../src/utils/city.js";
import { getIsoWeekKey } from "../src/utils/date.js";

test("safeCompareSecrets validates equal secrets", () => {
    assert.equal(safeCompareSecrets("abc123", "abc123"), true);
    assert.equal(safeCompareSecrets("abc123", "abc124"), false);
});

test("city helpers localize and suffix names in Turkish", () => {
    assert.equal(localizeCityName("Muenchen"), "Münih");
    assert.equal(buildFromCityLabel("İstanbul"), "İstanbul'dan");
    assert.equal(buildToCityLabel("Antalya"), "Antalya'ya");
});

test("getIsoWeekKey uses timezone-aware local date", () => {
    const value = getIsoWeekKey(new Date("2026-01-05T00:30:00.000Z"), "Europe/Istanbul");
    assert.equal(value, "2026-W02");
});
