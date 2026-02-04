#include <pebble.h>
#include "prayer_display.h"
#include "prayer_data.h"
#include "prayer_list.h"
#include "message_handler.h"

// Window and layers
static Window *s_main_window;
static TextLayer *s_location_layer;
static TextLayer *s_next_label_layer;
static TextLayer *s_next_prayer_name_layer;
static TextLayer *s_next_prayer_time_layer;
static TextLayer *s_countdown_layer;
static TextLayer *s_hint_layer;

// Buffers for display text
static char s_countdown_buffer[32];

// Format minutes since midnight to readable time
void format_time_from_minutes(int16_t minutes, char* buffer, size_t buffer_size) {
    if (minutes < 0) {
        snprintf(buffer, buffer_size, "--:--");
        return;
    }

    int hours = minutes / 60;
    int mins = minutes % 60;

    if (clock_is_24h_style()) {
        snprintf(buffer, buffer_size, "%02d:%02d", hours, mins);
    } else {
        const char *am_pm = (hours >= 12) ? "PM" : "AM";
        hours = hours % 12;
        if (hours == 0) hours = 12;
        snprintf(buffer, buffer_size, "%d:%02d %s", hours, mins, am_pm);
    }
}

// Update countdown display (called every second)
void prayer_display_update_countdown(void) {
    if (!g_prayer_data.data_valid) return;

    // Decrement countdown each second
    if (g_prayer_data.countdown_seconds > 0) {
        g_prayer_data.countdown_seconds--;
    }

    // Format countdown with hours, minutes, seconds
    int32_t total_seconds = g_prayer_data.countdown_seconds;
    int hours = total_seconds / 3600;
    int minutes = (total_seconds % 3600) / 60;
    int seconds = total_seconds % 60;

    if (hours > 0) {
        snprintf(s_countdown_buffer, sizeof(s_countdown_buffer), "%d:%02d:%02d", hours, minutes, seconds);
    } else {
        snprintf(s_countdown_buffer, sizeof(s_countdown_buffer), "%d:%02d", minutes, seconds);
    }

    text_layer_set_text(s_countdown_layer, s_countdown_buffer);

    // Check if prayer time arrived - vibrate if enabled
    if (g_prayer_data.countdown_seconds == 0 && !quiet_time_is_active()) {
        // Double vibration pattern for prayer time
        static const uint32_t segments[] = {200, 100, 200, 100, 400};
        VibePattern pattern = {
            .durations = segments,
            .num_segments = ARRAY_LENGTH(segments)
        };
        vibes_enqueue_custom_pattern(pattern);

        // Request fresh data from phone
        message_handler_request_data();
    }
}

// Update display with new data
void prayer_display_update(void) {
    if (g_prayer_data.error_code != 0) {
        // Show error state
        text_layer_set_text(s_location_layer, "Error");
        text_layer_set_text(s_next_label_layer, "");
        text_layer_set_text(s_next_prayer_name_layer, g_prayer_data.error_message[0] ?
                           g_prayer_data.error_message : "Unknown error");
        text_layer_set_text(s_next_prayer_time_layer, "");
        text_layer_set_text(s_countdown_layer, "");
        text_layer_set_text(s_hint_layer, "SELECT to retry");
        return;
    }

    if (!g_prayer_data.data_valid) {
        // Show loading state
        text_layer_set_text(s_location_layer, "Loading...");
        text_layer_set_text(s_next_label_layer, "");
        text_layer_set_text(s_next_prayer_name_layer, "");
        text_layer_set_text(s_next_prayer_time_layer, "");
        text_layer_set_text(s_countdown_layer, "");
        text_layer_set_text(s_hint_layer, "");
        return;
    }

    // Update location
    text_layer_set_text(s_location_layer, g_prayer_data.location_name);

    // Update next prayer info
    text_layer_set_text(s_next_label_layer, "Next Prayer");
    text_layer_set_text(s_next_prayer_name_layer, g_prayer_data.next_prayer_name);
    text_layer_set_text(s_next_prayer_time_layer, g_prayer_data.next_prayer_time);

    // Update countdown
    prayer_display_update_countdown();

    // Update hint
    text_layer_set_text(s_hint_layer, "DOWN for all times");

    // Also update prayer list if it's visible
    prayer_list_update();
}

// Button click handler - SELECT to refresh
static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
    g_prayer_data.data_valid = false;
    g_prayer_data.error_code = 0;
    text_layer_set_text(s_location_layer, "Refreshing...");
    text_layer_set_text(s_next_label_layer, "");
    text_layer_set_text(s_next_prayer_name_layer, "");
    text_layer_set_text(s_next_prayer_time_layer, "");
    text_layer_set_text(s_countdown_layer, "");
    text_layer_set_text(s_hint_layer, "");
    message_handler_request_data();
}

// Down button handler - show prayer list
static void down_click_handler(ClickRecognizerRef recognizer, void *context) {
    window_stack_push(prayer_list_get_window(), true);
}

// Click config provider
static void click_config_provider(void *context) {
    window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
    window_single_click_subscribe(BUTTON_ID_DOWN, down_click_handler);
}

