import test from "node:test";
import assert from "node:assert/strict";
import { isMediaStillProcessing, publishToInstagram } from "../src/services/publish.service.js";

test("isMediaStillProcessing detects the Instagram not-ready response", () => {
    const result = isMediaStillProcessing({
        step: "publish_media",
        error: {
            error: {
                message: "Media ID is not available",
                code: 9007,
                error_subcode: 2207027,
                error_user_msg: "Medya yayınlanmaya hazır değil. Lütfen biraz bekle",
            },
        },
    });

    assert.equal(result, true);
});

test("publishToInstagram retries until publish succeeds", async () => {
    let attempt = 0;

    const fetchImpl = async () => {
        attempt += 1;

        if (attempt < 3) {
            return {
                ok: false,
                text: async () => JSON.stringify({
                    step: "publish_media",
                    error: {
                        error: {
                            message: "Media ID is not available",
                            code: 9007,
                            error_subcode: 2207027,
                            error_user_msg: "Medya yayınlanmaya hazır değil. Lütfen biraz bekle",
                        },
                    },
                }),
            };
        }

        return {
            ok: true,
            text: async () => JSON.stringify({
                success: true,
                publishedMediaId: "abc123",
            }),
        };
    };

    const result = await publishToInstagram(
        {
            imageUrl: "https://example.com/image.jpg",
            caption: "caption",
        },
        {
            fetchImpl,
            maxAttempts: 3,
            retryDelayMs: 1,
        }
    );

    assert.equal(attempt, 3);
    assert.equal(result.success, true);
});
