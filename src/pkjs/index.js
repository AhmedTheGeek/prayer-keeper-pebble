/**
 * Prayer Keeper - PebbleKit JS Entry Point
 * Handles communication between phone and watch
 */

var prayerTimes = require('./prayer_times');
var location = require('./location');
var settings = require('./settings');
var timeline = require('./timeline');

// Message keys (must match package.json and C code)
var KEYS = {
    REQUEST_DATA: 0,
    FAJR_TIME: 1,
    SUNRISE_TIME: 2,
    DHUHR_TIME: 3,
    ASR_TIME: 4,
    MAGHRIB_TIME: 5,
    ISHA_TIME: 6,
    NEXT_PRAYER_NAME: 7,
    NEXT_PRAYER_TIME: 8,
    COUNTDOWN_SECONDS: 9,
    LOCATION_NAME: 10,
    ERROR_CODE: 11,
    ERROR_MESSAGE: 12,
    NEXT_PRAYER_INDEX: 13
};

// Error codes
var ERROR = {
    NONE: 0,
    LOCATION: 1,
    NETWORK: 2,
    CALCULATION: 3,
    APPMESSAGE: 4
};

// Retry state
var retryCount = 0;
var MAX_RETRIES = 3;
var RETRY_DELAY = 2000;

/**
 * Send prayer data to watch
 * @param {Object} data - Prayer data from calculation
 * @param {string} locationName - Location display name
 */
function sendPrayerDataToWatch(data, locationName) {
    var dict = {};

    dict[KEYS.FAJR_TIME] = data.times.fajr;
    dict[KEYS.SUNRISE_TIME] = data.times.sunrise;
    dict[KEYS.DHUHR_TIME] = data.times.dhuhr;
    dict[KEYS.ASR_TIME] = data.times.asr;
    dict[KEYS.MAGHRIB_TIME] = data.times.maghrib;
    dict[KEYS.ISHA_TIME] = data.times.isha;
    dict[KEYS.NEXT_PRAYER_NAME] = data.nextPrayer.name;
    dict[KEYS.NEXT_PRAYER_TIME] = data.nextPrayer.timeFormatted;
    dict[KEYS.COUNTDOWN_SECONDS] = data.nextPrayer.countdownSeconds;
    dict[KEYS.LOCATION_NAME] = locationName || 'Unknown';
    dict[KEYS.ERROR_CODE] = ERROR.NONE;

    Pebble.sendAppMessage(dict,
        function() {
            console.log('Prayer data sent successfully');
            retryCount = 0;
        },
        function(error) {
            console.log('Failed to send prayer data: ' + JSON.stringify(error));
            retryWithBackoff();
        }
    );
}

/**
 * Send error to watch
 * @param {number} code - Error code
 * @param {string} message - Error message
 */
function sendError(code, message) {
    var dict = {};
    dict[KEYS.ERROR_CODE] = code;
    dict[KEYS.ERROR_MESSAGE] = message || 'Unknown error';

    Pebble.sendAppMessage(dict,
        function() {
            console.log('Error sent to watch');
        },
        function() {
            console.log('Failed to send error');
        }
    );
}

/**
 * Retry sending data with exponential backoff
 */
function retryWithBackoff() {
    if (retryCount < MAX_RETRIES) {
        retryCount++;
        var delay = RETRY_DELAY * Math.pow(2, retryCount - 1);
        console.log('Retrying in ' + delay + 'ms (attempt ' + retryCount + ')');
        setTimeout(fetchAndSendPrayerData, delay);
    } else {
        sendError(ERROR.APPMESSAGE, 'Communication failed');
        retryCount = 0;
    }
}

/**
 * Main function to fetch location and send prayer data
 */
function fetchAndSendPrayerData() {
    var currentSettings = settings.loadSettings();

    // Use manual location if enabled
    if (currentSettings.manualLocation &&
        currentSettings.manualLatitude !== 0 &&
        currentSettings.manualLongitude !== 0) {

        console.log('Using manual location');
        processPrayerData(
            currentSettings.manualLatitude,
            currentSettings.manualLongitude,
            'Manual Location',
            currentSettings
        );
        return;
    }

    // Try cached location first for faster response
    var cachedLoc = location.getCachedLocation();
    if (cachedLoc) {
        console.log('Using cached location for immediate response');
        processPrayerData(
            cachedLoc.latitude,
            cachedLoc.longitude,
            cachedLoc.name || 'Cached Location',
            currentSettings
        );
    }

    // Get fresh GPS location (will update if different)
    location.getLocationWithName(
        function(loc) {
            console.log('Got fresh location: ' + loc.name);

            // Save location for future cache
            location.saveLocationCache(loc);

            // If we already sent cached data, only resend if location changed significantly
            if (cachedLoc) {
                var latDiff = Math.abs(loc.latitude - cachedLoc.latitude);
                var lonDiff = Math.abs(loc.longitude - cachedLoc.longitude);
                // Only update if moved more than ~1km
                if (latDiff < 0.01 && lonDiff < 0.01) {
                    console.log('Location unchanged, skipping update');
                    return;
                }
                console.log('Location changed, sending update');
            }

            processPrayerData(
                loc.latitude,
                loc.longitude,
                loc.name,
                currentSettings
            );
        },
        function(error) {
            console.log('Location error: ' + JSON.stringify(error));
            // If we already sent cached data, don't send error
            if (!cachedLoc) {
                sendError(ERROR.LOCATION, 'Location unavailable');
            }
        }
    );
}

