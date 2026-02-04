#pragma once

#include <pebble.h>

// Initialize the prayer list window
void prayer_list_init(void);

// Deinitialize the prayer list window
void prayer_list_deinit(void);

// Get the prayer list window
Window* prayer_list_get_window(void);

// Update the prayer list display
void prayer_list_update(void);
