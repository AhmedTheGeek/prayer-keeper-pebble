#include <pebble.h>
#include "prayer_display.h"
#include "prayer_data.h"
#include "prayer_list.h"
#include "message_handler.h"

// Platform-aware fonts and layout.
// Emery has a 200x228 display, so the next-prayer block scales up.
#ifdef PBL_PLATFORM_EMERY
    #define FONT_DISPLAY FONT_KEY_BITHAM_42_BOLD
    #define FONT_TITLE   FONT_KEY_GOTHIC_28_BOLD
    #define FONT_BODY    FONT_KEY_GOTHIC_24
    #define FONT_LABEL   FONT_KEY_GOTHIC_18
    #define LAYOUT_SCALE_NUM 14
#else
    #define FONT_DISPLAY FONT_KEY_BITHAM_30_BLACK
    #define FONT_TITLE   FONT_KEY_GOTHIC_24_BOLD
    #define FONT_BODY    FONT_KEY_GOTHIC_18
    #define FONT_LABEL   FONT_KEY_GOTHIC_14
    #define LAYOUT_SCALE_NUM 10
#endif

#define SCALE(n) (((n) * LAYOUT_SCALE_NUM) / 10)

static Window *s_main_window;
static TextLayer *s_location_layer;
static TextLayer *s_next_label_layer;
static TextLayer *s_next_prayer_name_layer;
static TextLayer *s_next_prayer_time_layer;
static TextLayer *s_countdown_layer;
static TextLayer *s_hint_layer;

static char s_countdown_buffer[32];

static void tick_handler(struct tm *tick_time, TimeUnits units_changed);

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

// Labeled minute-based countdown. Never shows raw "M:SS" — that reads as
// time-of-day and made seconds-tick mode look like minutes were flying by.
// Round up so the user sees "1m" until the prayer actually arrives, not "0m"
// for the final 59 seconds.
static void format_countdown(int32_t total_seconds, char *buffer, size_t buffer_size) {
    if (total_seconds <= 0) {
        snprintf(buffer, buffer_size, "Now");
        return;
    }
    int32_t total_minutes = (total_seconds + 59) / 60;
    int hours = total_minutes / 60;
    int minutes = total_minutes % 60;

    if (hours > 0) {
        snprintf(buffer, buffer_size, "%dh %dm", hours, minutes);
    } else {
        snprintf(buffer, buffer_size, "%dm", minutes);
    }
}

void prayer_display_update_countdown(void) {
    if (!g_prayer_data.data_valid) return;
    format_countdown(g_prayer_data.countdown_seconds, s_countdown_buffer, sizeof(s_countdown_buffer));
    text_layer_set_text(s_countdown_layer, s_countdown_buffer);
}

void prayer_display_update(void) {
    if (g_prayer_data.error_code != 0) {
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
        text_layer_set_text(s_location_layer, "Loading...");
        text_layer_set_text(s_next_label_layer, "");
        text_layer_set_text(s_next_prayer_name_layer, "");
        text_layer_set_text(s_next_prayer_time_layer, "");
        text_layer_set_text(s_countdown_layer, "");
        text_layer_set_text(s_hint_layer, "");
        return;
    }

    text_layer_set_text(s_location_layer, g_prayer_data.location_name);
    text_layer_set_text(s_next_label_layer, "Next Prayer");
    text_layer_set_text(s_next_prayer_name_layer, g_prayer_data.next_prayer_name);
    text_layer_set_text(s_next_prayer_time_layer, g_prayer_data.next_prayer_time);
    text_layer_set_text(s_hint_layer, "DOWN for all times");

    prayer_display_update_countdown();

    if (window_stack_contains_window(prayer_list_get_window())) {
        prayer_list_update();
    }
}

static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
    g_prayer_data.data_valid = false;
    g_prayer_data.error_code = 0;
    prayer_display_update();
    message_handler_request_data();
}

static void down_click_handler(ClickRecognizerRef recognizer, void *context) {
    window_stack_push(prayer_list_get_window(), true);
}

static void click_config_provider(void *context) {
    window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
    window_single_click_subscribe(BUTTON_ID_DOWN, down_click_handler);
}

static void tick_handler(struct tm *tick_time, TimeUnits units_changed) {
    if (!g_prayer_data.data_valid) return;

    if (g_prayer_data.countdown_seconds > 0) {
        g_prayer_data.countdown_seconds -= 60;
        if (g_prayer_data.countdown_seconds < 0) g_prayer_data.countdown_seconds = 0;
    }

    if (g_prayer_data.countdown_seconds == 0 && !quiet_time_is_active()) {
        static const uint32_t segments[] = {200, 100, 200, 100, 400};
        VibePattern pattern = {
            .durations = segments,
            .num_segments = ARRAY_LENGTH(segments)
        };
        vibes_enqueue_custom_pattern(pattern);
        message_handler_request_data();
    }

    prayer_display_update_countdown();
}