/**
 * Process prayer data calculation and send to watch
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {string} locationName - Location display name
 * @param {Object} currentSettings - Current settings
 */
function processPrayerData(latitude, longitude, locationName, currentSettings) {
    try {
        var data = prayerTimes.getPrayerData(
            latitude,
            longitude,
            currentSettings.calculationMethod,
            currentSettings.asrMethod,
            false  // use24Hour - let watch decide based on its settings
        );

        // Send to watch
        sendPrayerDataToWatch(data, locationName);

        // Update Timeline pins
        if (currentSettings.timelineEnabled) {
            var tomorrowDate = new Date();
            tomorrowDate.setDate(tomorrowDate.getDate() + 1);

            var tomorrowData = prayerTimes.calculatePrayerTimes(
                latitude,
                longitude,
                tomorrowDate,
                currentSettings.calculationMethod,
                currentSettings.asrMethod
            );

            timeline.refreshPins(data.rawTimes, tomorrowData, {
                reminderMinutes: currentSettings.reminderMinutes
            }, function() {
                console.log('Timeline pins updated');
            });
        }

    } catch (e) {
        console.log('Calculation error: ' + e);
        sendError(ERROR.CALCULATION, 'Calculation failed');
    }
}

/**
 * Handle incoming messages from watch
 */
Pebble.addEventListener('appmessage', function(event) {
    console.log('Received message from watch');

    if (event.payload[KEYS.REQUEST_DATA]) {
        console.log('Watch requested data refresh');
        fetchAndSendPrayerData();
    }
});

/**
 * App ready handler
 */
Pebble.addEventListener('ready', function() {
    console.log('PebbleKit JS ready!');
    // Send initial data
    fetchAndSendPrayerData();
});

/**
 * Configuration page handler - open settings
 */
Pebble.addEventListener('showConfiguration', function() {
    console.log('Opening configuration page');

    // Get current settings for the config page
    var currentSettings = settings.loadSettings();
    var encoded = encodeURIComponent(JSON.stringify(currentSettings));

    // Configuration page - embedded as data URI
    var configPage = getConfigPageHtml();
    var url = 'data:text/html;charset=utf-8,' + encodeURIComponent(configPage);

    // Add current settings to URL
    Pebble.openURL(url + '#' + encoded);
});

/**
 * Configuration page closed handler
 */
Pebble.addEventListener('webviewclosed', function(event) {
    if (event && event.response) {
        console.log('Configuration closed with response');

        var newSettings = settings.parseConfigUrl(event.response);
        if (Object.keys(newSettings).length > 0) {
            settings.updateSettings(newSettings);
            console.log('Settings updated');

            // Clear location cache if manual location changed
            if (newSettings.manualLocation !== undefined) {
                location.clearCache();
            }

            // Refresh data with new settings
            fetchAndSendPrayerData();
        }
    }
});

/**
 * Get the configuration page HTML
 * Returns embedded HTML for offline use
 */
