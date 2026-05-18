# Prayer Keeper for Pebble

A Pebble smartwatch app for tracking Muslim prayer times with location-based calculations, Timeline integration, and customizable calculation methods.

## Features

- **Automatic Prayer Time Calculation**: Uses the Adhan library for accurate prayer time calculations
- **Location-Based**: Automatically detects your location via GPS
- **8 Calculation Methods**:
  - Muslim World League (MWL)
  - ISNA (North America)
  - Egyptian General Authority
  - Umm Al-Qura (Makkah)
  - University of Islamic Sciences, Karachi
  - Institute of Geophysics, Tehran
  - Singapore
  - Moonsighting Committee
- **Asr Calculation Options**: Shafi (Standard) and Hanafi (Later)
- **Timeline Integration**: Prayer times appear in your Pebble Timeline with reminders
- **Countdown Timer**: Shows time remaining until the next prayer
- **Vibration Alerts**: Vibrates when prayer time arrives (respects quiet time)
- **Manual Location**: Option to set coordinates manually
- **Cross-Platform**: Supports all Pebble variants (Aplite, Basalt, Chalk, Diorite, Emery)

## Installation

### Prerequisites

- Pebble SDK 3.x installed
- Node.js and npm

### Building

1. Clone the repository:
   ```bash
   cd prayer-keeper-pebble
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the app:
   ```bash
   pebble build
   ```

4. Install on your watch:
   ```bash
   pebble install --phone YOUR_PHONE_IP
   ```

   Or install the `.pbw` file from the `build/` directory via the Pebble app.

## Usage

### Watch Interface

- **Top**: Current location name
- **Center**: Next prayer name, time, and countdown
- **Bottom**: List of all prayer times for the day

**Button Controls:**
- **SELECT**: Refresh prayer times manually

### Settings

Access settings through the Pebble app on your phone:

1. Open the Pebble app
2. Find "Prayer Keeper" in your apps
3. Tap the settings gear icon

**Available Settings:**
- Calculation method
- Asr calculation (Shafi/Hanafi)
- Manual location override
- Timeline pins enable/disable
- Reminder timing (5-30 minutes before)
- Vibration at prayer time

## Project Structure

```
prayer-keeper-pebble/
├── package.json              # App metadata and dependencies
├── wscript                   # Build configuration
├── resources/
│   └── images/
│       ├── mosque_icon.png   # App icon (25x25)
│       └── prayer_icon.png   # Menu/Timeline icon
└── src/
    ├── main.c                # App entry point + persistent cache
    ├── prayer_display.c/h    # Main window (next prayer + countdown)
    ├── prayer_list.c/h       # List window (all 5 named prayers)
    ├── message_handler.c/h   # AppMessage communication
    ├── prayer_data.h         # Shared data structures and helpers
    └── pkjs/
        ├── index.js          # PebbleKit JS entry point + settings page
        ├── prayer_times.js   # Adhan library wrapper
        ├── timeline.js       # Timeline pin management
        ├── app_glance.js     # Launcher glance (next prayer slices)
        ├── location.js       # Geolocation, geocoding, region method hint
        └── settings.js       # Settings persistence
```

PRODUCT.md and DESIGN.md at the project root capture the strategic and visual
design system. The settings page HTML is embedded as a data URI inside
`pkjs/index.js`; there is no separate `config/index.html` file.

## Auto-Region Detection

The app automatically suggests a calculation method based on your location:

| Region | Method |
|--------|--------|
| North America | ISNA |
| Saudi Arabia, Gulf States | Umm Al-Qura |
| Egypt, North Africa | Egyptian |
| Pakistan, India, Bangladesh | Karachi |
| Iran | Tehran |
| Southeast Asia | Singapore |
| Europe, Default | MWL |

## Technical Details

### AppMessage Protocol

Prayer data is transmitted using the following message keys:

| Key | Type | Description |
|-----|------|-------------|
| `FAJR_TIME` | int32 | Minutes since midnight |
| `SUNRISE_TIME` | int32 | Minutes since midnight |
| `DHUHR_TIME` | int32 | Minutes since midnight |
| `ASR_TIME` | int32 | Minutes since midnight |
| `MAGHRIB_TIME` | int32 | Minutes since midnight |
| `ISHA_TIME` | int32 | Minutes since midnight |
| `NEXT_PRAYER_NAME` | cstring | e.g., "Dhuhr" |
| `NEXT_PRAYER_TIME` | cstring | e.g., "12:30 PM" |
| `COUNTDOWN_SECONDS` | int32 | Seconds until next prayer |
| `NEXT_PRAYER_INDEX` | int32 | Index of next prayer (0=Fajr ... 5=Isha) |
| `LOCATION_NAME` | cstring | e.g., "London, UK" |

### Battery Optimization

- GPS coordinates cached for 5 minutes in memory, 24 hours on disk
- Tick timer runs on `MINUTE_UNIT` by default; switches to `SECOND_UNIT` only when the next prayer is within 5 minutes, so the countdown can tick visibly near the moment without burning CPU between prayers
- Small AppMessage buffers (512/64 bytes)
- Low-accuracy GPS mode by default

## Dependencies

- [Adhan](https://github.com/batoulapps/adhan-js) - Prayer time calculation library

## License

MIT License

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
