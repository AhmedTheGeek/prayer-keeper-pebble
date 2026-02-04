/**
 * Location Module
 * Handles GPS location, geocoding, and persistent caching
 */

// Cached location data (in-memory)
var cachedLocation = null;
var cachedTimestamp = 0;
var CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for GPS refresh

// localStorage key for persistent cache
var LOCATION_CACHE_KEY = 'prayerkeeper_location_cache';

/**
 * Suggest calculation method based on geographic region
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {string} Suggested calculation method key
 */
function suggestMethodByRegion(latitude, longitude) {
    // North America
    if (latitude >= 25 && latitude <= 70 && longitude >= -170 && longitude <= -50) {
        return 'isna';
    }
    // Middle East / Gulf (check before Egypt due to overlap)
    if (latitude >= 12 && latitude <= 35 && longitude >= 35 && longitude <= 60) {
        return 'umm_al_qura';
    }
    // Egypt / North Africa
    if (latitude >= 20 && latitude <= 35 && longitude >= -20 && longitude <= 35) {
        return 'egyptian';
    }
    // South Asia
    if (latitude >= 5 && latitude <= 40 && longitude >= 60 && longitude <= 100) {
        return 'karachi';
    }
    // Iran (check after Middle East due to overlap)
    if (latitude >= 25 && latitude <= 40 && longitude >= 44 && longitude <= 63) {
        return 'tehran';
    }
    // Southeast Asia
    if (latitude >= -10 && latitude <= 20 && longitude >= 95 && longitude <= 145) {
        return 'singapore';
    }
    // Default - Muslim World League
    return 'mwl';
}

/**
 * Get cached location from localStorage (persistent across app restarts)
 * @returns {Object|null} Cached location or null
 */
function getCachedLocation() {
    // First check in-memory cache
    if (cachedLocation) {
        return cachedLocation;
    }

    // Try localStorage
    try {
        var stored = localStorage.getItem(LOCATION_CACHE_KEY);
        if (stored) {
            var data = JSON.parse(stored);
            // Check if cache is still valid (24 hours for persistent cache)
            var age = Date.now() - (data.timestamp || 0);
            if (age < 24 * 60 * 60 * 1000) {
                cachedLocation = data;
                cachedTimestamp = data.timestamp;
                console.log('Loaded location from persistent cache');
                return data;
            }
        }
    } catch (e) {
        console.log('Error loading location cache: ' + e);
    }

    return null;
}

/**
 * Save location to persistent cache
 * @param {Object} location - Location object {latitude, longitude, name}
 */
function saveLocationCache(location) {
    cachedLocation = location;
    cachedTimestamp = Date.now();
    cachedLocation.timestamp = cachedTimestamp;

    try {
        localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cachedLocation));
        console.log('Saved location to persistent cache');
    } catch (e) {
        console.log('Error saving location cache: ' + e);
    }
}

/**
 * Get current location via GPS
 * @param {function} successCallback - Called with {latitude, longitude}
 * @param {function} errorCallback - Called with error object
 * @param {Object} options - Optional geolocation options
 */
function getCurrentLocation(successCallback, errorCallback, options) {
    options = options || {};

    // Check in-memory cache first (for rapid requests)
    var now = Date.now();
    if (cachedLocation && (now - cachedTimestamp) < CACHE_DURATION) {
        console.log('Using in-memory cached location');
        successCallback(cachedLocation);
        return;
    }

    var geoOptions = {
        enableHighAccuracy: options.highAccuracy || false,
        timeout: options.timeout || 30000,
        maximumAge: options.maximumAge || CACHE_DURATION
    };

    navigator.geolocation.getCurrentPosition(
        function(position) {
            var location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: now
            };
            cachedLocation = location;
            cachedTimestamp = now;
            console.log('Got fresh GPS location: ' + location.latitude + ', ' + location.longitude);
            successCallback(location);
        },
        function(error) {
            console.log('Location error: ' + error.code + ' - ' + error.message);

            // Return cached location if available, even if expired
            if (cachedLocation) {
                console.log('Using expired cached location');
                successCallback(cachedLocation);
            } else {
                // Try persistent cache as last resort
                var persistent = getCachedLocation();
                if (persistent) {
                    console.log('Using persistent cached location');
                    successCallback(persistent);
                } else {
                    errorCallback({
                        code: 1,
                        message: 'Location unavailable'
                    });
                }
            }
        },
        geoOptions
    );
}

