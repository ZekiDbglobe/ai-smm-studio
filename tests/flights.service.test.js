import test from "node:test";
import assert from "node:assert/strict";
import {
    buildQueueRows,
    normalizeFlight,
    selectFlightsForQueue,
} from "../src/services/flights.service.js";

test("normalizeFlight supports provider payloads", () => {
    const normalized = normalizeFlight({
        fromCityName: "Muenchen",
        toCityName: "Antalya",
        price: 47,
        currency: "EUR",
        departureDate: "2026-03-24T12:00:00",
    });

    assert.equal(normalized.displayDepartureCity, "Münih");
    assert.equal(normalized.displayArrivalCity, "Antalya");
    assert.equal(normalized.currencySymbol, "€");
    assert.equal(normalized.price, 47);
});

test("selectFlightsForQueue keeps arrival cities unique and relaxes only departures", () => {
    const flights = [
        normalizeFlight({ departureCity: "İstanbul", arrivalCity: "Berlin", price: 30, currency: "EUR" }),
        normalizeFlight({ departureCity: "Antalya", arrivalCity: "Berlin", price: 31, currency: "EUR" }),
        normalizeFlight({ departureCity: "İstanbul", arrivalCity: "Köln", price: 32, currency: "EUR" }),
        normalizeFlight({ departureCity: "Antalya", arrivalCity: "Frankfurt", price: 33, currency: "EUR" }),
        normalizeFlight({ departureCity: "İzmir", arrivalCity: "Münih", price: 34, currency: "EUR" }),
    ];

    const selected = selectFlightsForQueue(flights, 4);

    assert.equal(selected.length, 4);
    assert.deepEqual(
        selected.map((flight) => flight.displayArrivalCity),
        ["Berlin", "Köln", "Frankfurt", "Münih"]
    );
});

test("buildQueueRows creates ordered queue entries", () => {
    const flights = [
        normalizeFlight({ departureCity: "İstanbul", arrivalCity: "Berlin", price: 30, currency: "EUR" }),
        normalizeFlight({ departureCity: "Antalya", arrivalCity: "Köln", price: 31, currency: "EUR" }),
    ];

    const rows = buildQueueRows(flights, "2026-W12");

    assert.equal(rows[0].position, 1);
    assert.equal(rows[1].position, 2);
    assert.equal(rows[0].week_key, "2026-W12");
});
