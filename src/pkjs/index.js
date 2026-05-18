/**
 * Prayer Keeper - PebbleKit JS Entry Point
 * Handles communication between phone and watch
 */

var prayerTimes = require('./prayer_times');
var location = require('./location');
var settings = require('./settings');
var timeline = require('./timeline');
var appGlance = require('./app_glance');

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

            // Apply the region-suggested calculation method on first run only.
            // Once the user opens settings and saves, userConfigured locks in
            // their choice and we never auto-switch again.
            if (!currentSettings.userConfigured
                && loc.suggestedMethod
                && loc.suggestedMethod !== currentSettings.calculationMethod) {
                console.log('First run: applying suggested method ' + loc.suggestedMethod
                    + ' (was ' + currentSettings.calculationMethod + ')');
                currentSettings.calculationMethod = loc.suggestedMethod;
                settings.updateSettings({ calculationMethod: loc.suggestedMethod });
            }

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

        // Compute tomorrow's times once, used by both Timeline pins and App Glance
        var tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        var tomorrowData = prayerTimes.calculatePrayerTimes(
            latitude,
            longitude,
            tomorrowDate,
            currentSettings.calculationMethod,
            currentSettings.asrMethod
        );

        // Refresh the launcher app glance (next prayer next to the app icon)
        appGlance.reload(data.rawTimes, tomorrowData, {
            use24Hour: false
        });

        // Update Timeline pins
        if (currentSettings.timelineEnabled) {
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
            // Opening the settings page and saving counts as the user
            // taking ownership of the calculation method choice.
            newSettings.userConfigured = true;
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
 * Get the configuration page HTML.
 * Embedded as a data: URI so the page works without network access.
 * Visual system follows DESIGN.md: Paper background, no gradients, no shadows,
 * Adhan Green reserved for the active state of toggles and focused inputs.
 */
function getConfigPageHtml() {
    var css =
        '*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}' +
        'body{margin:0;padding:24px 16px 48px;background:#f6f4ef;color:#0a0d0a;' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
        'font-size:15px;font-weight:500;line-height:1.5}' +
        'main{max-width:400px;margin:0 auto}' +
        'h1{margin:0 0 24px;font-size:24px;font-weight:600;line-height:1.2;color:#0a0d0a}' +
        'section+section{margin-top:24px}' +
        'h2{margin:0 0 8px 4px;font-size:12px;font-weight:600;line-height:1.2;' +
        'letter-spacing:0.08em;text-transform:uppercase;color:#7a7d76}' +
        '.card{background:#fffefb;border:1px solid #e6e3dc;border-radius:12px;padding:16px}' +
        '.card+.card{margin-top:12px}' +
        '.card[hidden]{display:none}' +
        '.card>label{display:block;margin-bottom:8px;font-size:15px;font-weight:500;color:#0a0d0a}' +
        '.row{display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer}' +
        '.row .row-label{flex:1;font-size:15px;font-weight:500;color:#0a0d0a}' +
        '.card select,.card input[type="number"]{width:100%;appearance:none;-webkit-appearance:none;' +
        'background:#fffefb;color:#0a0d0a;border:1px solid #e6e3dc;border-radius:8px;padding:12px;' +
        'font:inherit;transition:border-color 200ms cubic-bezier(0.25,1,0.5,1)}' +
        '.card select{padding-right:36px;background-repeat:no-repeat;background-position:right 14px center;' +
        'background-image:url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'><path d=\'M1 1l5 5 5-5\' stroke=\'%237a7d76\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/></svg>")}' +
        '.card select:focus,.card input[type="number"]:focus{outline:none;border-color:#00b85e}' +
        '.toggle{position:relative;display:inline-block;width:52px;height:28px;flex-shrink:0}' +
        '.toggle input{position:absolute;opacity:0;width:0;height:0}' +
        '.toggle-track{position:absolute;inset:0;background:#e6e3dc;border-radius:999px;' +
        'transition:background 200ms cubic-bezier(0.25,1,0.5,1)}' +
        '.toggle-thumb{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;' +
        'background:#fffefb;border:1px solid #e6e3dc;' +
        'transition:transform 200ms cubic-bezier(0.25,1,0.5,1)}' +
        '.toggle input:checked~.toggle-track{background:#00b85e}' +
        '.toggle input:checked~.toggle-thumb{transform:translateX(24px)}' +
        '.toggle input:focus-visible~.toggle-track{outline:2px solid #00b85e;outline-offset:2px}' +
        '.manual-inputs{margin-top:12px;display:none}' +
        '.manual-inputs.show{display:block}' +
        '.manual-inputs .input-group+.input-group{margin-top:12px}' +
        '.manual-inputs label{display:block;margin-bottom:4px;font-size:12px;font-weight:400;color:#7a7d76}' +
        '.note{margin:8px 0 0;font-size:12px;font-weight:400;line-height:1.4;color:#7a7d76}' +
        '.btn{display:block;width:100%;margin-top:24px;padding:14px 24px;background:#0a0d0a;color:#f6f4ef;' +
        'border:none;border-radius:8px;font:inherit;font-size:15px;font-weight:500;cursor:pointer;' +
        'transition:background 200ms cubic-bezier(0.25,1,0.5,1)}' +
        '.btn:hover,.btn:active{background:#0a4a23}' +
        '.btn:focus-visible{outline:2px solid #00b85e;outline-offset:2px}';

    var html =
        '<!DOCTYPE html><html lang="en"><head>' +
        '<meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<title>Prayer Keeper</title>' +
        '<style>' + css + '</style></head><body><main>' +
        '<h1>Prayer Keeper</h1>' +

        '<section><h2>Calculation</h2>' +
        '<div class="card">' +
        '<label for="calculationMethod">Calculation method</label>' +
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
        '<p class="note">Different methods are used in different regions. The app suggests one based on your location.</p>' +
        '</div>' +
        '<div class="card">' +
        '<label for="asrMethod">Asr calculation</label>' +
        '<select id="asrMethod">' +
        '<option value="shafi">Shafi (standard, shadow equals object)</option>' +
        '<option value="hanafi">Hanafi (later, shadow twice object)</option>' +
        '</select>' +
        '</div></section>' +

        '<section><h2>Location</h2>' +
        '<div class="card">' +
        '<label class="row" for="manualLocation">' +
        '<span class="row-label">Use manual location</span>' +
        '<span class="toggle">' +
        '<input type="checkbox" id="manualLocation">' +
        '<span class="toggle-track"></span>' +
        '<span class="toggle-thumb"></span>' +
        '</span>' +
        '</label>' +
        '<div class="manual-inputs" id="manualInputs">' +
        '<div class="input-group"><label for="manualLatitude">Latitude</label>' +
        '<input type="number" step="any" id="manualLatitude" placeholder="51.5074"></div>' +
        '<div class="input-group"><label for="manualLongitude">Longitude</label>' +
        '<input type="number" step="any" id="manualLongitude" placeholder="-0.1278"></div>' +
        '</div>' +
        '<p class="note">Use this when GPS is unavailable, or to pin a specific location.</p>' +
        '</div></section>' +

        '<section><h2>Notifications</h2>' +
        '<div class="card">' +
        '<label class="row" for="timelineEnabled">' +
        '<span class="row-label">Timeline pins</span>' +
        '<span class="toggle">' +
        '<input type="checkbox" id="timelineEnabled">' +
        '<span class="toggle-track"></span>' +
        '<span class="toggle-thumb"></span>' +
        '</span>' +
        '</label>' +
        '<p class="note">Adds prayer times to your Pebble Timeline.</p>' +
        '</div>' +
        '<div class="card" id="reminderCard">' +
        '<label for="reminderMinutes">Reminder time</label>' +
        '<select id="reminderMinutes">' +
        '<option value="5">5 minutes before</option>' +
        '<option value="10">10 minutes before</option>' +
        '<option value="15">15 minutes before</option>' +
        '<option value="20">20 minutes before</option>' +
        '<option value="30">30 minutes before</option>' +
        '</select>' +
        '<p class="note">Pebble Timeline pings you this far ahead of each prayer.</p>' +
        '</div>' +
        '<div class="card">' +
        '<label class="row" for="vibrationEnabled">' +
        '<span class="row-label">Vibrate at prayer time</span>' +
        '<span class="toggle">' +
        '<input type="checkbox" id="vibrationEnabled">' +
        '<span class="toggle-track"></span>' +
        '<span class="toggle-thumb"></span>' +
        '</span>' +
        '</label>' +
        '<p class="note">The watch vibrates the moment a prayer begins. Respects quiet time.</p>' +
        '</div></section>' +

        '<button type="button" class="btn" id="saveBtn">Save settings</button>' +
        '</main>';

    var script =
        '(function(){' +
        'var $=function(id){return document.getElementById(id)};' +
        'function loadSettings(){' +
        'var hash=window.location.hash.substring(1);if(!hash)return;' +
        'try{var s=JSON.parse(decodeURIComponent(hash));' +
        'if(s.calculationMethod)$("calculationMethod").value=s.calculationMethod;' +
        'if(s.asrMethod)$("asrMethod").value=s.asrMethod;' +
        '$("manualLocation").checked=!!s.manualLocation;' +
        'if(s.manualLatitude)$("manualLatitude").value=s.manualLatitude;' +
        'if(s.manualLongitude)$("manualLongitude").value=s.manualLongitude;' +
        '$("timelineEnabled").checked=s.timelineEnabled!==false;' +
        'if(s.reminderMinutes)$("reminderMinutes").value=s.reminderMinutes;' +
        '$("vibrationEnabled").checked=s.vibrationEnabled!==false;' +
        '}catch(e){console.log("settings load: "+e)}' +
        '}' +
        'function syncManualInputs(){' +
        '$("manualInputs").className="manual-inputs"+($("manualLocation").checked?" show":"")' +
        '}' +
        'function syncReminderCard(){' +
        '$("reminderCard").hidden=!$("timelineEnabled").checked' +
        '}' +
        'function save(){' +
        'var out={' +
        'calculationMethod:$("calculationMethod").value,' +
        'asrMethod:$("asrMethod").value,' +
        'manualLocation:$("manualLocation").checked,' +
        'manualLatitude:parseFloat($("manualLatitude").value)||0,' +
        'manualLongitude:parseFloat($("manualLongitude").value)||0,' +
        'timelineEnabled:$("timelineEnabled").checked,' +
        'reminderMinutes:parseInt($("reminderMinutes").value,10),' +
        'vibrationEnabled:$("vibrationEnabled").checked' +
        '};' +
        'window.location.href="pebblejs://close#"+encodeURIComponent(JSON.stringify(out))' +
        '}' +
        'loadSettings();' +
        'syncManualInputs();' +
        'syncReminderCard();' +
        '$("manualLocation").addEventListener("change",syncManualInputs);' +
        '$("timelineEnabled").addEventListener("change",syncReminderCard);' +
        '$("saveBtn").addEventListener("click",save);' +
        '})();';

    return html + '<script>' + script + '</script></body></html>';
}
