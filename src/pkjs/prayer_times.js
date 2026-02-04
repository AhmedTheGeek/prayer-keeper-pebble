/**
 * Prayer Times Calculator Module
 * Wraps the Adhan library for prayer time calculations
 */

var adhan = require('adhan');

// Calculation method mapping
var CALCULATION_METHODS = {
    'mwl': adhan.CalculationMethod.MuslimWorldLeague,
    'isna': adhan.CalculationMethod.NorthAmerica,
    'egyptian': adhan.CalculationMethod.Egyptian,
    'umm_al_qura': adhan.CalculationMethod.UmmAlQura,
    'karachi': adhan.CalculationMethod.Karachi,
    'tehran': adhan.CalculationMethod.Tehran,
    'singapore': adhan.CalculationMethod.Singapore,
    'moonsighting': adhan.CalculationMethod.MoonsightingCommittee
};

// Asr calculation methods
var ASR_METHODS = {
    'shafi': adhan.Madhab.Shafi,
    'hanafi': adhan.Madhab.Hanafi
};

/**
 * Calculate prayer times for a given location and date
 * @param {number} latitude - Latitude in degrees
 * @param {number} longitude - Longitude in degrees
 * @param {Date} date - Date to calculate for (default: today)
 * @param {string} method - Calculation method key
 * @param {string} asrMethod - Asr calculation method (shafi/hanafi)
 * @returns {Object} Prayer times object
 */
function calculatePrayerTimes(latitude, longitude, date, method, asrMethod) {
    date = date || new Date();
    method = method || 'mwl';
    asrMethod = asrMethod || 'shafi';

    // Get calculation parameters
    var params = CALCULATION_METHODS[method] ?
                 CALCULATION_METHODS[method]() :
                 adhan.CalculationMethod.MuslimWorldLeague();

    // Set Asr method
    params.madhab = ASR_METHODS[asrMethod] || adhan.Madhab.Shafi;

    // Create coordinates
    var coordinates = new adhan.Coordinates(latitude, longitude);

    // Calculate prayer times
    var prayerTimes = new adhan.PrayerTimes(coordinates, date, params);

    return {
        fajr: prayerTimes.fajr,
        sunrise: prayerTimes.sunrise,
        dhuhr: prayerTimes.dhuhr,
        asr: prayerTimes.asr,
        maghrib: prayerTimes.maghrib,
        isha: prayerTimes.isha
    };
}

/**
 * Convert a Date object to minutes since midnight
 * @param {Date} date - Date object
 * @returns {number} Minutes since midnight
 */
function dateToMinutes(date) {
    return date.getHours() * 60 + date.getMinutes();
}

/**
 * Format a Date to a readable time string
 * @param {Date} date - Date object
 * @param {boolean} use24Hour - Use 24-hour format
 * @returns {string} Formatted time string
 */
function formatTime(date, use24Hour) {
    var hours = date.getHours();
    var minutes = date.getMinutes();

    if (use24Hour) {
        return pad(hours) + ':' + pad(minutes);
    } else {
        var ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        if (hours === 0) hours = 12;
        return hours + ':' + pad(minutes) + ' ' + ampm;
    }
}

/**
 * Pad a number with leading zero
 */
function pad(num) {
    return num < 10 ? '0' + num : '' + num;
}

/**
 * Determine the next prayer and calculate countdown
 * @param {Object} prayerTimes - Prayer times object with Date values
 * @param {Date} now - Current time (default: now)
 * @returns {Object} Next prayer info {name, time, countdownSeconds}
 */
function getNextPrayer(prayerTimes, now) {
    now = now || new Date();

    var prayers = [
        { name: 'Fajr', time: prayerTimes.fajr },
        { name: 'Sunrise', time: prayerTimes.sunrise },
        { name: 'Dhuhr', time: prayerTimes.dhuhr },
        { name: 'Asr', time: prayerTimes.asr },
        { name: 'Maghrib', time: prayerTimes.maghrib },
        { name: 'Isha', time: prayerTimes.isha }
    ];

    // Find the next prayer
    for (var i = 0; i < prayers.length; i++) {
        if (prayers[i].time > now) {
            var countdownSeconds = Math.floor((prayers[i].time - now) / 1000);
            return {
                name: prayers[i].name,
                time: prayers[i].time,
                countdownSeconds: countdownSeconds
            };
        }
    }

    // All prayers passed - next is tomorrow's Fajr
    return {
        name: 'Fajr',
        time: null,
        countdownSeconds: -1,
        isTomorrow: true
    };
}

/**
 * Get complete prayer data for sending to watch
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {string} method - Calculation method
 * @param {string} asrMethod - Asr method
 * @param {boolean} use24Hour - Use 24-hour format
 * @returns {Object} Complete prayer data
 */
function getPrayerData(latitude, longitude, method, asrMethod, use24Hour) {
    var now = new Date();
    var today = calculatePrayerTimes(latitude, longitude, now, method, asrMethod);
    var nextPrayer = getNextPrayer(today, now);

    // If next prayer is tomorrow's Fajr, calculate it
    if (nextPrayer.isTomorrow) {
        var tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        var tomorrowTimes = calculatePrayerTimes(latitude, longitude, tomorrow, method, asrMethod);

        var countdownSeconds = Math.floor((tomorrowTimes.fajr - now) / 1000);
        nextPrayer = {
            name: 'Fajr',
            time: tomorrowTimes.fajr,
            countdownSeconds: countdownSeconds
        };
    }

    return {
        times: {
            fajr: dateToMinutes(today.fajr),
            sunrise: dateToMinutes(today.sunrise),
            dhuhr: dateToMinutes(today.dhuhr),
            asr: dateToMinutes(today.asr),
            maghrib: dateToMinutes(today.maghrib),
            isha: dateToMinutes(today.isha)
        },
        nextPrayer: {
            name: nextPrayer.name,
            timeFormatted: formatTime(nextPrayer.time, use24Hour),
            countdownSeconds: nextPrayer.countdownSeconds
        },
        rawTimes: today
    };
}

// Export functions
module.exports = {
    calculatePrayerTimes: calculatePrayerTimes,
    getPrayerData: getPrayerData,
    getNextPrayer: getNextPrayer,
    dateToMinutes: dateToMinutes,
    formatTime: formatTime,
    CALCULATION_METHODS: Object.keys(CALCULATION_METHODS),
    ASR_METHODS: Object.keys(ASR_METHODS)
};
