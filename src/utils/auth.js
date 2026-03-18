import { timingSafeEqual } from "node:crypto";

export function safeCompareSecrets(expectedSecret, receivedSecret) {
    if (!expectedSecret || !receivedSecret) {
        return false;
    }

    const expected = Buffer.from(String(expectedSecret));
    const received = Buffer.from(String(receivedSecret));

    if (expected.length !== received.length) {
        return false;
    }

    return timingSafeEqual(expected, received);
}
