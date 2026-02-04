#pragma once

#include <pebble.h>

// Initialize the prayer display window
void prayer_display_init(void);

// Deinitialize the prayer display window
void prayer_display_deinit(void);

// Get the main window (for pushing to window stack)
Window* prayer_display_get_window(void);

// Update the display with new data
void prayer_display_update(void);
