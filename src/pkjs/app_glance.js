/**
 * App Glance Module
 * Pushes glance slices to show the next prayer next to the app icon
 * in the Pebble launcher.
 *
 * Debugging: `pebble logs` should show the JSON payload pushed and any
 * failure details from the OS. If the launcher subtitle stays blank, look
 * for "app glance reload failed" lines; the failed slice array tells you
 * which slice the OS rejected and why.
 */

// Icon URLs for the launcher glance. We try the app-bundled icon first
// (referencing the publishedMedia entry in package.json), and fall back
// to a guaranteed system icon if Pebble rejects the custom one. This
// keeps the glance visible while debugging icon-resolution problems.
var GLANCE_ICON_APP = 'app://images/SALAT_ICON';
var GLANCE_ICON_FALLBACK = 'system://images/SCHEDULED_EVENT';

/**
 * Format a Date as ISO 8601 with milliseconds.
 * The PebbleKit JS expirationTime field accepts the full ISO format;
 * stripping milliseconds in earlier drafts may have caused silent rejection.
 */
function toISOString(date) {
    return date.toISOString();
}

/**
 * Format a Date as a short time string for the subtitle.
 */
function formatTime(date, use24Hour) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var minStr = minutes < 10 ? '0' + minutes : '' + minutes;

    if (use24Hour) {
        var hourStr = hours < 10 ? '0' + hours : '' + hours;
        return hourStr + ':' + minStr;
    }
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return hours + ':' + minStr + ' ' + ampm;
}

/**
 * Build a single glance slice for a prayer.
 * The slice expires at the prayer time, so the next slice takes over.
 */
function buildSlice(name, prayerDate, use24Hour, iconUrl) {
    return {
        expirationTime: toISOString(prayerDate),
        layout: {
            icon: iconUrl,
            subtitleTemplateString: name + ' ' + formatTime(prayerDate, use24Hour)
        }
    };
}

function buildSlicesWithIcon(ordered, tomorrowFajr, now, use24Hour, iconUrl) {
    var slices = [];
    for (var i = 0; i < ordered.length; i++) {
        if (ordered[i].time > now) {
            slices.push(buildSlice(ordered[i].name, ordered[i].time, use24Hour, iconUrl));
        }
    }
    if (tomorrowFajr) {
        slices.push(buildSlice('Fajr', tomorrowFajr, use24Hour, iconUrl));
    }
    return slices;
}

/**
 * Reload the app glance from today's and tomorrow's prayer times.
 *
 * Pushes one slice per upcoming prayer for today plus tomorrow's Fajr,
 * each expiring at its own prayer time. The system shows the first
 * non-expired slice, so the launcher subtitle auto-advances all day.
 *
 * @param {Object} todayTimes - {fajr, sunrise, dhuhr, asr, maghrib, isha} as Date objects
 * @param {Object} tomorrowTimes - same shape, optional (used after Isha)
 * @param {Object} options - {use24Hour}
 * @param {function} callback - called with success boolean
 */
function reload(todayTimes, tomorrowTimes, options, callback) {
    options = options || {};
    var now = new Date();

    if (typeof Pebble.appGlanceReload !== 'function') {
        console.log('[glance] Pebble.appGlanceReload missing on this firmware');
        if (callback) callback(false);
        return;
    }

    var ordered = [
        { name: 'Fajr', time: todayTimes.fajr },
        { name: 'Sunrise', time: todayTimes.sunrise },
        { name: 'Dhuhr', time: todayTimes.dhuhr },
        { name: 'Asr', time: todayTimes.asr },
        { name: 'Maghrib', time: todayTimes.maghrib },
        { name: 'Isha', time: todayTimes.isha }
    ];
    var tomorrowFajr = (tomorrowTimes && tomorrowTimes.fajr) || null;

    // Try the custom app icon first; if the OS rejects the reload (most
    // commonly because `app://images/SALAT_ICON` doesn't resolve to a
    // publishedMedia entry it can render at glance size), retry once with
    // a known-good system icon so the launcher subtitle still appears.
    function tryReload(iconUrl, isRetry) {
        var slices = buildSlicesWithIcon(ordered, tomorrowFajr, now, options.use24Hour, iconUrl);
        if (slices.length === 0) {
            console.log('[glance] no upcoming prayers, nothing to push');
            if (callback) callback(false);
            return;
        }

        console.log('[glance] pushing ' + slices.length + ' slices with icon '
            + iconUrl + ': ' + JSON.stringify(slices));

        try {
            Pebble.appGlanceReload(slices,
                function(reloaded) {
                    var count = (reloaded && reloaded.length) || 0;
                    console.log('[glance] reload OK with ' + iconUrl + ', '
                        + count + ' slice(s) accepted');
                    if (callback) callback(true);
                },
                function(failed) {
                    console.log('[glance] reload FAILED with ' + iconUrl
                        + '. Rejected slices: ' + JSON.stringify(failed));
                    if (!isRetry && iconUrl !== GLANCE_ICON_FALLBACK) {
                        console.log('[glance] retrying with fallback icon');
                        tryReload(GLANCE_ICON_FALLBACK, true);
                    } else if (callback) {
                        callback(false);
                    }
                }
            );
        } catch (e) {
            console.log('[glance] threw: ' + e);
            if (callback) callback(false);
        }
    }

    tryReload(GLANCE_ICON_APP, false);
}

module.exports = {
    reload: reload
};