static void window_load(Window *window) {
    Layer *window_layer = window_get_root_layer(window);
    GRect bounds = layer_get_bounds(window_layer);

    bool is_round = PBL_IF_ROUND_ELSE(true, false);
    int16_t x_offset = is_round ? 18 : 5;
    int16_t width = bounds.size.w - (x_offset * 2);
    int16_t center_y = bounds.size.h / 2;
    int16_t top_y = is_round ? 12 : 5;

    // Location header (top, muted)
    s_location_layer = text_layer_create(GRect(x_offset, top_y, width, SCALE(22)));
    text_layer_set_background_color(s_location_layer, GColorClear);
    text_layer_set_text_color(s_location_layer, GColorWhite);
    text_layer_set_font(s_location_layer, fonts_get_system_font(FONT_BODY));
    text_layer_set_text_alignment(s_location_layer, GTextAlignmentCenter);
    text_layer_set_text(s_location_layer, "Loading...");
    layer_add_child(window_layer, text_layer_get_layer(s_location_layer));

    // "Next Prayer" supra-label
    s_next_label_layer = text_layer_create(GRect(x_offset, center_y + SCALE(-55), width, SCALE(18)));
    text_layer_set_background_color(s_next_label_layer, GColorClear);
    text_layer_set_text_color(s_next_label_layer, GColorLightGray);
    text_layer_set_font(s_next_label_layer, fonts_get_system_font(FONT_LABEL));
    text_layer_set_text_alignment(s_next_label_layer, GTextAlignmentCenter);
    layer_add_child(window_layer, text_layer_get_layer(s_next_label_layer));

    // Prayer name (Display role)
    s_next_prayer_name_layer = text_layer_create(GRect(x_offset, center_y + SCALE(-40), width, SCALE(42)));
    text_layer_set_background_color(s_next_prayer_name_layer, GColorClear);
    text_layer_set_text_color(s_next_prayer_name_layer, GColorWhite);
    text_layer_set_font(s_next_prayer_name_layer, fonts_get_system_font(FONT_DISPLAY));
    text_layer_set_text_alignment(s_next_prayer_name_layer, GTextAlignmentCenter);
    layer_add_child(window_layer, text_layer_get_layer(s_next_prayer_name_layer));

    // Prayer time (Title role)
    s_next_prayer_time_layer = text_layer_create(GRect(x_offset, center_y, width, SCALE(26)));
    text_layer_set_background_color(s_next_prayer_time_layer, GColorClear);
    text_layer_set_text_color(s_next_prayer_time_layer, GColorWhite);
    text_layer_set_font(s_next_prayer_time_layer, fonts_get_system_font(FONT_TITLE));
    text_layer_set_text_alignment(s_next_prayer_time_layer, GTextAlignmentCenter);
    layer_add_child(window_layer, text_layer_get_layer(s_next_prayer_time_layer));

    // Countdown (Display role, Adhan Green on color hardware)
    s_countdown_layer = text_layer_create(GRect(x_offset, center_y + SCALE(28), width, SCALE(36)));
    text_layer_set_background_color(s_countdown_layer, GColorClear);
    text_layer_set_text_color(s_countdown_layer, PBL_IF_COLOR_ELSE(GColorMediumSpringGreen, GColorWhite));
    text_layer_set_font(s_countdown_layer, fonts_get_system_font(FONT_DISPLAY));
    text_layer_set_text_alignment(s_countdown_layer, GTextAlignmentCenter);
    layer_add_child(window_layer, text_layer_get_layer(s_countdown_layer));

    // Footer hint (Watch Label role, muted-fg-strong)
    s_hint_layer = text_layer_create(GRect(x_offset, bounds.size.h - (is_round ? 28 : 22), width, SCALE(18)));
    text_layer_set_background_color(s_hint_layer, GColorClear);
    text_layer_set_text_color(s_hint_layer, GColorLightGray);
    text_layer_set_font(s_hint_layer, fonts_get_system_font(FONT_LABEL));
    text_layer_set_text_alignment(s_hint_layer, GTextAlignmentCenter);
    layer_add_child(window_layer, text_layer_get_layer(s_hint_layer));

    tick_timer_service_subscribe(MINUTE_UNIT, tick_handler);
}

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
