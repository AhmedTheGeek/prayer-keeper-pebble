#include <pebble.h>
#include "message_handler.h"
#include "prayer_data.h"

// Message keys (must match package.json messageKeys order)
enum {
    KEY_REQUEST_DATA = 0,
    KEY_FAJR_TIME,
    KEY_SUNRISE_TIME,
    KEY_DHUHR_TIME,
    KEY_ASR_TIME,
    KEY_MAGHRIB_TIME,
    KEY_ISHA_TIME,
    KEY_NEXT_PRAYER_NAME,
    KEY_NEXT_PRAYER_TIME,
    KEY_COUNTDOWN_SECONDS,
    KEY_LOCATION_NAME,
    KEY_ERROR_CODE,
    KEY_ERROR_MESSAGE,
    KEY_NEXT_PRAYER_INDEX
};

// Callback for data updates
static PrayerDataUpdateCallback s_update_callback = NULL;

// Determine next prayer index from name
static PrayerIndex get_prayer_index_from_name(const char* name) {
    if (strcmp(name, "Fajr") == 0) return PRAYER_FAJR;
    if (strcmp(name, "Sunrise") == 0) return PRAYER_SUNRISE;
    if (strcmp(name, "Dhuhr") == 0) return PRAYER_DHUHR;
    if (strcmp(name, "Asr") == 0) return PRAYER_ASR;
    if (strcmp(name, "Maghrib") == 0) return PRAYER_MAGHRIB;
    if (strcmp(name, "Isha") == 0) return PRAYER_ISHA;
    return PRAYER_FAJR; // Default
}

// Get the current prayer (the one before next prayer)
// Maps to the 5 main prayers only (Fajr, Dhuhr, Asr, Maghrib, Isha)
static PrayerIndex get_current_prayer(PrayerIndex next) {
    switch (next) {
        case PRAYER_FAJR:    return PRAYER_ISHA;    // After Isha, waiting for Fajr
        case PRAYER_SUNRISE: return PRAYER_FAJR;    // After Fajr, before Sunrise
        case PRAYER_DHUHR:   return PRAYER_FAJR;    // After Sunrise, Fajr is still current
        case PRAYER_ASR:     return PRAYER_DHUHR;   // After Dhuhr, waiting for Asr
        case PRAYER_MAGHRIB: return PRAYER_ASR;     // After Asr, waiting for Maghrib
        case PRAYER_ISHA:    return PRAYER_MAGHRIB; // After Maghrib, waiting for Isha
        default:             return PRAYER_ISHA;
    }
}