// Tick handler for second updates
static void tick_handler(struct tm *tick_time, TimeUnits units_changed) {
    prayer_display_update_countdown();
}

// Window load handler
static void window_load(Window *window) {
    Layer *window_layer = window_get_root_layer(window);
    GRect bounds = layer_get_bounds(window_layer);

    // Detect if this is a round display (Chalk)
    bool is_round = PBL_IF_ROUND_ELSE(true, false);
    int16_t x_offset = is_round ? 18 : 5;
    int16_t width = bounds.size.w - (x_offset * 2);
    int16_t center_y = bounds.size.h / 2;

    // Location header (top)
    s_location_layer = text_layer_create(GRect(x_offset, is_round ? 12 : 5, width, 22));
    text_layer_set_background_color(s_location_layer, GColorClear);
    text_layer_set_text_color(s_location_layer, GColorWhite);
    text_layer_set_font(s_location_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18));
    text_layer_set_text_alignment(s_location_layer, GTextAlignmentCenter);
    text_layer_set_text(s_location_layer, "Loading...");
    layer_add_child(window_layer, text_layer_get_layer(s_location_layer));

    // "Next Prayer" label
    s_next_label_layer = text_layer_create(GRect(x_offset, center_y - 55, width, 18));
    text_layer_set_background_color(s_next_label_layer, GColorClear);
    text_layer_set_text_color(s_next_label_layer, GColorLightGray);
    text_layer_set_font(s_next_label_layer, fonts_get_system_font(FONT_KEY_GOTHIC_14));
    text_layer_set_text_alignment(s_next_label_layer, GTextAlignmentCenter);
    layer_add_child(window_layer, text_layer_get_layer(s_next_label_layer));

    // Next prayer name (large, prominent)
    s_next_prayer_name_layer = text_layer_create(GRect(x_offset, center_y - 40, width, 42));
    text_layer_set_background_color(s_next_prayer_name_layer, GColorClear);
    text_layer_set_text_color(s_next_prayer_name_layer, GColorWhite);
    text_layer_set_font(s_next_prayer_name_layer, fonts_get_system_font(FONT_KEY_BITHAM_30_BLACK));
    text_layer_set_text_alignment(s_next_prayer_name_layer, GTextAlignmentCenter);
    layer_add_child(window_layer, text_layer_get_layer(s_next_prayer_name_layer));

    // Next prayer time
    s_next_prayer_time_layer = text_layer_create(GRect(x_offset, center_y, width, 26));
    text_layer_set_background_color(s_next_prayer_time_layer, GColorClear);
    text_layer_set_text_color(s_next_prayer_time_layer, GColorWhite);
    text_layer_set_font(s_next_prayer_time_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
    text_layer_set_text_alignment(s_next_prayer_time_layer, GTextAlignmentCenter);
    layer_add_child(window_layer, text_layer_get_layer(s_next_prayer_time_layer));

    // Countdown with seconds
    s_countdown_layer = text_layer_create(GRect(x_offset, center_y + 28, width, 36));
    text_layer_set_background_color(s_countdown_layer, GColorClear);
    text_layer_set_text_color(s_countdown_layer, PBL_IF_COLOR_ELSE(GColorMediumSpringGreen, GColorWhite));
    text_layer_set_font(s_countdown_layer, fonts_get_system_font(FONT_KEY_BITHAM_30_BLACK));
    text_layer_set_text_alignment(s_countdown_layer, GTextAlignmentCenter);
    layer_add_child(window_layer, text_layer_get_layer(s_countdown_layer));

    // Hint at bottom
    s_hint_layer = text_layer_create(GRect(x_offset, bounds.size.h - (is_round ? 28 : 22), width, 18));
    text_layer_set_background_color(s_hint_layer, GColorClear);
    text_layer_set_text_color(s_hint_layer, GColorDarkGray);
    text_layer_set_font(s_hint_layer, fonts_get_system_font(FONT_KEY_GOTHIC_14));
    text_layer_set_text_alignment(s_hint_layer, GTextAlignmentCenter);
    layer_add_child(window_layer, text_layer_get_layer(s_hint_layer));

    // Subscribe to tick timer - SECOND_UNIT for countdown
    tick_timer_service_subscribe(SECOND_UNIT, tick_handler);
}

// Window unload handler
static void window_unload(Window *window) {
    tick_timer_service_unsubscribe();

    text_layer_destroy(s_location_layer);
    text_layer_destroy(s_next_label_layer);
    text_layer_destroy(s_next_prayer_name_layer);
    text_layer_destroy(s_next_prayer_time_layer);
    text_layer_destroy(s_countdown_layer);
    text_layer_destroy(s_hint_layer);
}

void prayer_display_init(void) {
    s_main_window = window_create();

    window_set_background_color(s_main_window, GColorBlack);
    window_set_click_config_provider(s_main_window, click_config_provider);
    window_set_window_handlers(s_main_window, (WindowHandlers) {
        .load = window_load,
        .unload = window_unload
    });
}

void prayer_display_deinit(void) {
    window_destroy(s_main_window);
}

Window* prayer_display_get_window(void) {
    return s_main_window;
}