/**
 * Reverse geocode coordinates to get location name
 * Uses Nominatim OpenStreetMap API (free, no key required)
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {function} callback - Called with location name string
 */
function reverseGeocode(latitude, longitude, callback) {
    var url = 'https://nominatim.openstreetmap.org/reverse?' +
              'format=json&lat=' + latitude + '&lon=' + longitude +
              '&zoom=10&addressdetails=1';

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('User-Agent', 'PrayerKeeperPebble/1.0');

    xhr.onload = function() {
        if (xhr.status === 200) {
            try {
                var response = JSON.parse(xhr.responseText);
                var name = formatLocationName(response);
                callback(name);
            } catch (e) {
                console.log('Geocode parse error: ' + e);
                callback('Unknown');
            }
        } else {
            console.log('Geocode HTTP error: ' + xhr.status);
            callback('Unknown');
        }
    };

    xhr.onerror = function() {
        console.log('Geocode network error');
        callback('Unknown');
    };

    xhr.timeout = 10000;
    xhr.ontimeout = function() {
        console.log('Geocode timeout');
        callback('Unknown');
    };

    xhr.send();
}

/**
 * Format location name from Nominatim response
 * @param {Object} response - Nominatim API response
 * @returns {string} Formatted location name
 */
function formatLocationName(response) {
    if (!response || !response.address) {
        return 'Unknown';
    }

    var addr = response.address;
    var city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
    var country = addr.country_code ? addr.country_code.toUpperCase() : '';

    if (city && country) {
        // Truncate if too long for watch display
        var name = city + ', ' + country;
        if (name.length > 28) {
            name = city.substring(0, 24) + '...';
        }
        return name;
    } else if (city) {
        return city;
    } else if (country) {
        return country;
    }

    return 'Unknown';
}

/**
 * Get location with name (combines GPS + geocoding)
 * @param {function} successCallback - Called with {latitude, longitude, name}
 * @param {function} errorCallback - Called with error
 */
function getLocationWithName(successCallback, errorCallback) {
    getCurrentLocation(
        function(location) {
            // If we already have a cached name for similar coordinates, use it
            var cached = getCachedLocation();
            if (cached && cached.name) {
                var latDiff = Math.abs(location.latitude - cached.latitude);
                var lonDiff = Math.abs(location.longitude - cached.longitude);
                if (latDiff < 0.01 && lonDiff < 0.01) {
                    console.log('Using cached location name');
                    successCallback({
                        latitude: location.latitude,
                        longitude: location.longitude,
                        name: cached.name,
                        suggestedMethod: suggestMethodByRegion(location.latitude, location.longitude)
                    });
                    return;
                }
            }

            // Need to geocode
            reverseGeocode(location.latitude, location.longitude, function(name) {
                successCallback({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    name: name,
                    suggestedMethod: suggestMethodByRegion(location.latitude, location.longitude)
                });
            });
        },
        errorCallback
    );
}

/**
 * Clear the location cache (both in-memory and persistent)
 */
function clearCache() {
    cachedLocation = null;
    cachedTimestamp = 0;
    try {
        localStorage.removeItem(LOCATION_CACHE_KEY);
    } catch (e) {
        console.log('Error clearing location cache: ' + e);
    }
}

// Export functions
module.exports = {
    getCurrentLocation: getCurrentLocation,
    reverseGeocode: reverseGeocode,
    getLocationWithName: getLocationWithName,
    suggestMethodByRegion: suggestMethodByRegion,
    getCachedLocation: getCachedLocation,
    saveLocationCache: saveLocationCache,
    clearCache: clearCache
};
