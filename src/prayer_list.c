#include <pebble.h>
#include "prayer_list.h"
#include "prayer_data.h"
#include "prayer_display.h"

// Window and layers
static Window *s_list_window;
static Layer *s_canvas_layer;

// Prayer display names (5 prayers only, no sunrise)
static const char* DISPLAY_NAMES[] = {"Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"};
static const PrayerIndex DISPLAY_INDICES[] = {PRAYER_FAJR, PRAYER_DHUHR, PRAYER_ASR, PRAYER_MAGHRIB, PRAYER_ISHA};

// Format time for display
static void format_prayer_time(int16_t minutes, char* buffer, size_t size) {
    if (minutes < 0) {
        snprintf(buffer, size, "--:--");
        return;
    }

    int hours = minutes / 60;
    int mins = minutes % 60;

    if (clock_is_24h_style()) {
        snprintf(buffer, size, "%02d:%02d", hours, mins);
    } else {
        const char *ampm = (hours >= 12) ? "PM" : "AM";
        hours = hours % 12;
        if (hours == 0) hours = 12;
        snprintf(buffer, size, "%d:%02d%s", hours, mins, ampm);
    }
}

// Canvas drawing callback
static void canvas_update_proc(Layer *layer, GContext *ctx) {
    GRect bounds = layer_get_bounds(layer);
    bool is_round = PBL_IF_ROUND_ELSE(true, false);

    // Colors
    GColor bg_color = GColorBlack;
    GColor text_color = GColorWhite;
    GColor highlight_bg = PBL_IF_COLOR_ELSE(GColorDarkGreen, GColorWhite);
    GColor highlight_text = PBL_IF_COLOR_ELSE(GColorWhite, GColorBlack);

    // Clear background
    graphics_context_set_fill_color(ctx, bg_color);
    graphics_fill_rect(ctx, bounds, 0, GCornerNone);

    // Header
    graphics_context_set_text_color(ctx, text_color);
    const char *title = "Prayer Times";
    GRect title_rect = GRect(0, is_round ? 12 : 4, bounds.size.w, 20);
    graphics_draw_text(ctx, title, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
                       title_rect, GTextOverflowModeTrailingEllipsis,
                       GTextAlignmentCenter, NULL);

    // Calculate row dimensions
    int start_y = is_round ? 38 : 28;
    int row_height = is_round ? 26 : 24;
    int x_padding = is_round ? 25 : 8;
    int name_width = bounds.size.w / 2 - x_padding;
    int time_width = bounds.size.w / 2 - x_padding;

    // Draw each prayer row
    for (int i = 0; i < 5; i++) {
        int y = start_y + (i * row_height);
        PrayerIndex idx = DISPLAY_INDICES[i];
        bool is_current = (idx == g_prayer_data.current_prayer_index);

        GRect row_rect = GRect(x_padding - 4, y, bounds.size.w - (x_padding - 4) * 2, row_height);

        // Draw highlight background for current prayer
        if (is_current && g_prayer_data.data_valid) {
            graphics_context_set_fill_color(ctx, highlight_bg);
            graphics_fill_rect(ctx, row_rect, 4, GCornersAll);
            graphics_context_set_text_color(ctx, highlight_text);
        } else {
            graphics_context_set_text_color(ctx, text_color);
        }

        // Draw prayer name
        GRect name_rect = GRect(x_padding, y + 2, name_width, row_height - 4);
        graphics_draw_text(ctx, DISPLAY_NAMES[i],
                          fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
                          name_rect, GTextOverflowModeTrailingEllipsis,
                          GTextAlignmentLeft, NULL);

        // Draw prayer time
        char time_buf[16];
        format_prayer_time(g_prayer_data.times[idx], time_buf, sizeof(time_buf));

        GRect time_rect = GRect(bounds.size.w / 2, y + 2, time_width, row_height - 4);
        graphics_draw_text(ctx, time_buf,
                          fonts_get_system_font(FONT_KEY_GOTHIC_18),
                          time_rect, GTextOverflowModeTrailingEllipsis,
                          GTextAlignmentRight, NULL);
    }

    // Footer hint
    graphics_context_set_text_color(ctx, text_color);
    GRect hint_rect = GRect(0, bounds.size.h - (is_round ? 24 : 18), bounds.size.w, 16);
    graphics_draw_text(ctx, "< Back", fonts_get_system_font(FONT_KEY_GOTHIC_14),
                       hint_rect, GTextOverflowModeTrailingEllipsis,
                       GTextAlignmentCenter, NULL);
}

// Back button handler
static void back_click_handler(ClickRecognizerRef recognizer, void *context) {
    window_stack_pop(true);
}

// Click config provider
static void click_config_provider(void *context) {
    window_single_click_subscribe(BUTTON_ID_BACK, back_click_handler);
}

// Window load handler
static void window_load(Window *window) {
    Layer *window_layer = window_get_root_layer(window);
    GRect bounds = layer_get_bounds(window_layer);

    // Create canvas layer
    s_canvas_layer = layer_create(bounds);
    layer_set_update_proc(s_canvas_layer, canvas_update_proc);
    layer_add_child(window_layer, s_canvas_layer);
}

// Window unload handler
static void window_unload(Window *window) {
    layer_destroy(s_canvas_layer);
}

void prayer_list_init(void) {
    s_list_window = window_create();

    window_set_background_color(s_list_window, GColorBlack);
    window_set_click_config_provider(s_list_window, click_config_provider);
    window_set_window_handlers(s_list_window, (WindowHandlers) {
        .load = window_load,
        .unload = window_unload
    });
}

void prayer_list_deinit(void) {
    window_destroy(s_list_window);
}

Window* prayer_list_get_window(void) {
    return s_list_window;
}

void prayer_list_update(void) {
    if (s_canvas_layer) {
        layer_mark_dirty(s_canvas_layer);
    }
}
