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

// Forward declaration so on_prayer_data_updated can refresh the glance
// the moment fresh data arrives over AppMessage, not just on app exit.
static void glance_refresh(void);

// Callback when prayer data is updated
static void on_prayer_data_updated(void) {
    prayer_display_update();
    prayer_list_update();
    glance_refresh();
}

#if !PBL_PLATFORM_APLITE
// The 5 named prayers plus Sunrise. Sunrise is a time marker, not a prayer,
// so it's excluded from the launcher glance just like it's excluded from
// the list screen.
static const char *GLANCE_NAMES[PRAYER_COUNT] = {
    "Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"
};
static const bool GLANCE_INCLUDE[PRAYER_COUNT] = {
    true, false, true, true, true, true
};

// Push launcher-glance slices for the remaining named prayers today.
// Runs entirely on the watch firmware, so it works even when the iOS
// Pebble companion app's JS bridge silently no-ops Pebble.appGlanceReload.
//
// Each slice expires at its own prayer time; the system displays the first
// non-expired one, so the launcher subtitle auto-advances from prayer to
// prayer until the day ends.
static void glance_reload_callback(AppGlanceReloadSession *session, size_t limit, void *context) {
    if (!g_prayer_data.data_valid) {
        APP_LOG(APP_LOG_LEVEL_DEBUG, "glance: no valid data, nothing to push");
        return;
    }

    time_t now = time(NULL);
    time_t midnight = time_start_of_today();
    size_t added = 0;

    for (int i = 0; i < PRAYER_COUNT && added < limit; i++) {
        if (!GLANCE_INCLUDE[i]) continue;

        int16_t mins = g_prayer_data.times[i];
        if (mins < 0) continue;

        time_t prayer_time = midnight + ((time_t)mins * 60);
        if (prayer_time <= now) continue; // already passed

        char time_buf[16];
        format_time_from_minutes(mins, time_buf, sizeof(time_buf));

        // Each slice's subtitle is a fresh stack buffer; app_glance_add_slice
        // copies the string into its own storage (150-byte cap), so reusing
        // the buffer below would be safe, but separate buffers make this
        // explicit and easier to reason about.
        char subtitle[32];
        snprintf(subtitle, sizeof(subtitle), "%s %s", GLANCE_NAMES[i], time_buf);

        // DIAGNOSTIC: use the launcher's default icon for now to rule the
        // custom icon out as the cause of an invisible glance. If the
        // subtitle appears with the default icon, swap back to
        // PUBLISHED_ID_SALAT_ICON and the issue is icon resolution.
        AppGlanceSlice slice = {
            .expiration_time = prayer_time,
            .layout = {
                .icon = APP_GLANCE_SLICE_DEFAULT_ICON,
                .subtitle_template_string = subtitle
            }
        };

        AppGlanceResult result = app_glance_add_slice(session, slice);
        if (result != APP_GLANCE_RESULT_SUCCESS) {
            APP_LOG(APP_LOG_LEVEL_ERROR, "glance: '%s' rejected (%d)", subtitle, result);
        } else {
            added++;
        }
    }

    APP_LOG(APP_LOG_LEVEL_INFO, "glance: added %u slices", (unsigned)added);
}

static void glance_refresh(void) {
    if (g_prayer_data.data_valid) {
        app_glance_reload(glance_reload_callback, NULL);
    }
}
#else
static void glance_refresh(void) { /* App Glance unsupported on Aplite */ }
#endif

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
        // Backstop glance refresh on exit, in case nothing fresh came in
        // during this run and on_prayer_data_updated didn't fire.
        glance_refresh();
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
