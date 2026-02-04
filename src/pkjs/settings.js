/**
 * Settings Module
 * Handles user settings persistence
 */

// Default settings
var DEFAULT_SETTINGS = {
    calculationMethod: 'mwl',
    asrMethod: 'shafi',
    manualLocation: false,
    manualLatitude: 0,
    manualLongitude: 0,
    timelineEnabled: true,
    reminderMinutes: 10,
    vibrationEnabled: true
};

// Settings keys for localStorage
var SETTINGS_KEY = 'prayerkeeper_settings';

/**
 * Load settings from localStorage
 * @returns {Object} Current settings
 */
function loadSettings() {
    try {
        var stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            var settings = JSON.parse(stored);
            // Merge with defaults to handle new settings
            return Object.assign({}, DEFAULT_SETTINGS, settings);
        }
    } catch (e) {
        console.log('Error loading settings: ' + e);
    }
    return Object.assign({}, DEFAULT_SETTINGS);
}

/**
 * Save settings to localStorage
 * @param {Object} settings - Settings to save
 */
function saveSettings(settings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        console.log('Settings saved');
    } catch (e) {
        console.log('Error saving settings: ' + e);
    }
}

/**
 * Get a single setting value
 * @param {string} key - Setting key
 * @returns {*} Setting value
 */
function getSetting(key) {
    var settings = loadSettings();
    return settings.hasOwnProperty(key) ? settings[key] : DEFAULT_SETTINGS[key];
}

/**
 * Set a single setting value
 * @param {string} key - Setting key
 * @param {*} value - Setting value
 */
function setSetting(key, value) {
    var settings = loadSettings();
    settings[key] = value;
    saveSettings(settings);
}

/**
 * Update multiple settings
 * @param {Object} updates - Settings to update
 */
function updateSettings(updates) {
    var settings = loadSettings();
    Object.assign(settings, updates);
    saveSettings(settings);
}

/**
 * Reset settings to defaults
 */
function resetSettings() {
    saveSettings(Object.assign({}, DEFAULT_SETTINGS));
}

/**
 * Parse settings from configuration page URL
 * @param {string} configUrl - URL from configuration page
 * @returns {Object} Parsed settings
 */
function parseConfigUrl(configUrl) {
    var settings = {};

    try {
        // Extract the fragment/query part after #
        var hashIndex = configUrl.indexOf('#');
        if (hashIndex === -1) {
            hashIndex = configUrl.indexOf('?');
        }

        if (hashIndex === -1) {
            return settings;
        }

        var configData = configUrl.substring(hashIndex + 1);

        // Try to decode as JSON first (our format)
        try {
            var decoded = decodeURIComponent(configData);
            settings = JSON.parse(decoded);
        } catch (e) {
            // Fall back to URL params parsing
            var pairs = configData.split('&');
            for (var i = 0; i < pairs.length; i++) {
                var pair = pairs[i].split('=');
                if (pair.length === 2) {
                    var key = decodeURIComponent(pair[0]);
                    var value = decodeURIComponent(pair[1]);

                    // Convert types
                    if (value === 'true') value = true;
                    else if (value === 'false') value = false;
                    else if (!isNaN(value) && value !== '') value = parseFloat(value);

                    settings[key] = value;
                }
            }
        }
    } catch (e) {
        console.log('Error parsing config URL: ' + e);
    }

    return settings;
}

/**
 * Get the configuration page URL with current settings
 * @param {string} baseUrl - Base configuration page URL
 * @returns {string} URL with settings data
 */
function getConfigPageUrl(baseUrl) {
    var settings = loadSettings();
    var encoded = encodeURIComponent(JSON.stringify(settings));
    return baseUrl + '#' + encoded;
}

// Export module
module.exports = {
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    getSetting: getSetting,
    setSetting: setSetting,
    updateSettings: updateSettings,
    resetSettings: resetSettings,
    parseConfigUrl: parseConfigUrl,
    getConfigPageUrl: getConfigPageUrl,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS
};
