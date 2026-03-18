import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { env } from "../config/env.js";
import { localizeCityName, getCurrencySymbol } from "../utils/city.js";
import { ValidationError } from "../utils/errors.js";

const DEFAULT_FLIGHTS_PATH = path.join(process.cwd(), "assets", "cheap-flights.json");

function getFlightsFilePath() {
    return env.FLIGHTS_JSON_PATH
        ? path.resolve(process.cwd(), env.FLIGHTS_JSON_PATH)
        : DEFAULT_FLIGHTS_PATH;
}

function buildSourceId(rawFlight) {
    return createHash("sha1")
        .update(JSON.stringify(rawFlight))
        .digest("hex");
}

function normalizeCityField(rawFlight, primaryKey, fallbackKey) {
    return String(rawFlight?.[primaryKey] || rawFlight?.[fallbackKey] || "")
        .trim();
}

function normalizePrice(value) {
    const price = Number(value);

    if (!Number.isFinite(price)) {
        return null;
    }

    return price;
}

export function normalizeFlight(rawFlight) {
    const departureCity = normalizeCityField(rawFlight, "departureCity", "fromCityName");
    const arrivalCity = normalizeCityField(rawFlight, "arrivalCity", "toCityName");
    const currency = String(rawFlight?.currency || "EUR").trim().toUpperCase();
    const price = normalizePrice(rawFlight?.price);

    if (!departureCity || !arrivalCity || price === null || !currency) {
        throw new ValidationError("Flight item is missing required fields");
    }

    const travelDate = rawFlight?.travelDate || rawFlight?.departureDate || null;
    const bookingUrl = rawFlight?.bookingUrl || rawFlight?.deeplink || null;
    const sourceId = buildSourceId(rawFlight);

    return {
        sourceId,
        departureCity,
        arrivalCity,
        displayDepartureCity: localizeCityName(departureCity),
        displayArrivalCity: localizeCityName(arrivalCity),
        price,
        currency,
        currencySymbol: getCurrencySymbol(currency),
        travelDate,
        bookingUrl,
        rawPayload: rawFlight,
    };
}

export function normalizeFlights(rawFlights = []) {
    if (!Array.isArray(rawFlights)) {
        throw new ValidationError("cheap-flights.json must contain a JSON array");
    }

    return rawFlights.map(normalizeFlight);
}

function sortFlightsByPrice(flights) {
    return [...flights].sort((left, right) => {
        if (left.price !== right.price) {
            return left.price - right.price;
        }

        const leftDate = left.travelDate ? new Date(left.travelDate).getTime() : Number.MAX_SAFE_INTEGER;
        const rightDate = right.travelDate ? new Date(right.travelDate).getTime() : Number.MAX_SAFE_INTEGER;

        if (leftDate !== rightDate) {
            return leftDate - rightDate;
        }

        return left.sourceId.localeCompare(right.sourceId);
    });
}

function cityKey(value) {
    return String(value || "").trim().toLocaleLowerCase("tr-TR");
}

function pickFlights(sortedFlights, limit, { enforceUniqueDeparture }) {
    const usedDepartures = new Set();
    const usedArrivals = new Set();
    const selected = [];

    for (const flight of sortedFlights) {
        const departureKey = cityKey(flight.displayDepartureCity);
        const arrivalKey = cityKey(flight.displayArrivalCity);

        if ((enforceUniqueDeparture && usedDepartures.has(departureKey)) || usedArrivals.has(arrivalKey)) {
            continue;
        }

        selected.push(flight);
        if (enforceUniqueDeparture) {
            usedDepartures.add(departureKey);
        }
        usedArrivals.add(arrivalKey);

        if (selected.length >= limit) {
            break;
        }
    }

    return selected;
}

export function selectFlightsForQueue(flights, limit = 7) {
    const sortedFlights = sortFlightsByPrice(flights);
    const selected = pickFlights(sortedFlights, limit, {
        enforceUniqueDeparture: true,
    });

    if (selected.length >= limit) {
        return selected;
    }

    return pickFlights(sortedFlights, limit, {
        enforceUniqueDeparture: false,
    });
}

export function buildQueueRows(flights, weekKey) {
    return flights.map((flight, index) => ({
        week_key: weekKey,
        position: index + 1,
        source_id: flight.sourceId,
        departure_city: flight.displayDepartureCity,
        arrival_city: flight.displayArrivalCity,
        travel_date: flight.travelDate,
        price: flight.price,
        currency: flight.currency,
        booking_url: flight.bookingUrl,
        flight_payload: flight,
        status: "queued",
    }));
}

export async function loadFlightsFromFile() {
    const filePath = getFlightsFilePath();
    const rawJson = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(rawJson);
    const flights = normalizeFlights(parsed);

    if (!flights.length) {
        throw new ValidationError("cheap-flights.json does not contain any flights");
    }

    return flights;
}
