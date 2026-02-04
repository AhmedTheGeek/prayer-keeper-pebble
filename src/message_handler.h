#pragma once

#include <pebble.h>

// Initialize AppMessage communication
void message_handler_init(void);

// Deinitialize AppMessage
void message_handler_deinit(void);

// Request prayer data from phone
void message_handler_request_data(void);

// Callback type for when prayer data is updated
typedef void (*PrayerDataUpdateCallback)(void);

// Set the callback for data updates
void message_handler_set_update_callback(PrayerDataUpdateCallback callback);
