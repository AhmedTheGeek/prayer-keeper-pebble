#include <pebble.h>
#include "prayer_list.h"
#include "prayer_data.h"
#include "prayer_display.h"

// Platform-aware fonts and row metrics. Emery (200x228) bumps up.
#ifdef PBL_PLATFORM_EMERY
    #define FONT_TITLE FONT_KEY_GOTHIC_28_BOLD
    #define FONT_ROW_NAME FONT_KEY_GOTHIC_24_BOLD
    #define FONT_ROW_TIME FONT_KEY_GOTHIC_24
    #define FONT_HINT FONT_KEY_GOTHIC_18
    #define ROW_HEIGHT_RECT 34
    #define ROW_START_Y_RECT 40
#else
    #define FONT_TITLE FONT_KEY_GOTHIC_18_BOLD
    #define FONT_ROW_NAME FONT_KEY_GOTHIC_18_BOLD
    #define FONT_ROW_TIME FONT_KEY_GOTHIC_18
    #define FONT_HINT FONT_KEY_GOTHIC_14
    #define ROW_HEIGHT_RECT 24
    #define ROW_START_Y_RECT 28
#endif

static Window *s_list_window;
static Layer *s_canvas_layer;

// The 5 named prayers (Sunrise lives on the main screen only).
static const char* DISPLAY_NAMES[] = {"Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"};
static const PrayerIndex DISPLAY_INDICES[] = {PRAYER_FAJR, PRAYER_DHUHR, PRAYER_ASR, PRAYER_MAGHRIB, PRAYER_ISHA};

static void canvas_update_proc(Layer *layer, GContext *ctx) {
    GRect bounds = layer_get_bounds(layer);
    bool is_round = PBL_IF_ROUND_ELSE(true, false);

    GColor bg_color = GColorBlack;
    GColor text_color = GColorWhite;
    GColor highlight_bg = PBL_IF_COLOR_ELSE(GColorDarkGreen, GColorWhite);
    GColor highlight_text = PBL_IF_COLOR_ELSE(GColorWhite, GColorBlack);

    graphics_context_set_fill_color(ctx, bg_color);
    graphics_fill_rect(ctx, bounds, 0, GCornerNone);

    // Header
    graphics_context_set_text_color(ctx, text_color);
    GRect title_rect = GRect(0, is_round ? 12 : 4, bounds.size.w, 24);
    graphics_draw_text(ctx, "Prayer Times", fonts_get_system_font(FONT_TITLE),
                       title_rect, GTextOverflowModeTrailingEllipsis,
                       GTextAlignmentCenter, NULL);

    int start_y = is_round ? (ROW_START_Y_RECT + 10) : ROW_START_Y_RECT;
    int row_height = is_round ? (ROW_HEIGHT_RECT + 2) : ROW_HEIGHT_RECT;
    int x_padding = is_round ? 25 : 8;
    int name_width = bounds.size.w / 2 - x_padding;
    int time_width = bounds.size.w / 2 - x_padding;

    for (int i = 0; i < 5; i++) {
        int y = start_y + (i * row_height);
        PrayerIndex idx = DISPLAY_INDICES[i];
        bool is_current = (idx == g_prayer_data.current_prayer_index);

        GRect row_rect = GRect(x_padding - 4, y, bounds.size.w - (x_padding - 4) * 2, row_height);

        if (is_current && g_prayer_data.data_valid) {
            graphics_context_set_fill_color(ctx, highlight_bg);
            graphics_fill_rect(ctx, row_rect, 4, GCornersAll);
            graphics_context_set_text_color(ctx, highlight_text);
        } else {
            graphics_context_set_text_color(ctx, text_color);
        }

        GRect name_rect = GRect(x_padding, y + 2, name_width, row_height - 4);
        graphics_draw_text(ctx, DISPLAY_NAMES[i],
                          fonts_get_system_font(FONT_ROW_NAME),
                          name_rect, GTextOverflowModeTrailingEllipsis,
                          GTextAlignmentLeft, NULL);

        char time_buf[16];
        format_time_from_minutes(g_prayer_data.times[idx], time_buf, sizeof(time_buf));

        GRect time_rect = GRect(bounds.size.w / 2, y + 2, time_width, row_height - 4);
        graphics_draw_text(ctx, time_buf,
                          fonts_get_system_font(FONT_ROW_TIME),
                          time_rect, GTextOverflowModeTrailingEllipsis,
                          GTextAlignmentRight, NULL);
    }

    // Footer hint, muted to match the main screen's Watch Label role.
    // UP mirrors the main screen's "DOWN for all times": vertical navigation.
    graphics_context_set_text_color(ctx, GColorLightGray);
    GRect hint_rect = GRect(0, bounds.size.h - (is_round ? 26 : 20), bounds.size.w, 18);
    graphics_draw_text(ctx, "UP for next prayer", fonts_get_system_font(FONT_HINT),
                       hint_rect, GTextOverflowModeTrailingEllipsis,
                       GTextAlignmentCenter, NULL);
}

static void up_click_handler(ClickRecognizerRef recognizer, void *context) {
    window_stack_pop(true);
}

static void click_config_provider(void *context) {
    // UP pops back to the main (next-prayer) screen. BACK keeps its default
    // OS behavior, so the back button still works as a system-level escape.
    window_single_click_subscribe(BUTTON_ID_UP, up_click_handler);
}

static void window_load(Window *window) {
    Layer *window_layer = window_get_root_layer(window);
    GRect bounds = layer_get_bounds(window_layer);

    s_canvas_layer = layer_create(bounds);
    layer_set_update_proc(s_canvas_layer, canvas_update_proc);
    layer_add_child(window_layer, s_canvas_layer);
}

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
