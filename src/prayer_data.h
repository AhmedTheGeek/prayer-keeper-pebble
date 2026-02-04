#pragma once

#include <pebble.h>

// Prayer time indices
typedef enum {
    PRAYER_FAJR = 0,
    PRAYER_SUNRISE,
    PRAYER_DHUHR,
    PRAYER_ASR,
    PRAYER_MAGHRIB,
    PRAYER_ISHA,
    PRAYER_COUNT
} PrayerIndex;

// Prayer data structure
typedef struct {
    int16_t times[PRAYER_COUNT];     // Minutes since midnight for each prayer
    char next_prayer_name[16];        // Name of next prayer
    char next_prayer_time[16];        // Formatted time string
    int32_t countdown_seconds;        // Seconds until next prayer
    char location_name[32];           // Location display name
    bool data_valid;                  // Whether we have valid data
    int8_t error_code;                // 0 = success, >0 = error
    char error_message[64];           // Error description
    PrayerIndex next_prayer_index;    // Index of next prayer
    PrayerIndex current_prayer_index; // Index of current prayer (for highlighting)
    uint32_t last_update_time;        // Time of last update (for cache validation)
} PrayerData;

// Persistent storage keys
#define STORAGE_KEY_PRAYER_DATA 1
#define STORAGE_KEY_VERSION 2
#define STORAGE_VERSION 1

// Global prayer data instance
extern PrayerData g_prayer_data;

// Helper function to format minutes since midnight to time string
void format_time_from_minutes(int16_t minutes, char* buffer, size_t buffer_size);

// Persistent storage functions
void prayer_data_save(void);
bool prayer_data_load(void);