function getConfigPageHtml() {
    return '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Prayer Keeper Settings</title>' +
    '<style>' +
    'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; ' +
    'background: #f5f5f5; margin: 0; padding: 20px; }' +
    '.container { max-width: 400px; margin: 0 auto; }' +
    'h1 { color: #333; font-size: 24px; margin-bottom: 20px; }' +
    '.setting { background: white; border-radius: 8px; padding: 15px; margin-bottom: 15px; ' +
    'box-shadow: 0 1px 3px rgba(0,0,0,0.1); }' +
    '.setting label { display: block; font-weight: 600; margin-bottom: 8px; color: #333; }' +
    '.setting select, .setting input[type="number"] { width: 100%; padding: 10px; ' +
    'border: 1px solid #ddd; border-radius: 6px; font-size: 16px; box-sizing: border-box; }' +
    '.setting input[type="checkbox"] { width: 20px; height: 20px; margin-right: 10px; }' +
    '.checkbox-label { display: flex; align-items: center; font-weight: 600; color: #333; }' +
    '.manual-inputs { margin-top: 10px; display: none; }' +
    '.manual-inputs.show { display: block; }' +
    '.manual-inputs input { margin-bottom: 10px; }' +
    '.btn { display: block; width: 100%; padding: 15px; background: #00aa00; color: white; ' +
    'border: none; border-radius: 8px; font-size: 18px; font-weight: 600; cursor: pointer; ' +
    'margin-top: 20px; }' +
    '.btn:hover { background: #008800; }' +
    '.note { font-size: 12px; color: #666; margin-top: 5px; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="container">' +
    '<h1>Prayer Keeper Settings</h1>' +
    '<div class="setting">' +
    '<label>Calculation Method</label>' +
    '<select id="calculationMethod">' +
    '<option value="mwl">Muslim World League</option>' +
    '<option value="isna">ISNA (North America)</option>' +
    '<option value="egyptian">Egyptian General Authority</option>' +
    '<option value="umm_al_qura">Umm Al-Qura (Makkah)</option>' +
    '<option value="karachi">University of Islamic Sciences, Karachi</option>' +
    '<option value="tehran">Institute of Geophysics, Tehran</option>' +
    '<option value="singapore">Singapore</option>' +
    '<option value="moonsighting">Moonsighting Committee</option>' +
    '</select>' +
    '<p class="note">Different methods are used in different regions</p>' +
    '</div>' +
    '<div class="setting">' +
    '<label>Asr Calculation</label>' +
    '<select id="asrMethod">' +
    '<option value="shafi">Shafi (Standard)</option>' +
    '<option value="hanafi">Hanafi (Later)</option>' +
    '</select>' +
    '</div>' +
    '<div class="setting">' +
    '<label class="checkbox-label">' +
    '<input type="checkbox" id="manualLocation">' +
    'Use Manual Location' +
    '</label>' +
    '<div class="manual-inputs" id="manualInputs">' +
    '<input type="number" step="any" id="manualLatitude" placeholder="Latitude (e.g., 51.5074)">' +
    '<input type="number" step="any" id="manualLongitude" placeholder="Longitude (e.g., -0.1278)">' +
    '</div>' +
    '</div>' +
    '<div class="setting">' +
    '<label class="checkbox-label">' +
    '<input type="checkbox" id="timelineEnabled" checked>' +
    'Enable Timeline Pins' +
    '</label>' +
    '<p class="note">Show prayer times in Pebble Timeline</p>' +
    '</div>' +
    '<div class="setting">' +
    '<label>Reminder Time</label>' +
    '<select id="reminderMinutes">' +
    '<option value="5">5 minutes before</option>' +
    '<option value="10" selected>10 minutes before</option>' +
    '<option value="15">15 minutes before</option>' +
    '<option value="20">20 minutes before</option>' +
    '<option value="30">30 minutes before</option>' +
    '</select>' +
    '</div>' +
    '<div class="setting">' +
    '<label class="checkbox-label">' +
    '<input type="checkbox" id="vibrationEnabled" checked>' +
    'Vibrate at Prayer Time' +
    '</label>' +
    '</div>' +
    '<button class="btn" onclick="saveSettings()">Save Settings</button>' +
    '</div>' +
    '<script>' +
    'function loadSettings() {' +
    '  var hash = window.location.hash.substring(1);' +
    '  if (hash) {' +
    '    try {' +
    '      var settings = JSON.parse(decodeURIComponent(hash));' +
    '      if (settings.calculationMethod) document.getElementById("calculationMethod").value = settings.calculationMethod;' +
    '      if (settings.asrMethod) document.getElementById("asrMethod").value = settings.asrMethod;' +
    '      document.getElementById("manualLocation").checked = settings.manualLocation || false;' +
    '      if (settings.manualLatitude) document.getElementById("manualLatitude").value = settings.manualLatitude;' +
    '      if (settings.manualLongitude) document.getElementById("manualLongitude").value = settings.manualLongitude;' +
    '      document.getElementById("timelineEnabled").checked = settings.timelineEnabled !== false;' +
    '      if (settings.reminderMinutes) document.getElementById("reminderMinutes").value = settings.reminderMinutes;' +
    '      document.getElementById("vibrationEnabled").checked = settings.vibrationEnabled !== false;' +
    '      toggleManualInputs();' +
    '    } catch(e) { console.log("Error loading settings: " + e); }' +
    '  }' +
    '}' +
    'function toggleManualInputs() {' +
    '  var show = document.getElementById("manualLocation").checked;' +
    '  document.getElementById("manualInputs").className = "manual-inputs" + (show ? " show" : "");' +
    '}' +
    'document.getElementById("manualLocation").addEventListener("change", toggleManualInputs);' +
    'function saveSettings() {' +
    '  var settings = {' +
    '    calculationMethod: document.getElementById("calculationMethod").value,' +
    '    asrMethod: document.getElementById("asrMethod").value,' +
    '    manualLocation: document.getElementById("manualLocation").checked,' +
    '    manualLatitude: parseFloat(document.getElementById("manualLatitude").value) || 0,' +
    '    manualLongitude: parseFloat(document.getElementById("manualLongitude").value) || 0,' +
    '    timelineEnabled: document.getElementById("timelineEnabled").checked,' +
    '    reminderMinutes: parseInt(document.getElementById("reminderMinutes").value),' +
    '    vibrationEnabled: document.getElementById("vibrationEnabled").checked' +
    '  };' +
    '  var encoded = encodeURIComponent(JSON.stringify(settings));' +
    '  window.location.href = "pebblejs://close#" + encoded;' +
    '}' +
    'loadSettings();' +
    '</script>' +
    '</body>' +
    '</html>';
}
