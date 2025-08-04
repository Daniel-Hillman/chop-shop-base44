const functions = require("firebase-functions");
const admin = require("firebase-admin");
const ytdl = require("ytdl-core");

admin.initializeApp();

exports.getAudio = functions.https.onCall(async (data, context) => {
    const videoId = data.videoId;

    if (!videoId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "The function must be called with one argument 'videoId'."
        );
    }

    try {
        const info = await ytdl.getInfo(videoId);
        const audioFormat = ytdl.chooseFormat(info.formats, {
            quality: "highestaudio",
            filter: "audioonly",
        });

        if (!audioFormat) {
            throw new functions.https.HttpsError(
                "not-found",
                "No suitable audio format found for this video."
            );
        }

        return { audioUrl: audioFormat.url };
    } catch (error) {
        console.error("Error fetching audio URL:", error);
        throw new functions.https.HttpsError(
            "internal",
            "Failed to get audio URL.",
            error
        );
    }
});
