const Jimp = require("jimp");
const path = require("path");
const fs = require("fs");

async function processScreenshots() {
    try {
        console.log("Processing image 1 (Share Icon at bottom)...");
        // We crop the first image to just show the bottom bar for step 1
        const img1 = await Jimp.read(path.join(__dirname, "../public/ios-share-authentic-source.png"));
        // The image is 1290 x 2796 (typical Pro Max). The bottom bar is roughly the last 300px.
        const w1 = img1.bitmap.width;
        const h1 = img1.bitmap.height;
        img1.crop(0, h1 - 350, w1, 350);
        await img1.writeAsync(path.join(__dirname, "../public/ios-step1.png"));
        console.log("Saved ios-step1.png");

        console.log("Processing image 2 (Add to Home Screen)...");
        // We crop the second image to focus on "Add to Home Screen" and BLUR the contacts row
        const img2 = await Jimp.read(path.join(__dirname, "../public/ios-add-home-authentic-source.png"));
        const w2 = img2.bitmap.width;
        const h2 = img2.bitmap.height;

        // Approximate location of the contacts row in the iOS share sheet 
        // Depending on phone, it's roughly 20% down from the top of the sheet
        // Let's just blur the entire top half of the sheet above the specific actions to be safe
        img2.pixelate(20, 0, 0, w2, h2 * 0.45);

        // And crop out the bottom half so it's focused
        // We want to make sure the "Add to Home Screen" row (near the bottom) is visible
        img2.crop(0, h2 * 0.3, w2, h2 * 0.65);

        await img2.writeAsync(path.join(__dirname, "../public/ios-step2.png"));
        console.log("Saved ios-step2.png");

        console.log("All done!");
    } catch (err) {
        console.error("Error processing:", err);
    }
}

processScreenshots();
