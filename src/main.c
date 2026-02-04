#include <pebble.h>
#include "prayer_data.h"
#include "prayer_display.h"
#include "prayer_list.h"
#include "message_handler.h"

// Global prayer data instance
PrayerData g_prayer_data = {
    .times = {-1, -1, -1, -1, -1, -1},
    .next_prayer_name = "",
    .next_prayer_time = "",
    .countdown_seconds = 0,
    .location_name = "",
    .data_valid = false,
    .error_code = 0,
    .error_message = "",
    .next_prayer_index = PRAYER_FAJR,
    .current_prayer_index = PRAYER_ISHA,
    .last_update_time = 0
};

// Save prayer data to persistent storage
void prayer_data_save(void) {
    persist_write_int(STORAGE_KEY_VERSION, STORAGE_VERSION);
    persist_write_data(STORAGE_KEY_PRAYER_DATA, &g_prayer_data, sizeof(PrayerData));
    APP_LOG(APP_LOG_LEVEL_DEBUG, "Prayer data saved to storage");
}

// Load prayer data from persistent storage
// Returns true if valid cached data was loaded
bool prayer_data_load(void) {
    // Check version
    if (!persist_exists(STORAGE_KEY_VERSION) ||
        persist_read_int(STORAGE_KEY_VERSION) != STORAGE_VERSION) {
        APP_LOG(APP_LOG_LEVEL_DEBUG, "No valid cached data (version mismatch)");
        return false;
    }

    // Check if data exists
    if (!persist_exists(STORAGE_KEY_PRAYER_DATA)) {
        APP_LOG(APP_LOG_LEVEL_DEBUG, "No cached prayer data");
        return false;
    }

    // Load data
    int bytes_read = persist_read_data(STORAGE_KEY_PRAYER_DATA, &g_prayer_data, sizeof(PrayerData));
    if (bytes_read != sizeof(PrayerData)) {
        APP_LOG(APP_LOG_LEVEL_ERROR, "Failed to read cached data");
        g_prayer_data.data_valid = false;
        return false;
    }

    // Validate cache age - data older than 24 hours is stale
    uint32_t now = time(NULL);
    uint32_t cache_age = now - g_prayer_data.last_update_time;
    if (cache_age > 86400) { // 24 hours
        APP_LOG(APP_LOG_LEVEL_DEBUG, "Cached data too old (%lu seconds)", (unsigned long)cache_age);
        g_prayer_data.data_valid = false;
        return false;
    }

    // Recalculate countdown based on stored times and current time
    // This adjusts the countdown to account for time passed since cache
    if (g_prayer_data.data_valid && g_prayer_data.countdown_seconds > 0) {
        int32_t elapsed = (int32_t)cache_age;
        g_prayer_data.countdown_seconds -= elapsed;
        if (g_prayer_data.countdown_seconds < 0) {
            g_prayer_data.countdown_seconds = 0;
            // Data is stale, need refresh
            g_prayer_data.data_valid = false;
            return false;
        }
    }

    APP_LOG(APP_LOG_LEVEL_DEBUG, "Loaded cached prayer data (age: %lu seconds)", (unsigned long)cache_age);
    return g_prayer_data.data_valid;
}

// Callback when prayer data is updated
static void on_prayer_data_updated(void) {
    prayer_display_update();
    prayer_list_update();
}

// App initialization
static void init(void) {
    // Initialize message handler first (before display)
    message_handler_init();
    message_handler_set_update_callback(on_prayer_data_updated);

    // Initialize both windows
    prayer_display_init();
    prayer_list_init();

    // Try to load cached data for instant display
    bool has_cache = prayer_data_load();

    // Push main window
    window_stack_push(prayer_display_get_window(), true);

    // If we have cached data, show it immediately
    if (has_cache) {
        APP_LOG(APP_LOG_LEVEL_INFO, "Displaying cached data");
        prayer_display_update();
    }

    // Always request fresh data from phone (will update display when received)
    // Small delay to ensure JS is ready
    app_timer_register(500, (AppTimerCallback)message_handler_request_data, NULL);
}

// App cleanup
static void deinit(void) {
    // Save current data before exit
    if (g_prayer_data.data_valid) {
        prayer_data_save();
    }

    prayer_list_deinit();
    prayer_display_deinit();
    message_handler_deinit();
}

// Entry point
int main(void) {
    init();
    app_event_loop();
    deinit();
}