// Inbox received handler
static void inbox_received_handler(DictionaryIterator *iterator, void *context) {
    // Check for error first
    Tuple *error_tuple = dict_find(iterator, KEY_ERROR_CODE);
    if (error_tuple && error_tuple->value->int32 != 0) {
        g_prayer_data.error_code = (int8_t)error_tuple->value->int32;
        g_prayer_data.data_valid = false;

        Tuple *error_msg = dict_find(iterator, KEY_ERROR_MESSAGE);
        if (error_msg) {
            strncpy(g_prayer_data.error_message, error_msg->value->cstring,
                    sizeof(g_prayer_data.error_message) - 1);
        }

        if (s_update_callback) {
            s_update_callback();
        }
        return;
    }

    // Parse prayer times
    Tuple *fajr = dict_find(iterator, KEY_FAJR_TIME);
    if (fajr) g_prayer_data.times[PRAYER_FAJR] = (int16_t)fajr->value->int32;

    Tuple *sunrise = dict_find(iterator, KEY_SUNRISE_TIME);
    if (sunrise) g_prayer_data.times[PRAYER_SUNRISE] = (int16_t)sunrise->value->int32;

    Tuple *dhuhr = dict_find(iterator, KEY_DHUHR_TIME);
    if (dhuhr) g_prayer_data.times[PRAYER_DHUHR] = (int16_t)dhuhr->value->int32;

    Tuple *asr = dict_find(iterator, KEY_ASR_TIME);
    if (asr) g_prayer_data.times[PRAYER_ASR] = (int16_t)asr->value->int32;

    Tuple *maghrib = dict_find(iterator, KEY_MAGHRIB_TIME);
    if (maghrib) g_prayer_data.times[PRAYER_MAGHRIB] = (int16_t)maghrib->value->int32;

    Tuple *isha = dict_find(iterator, KEY_ISHA_TIME);
    if (isha) g_prayer_data.times[PRAYER_ISHA] = (int16_t)isha->value->int32;

    // Parse next prayer info
    Tuple *next_name = dict_find(iterator, KEY_NEXT_PRAYER_NAME);
    if (next_name) {
        strncpy(g_prayer_data.next_prayer_name, next_name->value->cstring,
                sizeof(g_prayer_data.next_prayer_name) - 1);
        // Derive indices from name
        g_prayer_data.next_prayer_index = get_prayer_index_from_name(next_name->value->cstring);
        g_prayer_data.current_prayer_index = get_current_prayer(g_prayer_data.next_prayer_index);
    }

    Tuple *next_time = dict_find(iterator, KEY_NEXT_PRAYER_TIME);
    if (next_time) {
        strncpy(g_prayer_data.next_prayer_time, next_time->value->cstring,
                sizeof(g_prayer_data.next_prayer_time) - 1);
    }

    // Parse countdown in seconds
    Tuple *countdown = dict_find(iterator, KEY_COUNTDOWN_SECONDS);
    if (countdown) g_prayer_data.countdown_seconds = countdown->value->int32;

    // Parse location
    Tuple *location = dict_find(iterator, KEY_LOCATION_NAME);
    if (location) {
        strncpy(g_prayer_data.location_name, location->value->cstring,
                sizeof(g_prayer_data.location_name) - 1);
    }

    // Mark data as valid and save timestamp
    g_prayer_data.data_valid = true;
    g_prayer_data.error_code = 0;
    g_prayer_data.last_update_time = time(NULL);

    // Save to persistent storage for next launch
    prayer_data_save();

    // Call update callback
    if (s_update_callback) {
        s_update_callback();
    }
}

// Inbox dropped handler
static void inbox_dropped_handler(AppMessageResult reason, void *context) {
    APP_LOG(APP_LOG_LEVEL_ERROR, "Message dropped: %d", reason);
}

// Outbox failed handler
static void outbox_failed_handler(DictionaryIterator *iterator, AppMessageResult reason, void *context) {
    APP_LOG(APP_LOG_LEVEL_ERROR, "Outbox failed: %d", reason);
}

// Outbox sent handler
static void outbox_sent_handler(DictionaryIterator *iterator, void *context) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "Outbox sent successfully");
}

void message_handler_init(void) {
    // Register handlers
    app_message_register_inbox_received(inbox_received_handler);
    app_message_register_inbox_dropped(inbox_dropped_handler);
    app_message_register_outbox_failed(outbox_failed_handler);
    app_message_register_outbox_sent(outbox_sent_handler);

    // Open AppMessage with appropriate buffer sizes
    // Inbox: 512 bytes (receiving prayer data)
    // Outbox: 64 bytes (just sending requests)
    app_message_open(512, 64);
}

void message_handler_deinit(void) {
    app_message_deregister_callbacks();
}

void message_handler_request_data(void) {
    DictionaryIterator *iter;
    AppMessageResult result = app_message_outbox_begin(&iter);

    if (result != APP_MSG_OK) {
        APP_LOG(APP_LOG_LEVEL_ERROR, "Failed to begin outbox: %d", result);
        return;
    }

    // Send request flag
    dict_write_int8(iter, KEY_REQUEST_DATA, 1);

    result = app_message_outbox_send();
    if (result != APP_MSG_OK) {
        APP_LOG(APP_LOG_LEVEL_ERROR, "Failed to send message: %d", result);
    }
}

void message_handler_set_update_callback(PrayerDataUpdateCallback callback) {
    s_update_callback = callback;
}
