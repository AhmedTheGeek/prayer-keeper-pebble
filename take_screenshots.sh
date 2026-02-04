#!/bin/bash
# Take screenshots for all Pebble platforms
# Injects fake location (Mecca) and waits for app to load

mkdir -p store_assets/screenshots

# Fake location - Mecca, Saudi Arabia (for nice prayer times display)
LATITUDE=21.4225
LONGITUDE=39.8262

PLATFORMS=("aplite" "basalt" "chalk" "diorite" "emery")

for platform in "${PLATFORMS[@]}"; do
    echo "========================================"
    echo "📱 Platform: $platform"
    echo "========================================"

    # Kill any existing emulator for this platform
    pebble kill --emulator "$platform" 2>/dev/null

    # Start emulator in background
    echo "🚀 Starting emulator..."
    pebble install --emulator "$platform" &
    EMU_PID=$!

    # Wait for emulator to start
    sleep 5

    # Inject fake location
    echo "📍 Injecting location: Mecca ($LATITUDE, $LONGITUDE)..."
    pebble emu-control --emulator "$platform" gps "$LATITUDE" "$LONGITUDE" 2>/dev/null || \
    pebble emu-control --emulator "$platform" set-location "$LATITUDE" "$LONGITUDE" 2>/dev/null || \
    echo "   (Location injection may need manual setup)"

    # Wait for app to receive location and calculate prayer times
    echo "⏳ Waiting for prayer times to load..."
    sleep 8

    # Take screenshot of main screen
    echo "📸 Screenshot: main screen..."
    pebble screenshot --emulator "$platform" "store_assets/screenshots/${platform}_main.png"

    # Press DOWN button to show prayer list
    echo "👆 Pressing DOWN button..."
    pebble emu-control --emulator "$platform" button --button down 2>/dev/null || \
    pebble emu-control --emulator "$platform" press down 2>/dev/null || \
    pebble emu-control --emulator "$platform" down 2>/dev/null
    sleep 2

    # Take screenshot of prayer list
    echo "📸 Screenshot: prayer list..."
    pebble screenshot --emulator "$platform" "store_assets/screenshots/${platform}_list.png"

    # Kill this emulator before moving to next
    echo "🛑 Stopping emulator..."
    kill $EMU_PID 2>/dev/null
    pebble kill --emulator "$platform" 2>/dev/null
    sleep 2

    echo "✅ Done with $platform"
    echo ""
done

echo "========================================"
echo "🎉 All screenshots saved!"
echo "========================================"
ls -la store_assets/screenshots/

echo ""
echo "💡 Tip: If screenshots show 'Loading...', the emulator may need"
echo "   manual location setup. Open each emulator manually and use"
echo "   the Settings > Location menu to set coordinates."
