#!/bin/bash

# Ensure we are in the project root
cd "$(dirname "$0")/.."

echo "We will now open two native file picker windows for you to select your screenshots."
echo "If you don't see the window immediately, check behind your terminal or browser!"
echo ""

# FIRST IMAGE
echo "Asking for the FIRST screenshot (the one showing the Share icon at the bottom)..."
FILE1=$(osascript -e 'try' -e 'POSIX path of (choose file with prompt "Select the FIRST screenshot (Share Icon shown at bottom)")' -e 'on error number -128' -e 'return ""' -e 'end try' 2>/dev/null)

if [ -n "$FILE1" ]; then
    cp "$FILE1" "public/ios-share-authentic.png"
    echo "✅ Successfully copied first screenshot to public/ios-share-authentic.png"
else
    echo "❌ First screenshot selection cancelled."
fi

echo ""
# SECOND IMAGE
echo "Asking for the SECOND screenshot (the one showing the Add to Home Screen row)..."
FILE2=$(osascript -e 'try' -e 'POSIX path of (choose file with prompt "Select the SECOND screenshot (Add to Home Screen row)")' -e 'on error number -128' -e 'return ""' -e 'end try' 2>/dev/null)

if [ -n "$FILE2" ]; then
    cp "$FILE2" "public/ios-add-home-authentic.png"
    echo "✅ Successfully copied second screenshot to public/ios-add-home-authentic.png"
else
    echo "❌ Second screenshot selection cancelled."
fi

echo ""
echo "Done!"
