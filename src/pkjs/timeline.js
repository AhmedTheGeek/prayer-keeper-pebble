/**
 * Timeline Module
 * Creates and manages Timeline pins for prayer times
 */

var settings = require('./settings');

// Pin ID prefix
var PIN_PREFIX = 'prayer-keeper-';

// Prayer names for pins
var PRAYER_NAMES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

// Timeline icons mapping
var PRAYER_ICONS = {
    fajr: 'system://images/TIMELINE_SUN',
    dhuhr: 'system://images/TIMELINE_SUN',
    asr: 'system://images/TIMELINE_SUN',
    maghrib: 'system://images/TIMELINE_SUN',
    isha: 'system://images/TIMELINE_SUN'
};

/**
 * Format date as ISO string for Timeline API
 * @param {Date} date - Date object
 * @returns {string} ISO formatted date string
 */
function toISOString(date) {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Format date as YYYY-MM-DD for pin IDs
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDateForId(date) {
    var year = date.getFullYear();
    var month = (date.getMonth() + 1).toString();
    if (month.length === 1) month = '0' + month;
    var day = date.getDate().toString();
    if (day.length === 1) day = '0' + day;
    return year + '-' + month + '-' + day;
}

/**
 * Create a Timeline pin for a prayer
 * @param {string} prayerName - Name of prayer (lowercase)
 * @param {Date} prayerTime - Prayer time
 * @param {string} displayName - Display name for prayer
 * @param {string} formattedTime - Formatted time string
 * @param {number} reminderMinutes - Minutes before for reminder
 * @returns {Object} Timeline pin object
 */
function createPrayerPin(prayerName, prayerTime, displayName, formattedTime, reminderMinutes) {
    var dateStr = formatDateForId(prayerTime);
    var pinId = PIN_PREFIX + prayerName + '-' + dateStr;

    var pin = {
        id: pinId,
        time: toISOString(prayerTime),
        duration: 30,
        layout: {
            type: 'genericPin',
            title: displayName + ' Prayer',
            subtitle: formattedTime,
            tinyIcon: PRAYER_ICONS[prayerName] || 'system://images/GENERIC_CONFIRMATION'
        }
    };

    // Add reminder if enabled
    if (reminderMinutes > 0) {
        var reminderTime = new Date(prayerTime.getTime() - (reminderMinutes * 60000));
        pin.reminders = [{
            time: toISOString(reminderTime),
            layout: {
                type: 'genericReminder',
                title: displayName + ' in ' + reminderMinutes + ' min',
                tinyIcon: PRAYER_ICONS[prayerName] || 'system://images/GENERIC_CONFIRMATION'
            }
        }];
    }

    return pin;
}

/**
 * Insert a pin into the Timeline
 * @param {Object} pin - Pin object
 * @param {function} callback - Called with success boolean
 */
function insertPin(pin, callback) {
    // Use Pebble Timeline API
    Pebble.timelineSubscribe(
        'prayer-times',
        function() {
            console.log('Subscribed to prayer-times topic');
        },
        function(error) {
            console.log('Timeline subscribe error: ' + error);
        }
    );

    // Insert the pin
    var request = new XMLHttpRequest();
    var url = 'https://timeline-api.rebble.io/v1/user/pins/' + encodeURIComponent(pin.id);

    request.open('PUT', url, true);
    request.setRequestHeader('Content-Type', 'application/json');
    request.setRequestHeader('X-User-Token', Pebble.getTimelineToken());

    request.onload = function() {
        if (request.status === 200) {
            console.log('Pin inserted: ' + pin.id);
            if (callback) callback(true);
        } else {
            console.log('Pin insert failed: ' + request.status);
            if (callback) callback(false);
        }
    };

    request.onerror = function() {
        console.log('Pin insert network error');
        if (callback) callback(false);
    };

    request.send(JSON.stringify(pin));
}

/**
 * Delete a pin from the Timeline
 * @param {string} pinId - Pin ID to delete
 * @param {function} callback - Called with success boolean
 */
function deletePin(pinId, callback) {
    var request = new XMLHttpRequest();
    var url = 'https://timeline-api.rebble.io/v1/user/pins/' + encodeURIComponent(pinId);

    request.open('DELETE', url, true);
    request.setRequestHeader('X-User-Token', Pebble.getTimelineToken());

    request.onload = function() {
        if (request.status === 200 || request.status === 404) {
            console.log('Pin deleted: ' + pinId);
            if (callback) callback(true);
        } else {
            console.log('Pin delete failed: ' + request.status);
            if (callback) callback(false);
        }
    };

    request.onerror = function() {
        console.log('Pin delete network error');
        if (callback) callback(false);
    };

    request.send();
}

/**
 * Create pins for all prayers for a given day
 * @param {Object} prayerTimes - Prayer times object with Date values
 * @param {Object} options - Options {reminderMinutes, use24Hour}
 * @param {function} callback - Called when all pins created
 */
function createDayPins(prayerTimes, options, callback) {
    if (!settings.getSetting('timelineEnabled')) {
        console.log('Timeline disabled, skipping pins');
        if (callback) callback();
        return;
    }

    options = options || {};
    var reminderMinutes = options.reminderMinutes || settings.getSetting('reminderMinutes') || 10;
    var use24Hour = options.use24Hour || false;

    var prayers = [
        { key: 'fajr', name: 'Fajr', time: prayerTimes.fajr },
        { key: 'dhuhr', name: 'Dhuhr', time: prayerTimes.dhuhr },
        { key: 'asr', name: 'Asr', time: prayerTimes.asr },
        { key: 'maghrib', name: 'Maghrib', time: prayerTimes.maghrib },
        { key: 'isha', name: 'Isha', time: prayerTimes.isha }
    ];

    var completed = 0;
    var total = prayers.length;

    prayers.forEach(function(prayer) {
        var formattedTime = formatTimeForPin(prayer.time, use24Hour);
        var pin = createPrayerPin(prayer.key, prayer.time, prayer.name, formattedTime, reminderMinutes);

        insertPin(pin, function(success) {
            completed++;
            if (completed === total && callback) {
                callback();
            }
        });
    });
}

/**
 * Format time for pin display
 * @param {Date} date - Date object
 * @param {boolean} use24Hour - Use 24-hour format
 * @returns {string} Formatted time string
 */
function formatTimeForPin(date, use24Hour) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var minStr = minutes < 10 ? '0' + minutes : '' + minutes;

    if (use24Hour) {
        var hourStr = hours < 10 ? '0' + hours : '' + hours;
        return hourStr + ':' + minStr;
    } else {
        var ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        if (hours === 0) hours = 12;
        return hours + ':' + minStr + ' ' + ampm;
    }
}

/**
 * Refresh all pins (delete old, create new)
 * @param {Object} todayTimes - Today's prayer times
 * @param {Object} tomorrowTimes - Tomorrow's prayer times (optional)
 * @param {Object} options - Options
 * @param {function} callback - Called when complete
 */
function refreshPins(todayTimes, tomorrowTimes, options, callback) {
    if (!settings.getSetting('timelineEnabled')) {
        console.log('Timeline disabled');
        if (callback) callback();
        return;
    }

    // Create today's pins
    createDayPins(todayTimes, options, function() {
        // Optionally create tomorrow's pins
        if (tomorrowTimes) {
            createDayPins(tomorrowTimes, options, callback);
        } else if (callback) {
            callback();
        }
    });
}

// Export module
module.exports = {
    createPrayerPin: createPrayerPin,
    insertPin: insertPin,
    deletePin: deletePin,
    createDayPins: createDayPins,
    refreshPins: refreshPins,
    PIN_PREFIX: PIN_PREFIX
};
