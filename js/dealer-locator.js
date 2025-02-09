/**
 * Adds a dealer location item to the sidebar list.
 *
 * This function dynamically creates a new `.dealer-location-item` element
 * and appends it to the `.dealer-locator-sidebar-items-list` container.
 *
 * @param {Object} location - The dealer location data.
 */
function addDealerToSidebar(location) {
    // Select the sidebar container
    const sidebarList = document.querySelector('.dealer-locator-sidebar-items-list');
    if (!sidebarList) {
        console.error("Sidebar container '.dealer-locator-sidebar-items-list' not found.");
        return;
    }

    // Create dealer location item container
    const dealerItem = document.createElement('div');
    dealerItem.classList.add('dealer-location-item');

    // Create the dealer name section
    let dealerHTML = `<div class="dealer-item-name">${location.name}</div><div class="dealer-location-item-facts w-layout-vflex">`;

    /**
     * Helper function to generate a row only if the value exists.
     * @param {string} icon - The material icon text.
     * @param {string} value - The value to be displayed.
     * @returns {string} - The HTML string for the row.
     */
    function createRow(icon, value) {
        return value && value.trim() ? `
            <div class="dealer-location-item-row">
                <div class="dealer-location-item-icon">${icon}</div>
                <div class="dealer-item-address">${value}</div>
            </div>` : '';
    }

    // Append rows conditionally
    dealerHTML += createRow("location_on",
        location.address && location.city && location.state && location.postalCode
            ? `${location.address}<br>${location.city}, ${location.state} ${location.postalCode}`
            : null);
    dealerHTML += createRow("call", location.phone);
    dealerHTML += createRow("schedule", location.hours);
    dealerHTML += createRow("person", location.diversity);

    // Close the container
    dealerHTML += `</div>`;

    // Set the innerHTML and append to sidebar
    dealerItem.innerHTML = dealerHTML;
    sidebarList.appendChild(dealerItem);
}

/**
 * Adds dealer locations to the Mapbox map.
 * @param {Array} locations - Array of dealer location objects.
 * @param {Object} map - Mapbox map instance.
 */
function addLocationsToMap(locations, map) {
    for (const location of locations) {
        const marker = new mapboxgl.Marker({ className: "dealer-location-pin", color: "red" })
            .setLngLat([location.lon, location.lat])
            .setPopup(
                new mapboxgl.Popup({ offset: 25 })
                    .setHTML(
                        `<h3>${location.name}</h3><p>${location.address}<br>${location.city}, ${location.state} ${location.postalCode}</p>`
                    )
            )
            .addTo(map);
        marker.getElement().addEventListener('click', () => {
            map.flyTo({
                center: [location.lon, location.lat],
                zoom: 13,
                essential: true
            });
        });
    }
}

/**
 * Recursively fetch all pages of dealer locations, returning a single array
 * of DOM elements (.dealer-location-item.w-dyn-item).
 * @param {string} url - URL to fetch dealer locations from.
 * @returns {Promise<Array>} - Array of dealer location elements.
 */
async function fetchNextLocations(url) {
    const pageContent = await fetchPageContent(url);
    if (!pageContent) return [];

    const $dealerLocationsCollection = $(pageContent).find('.dealer-locations-collection');
    const nextPageUrl = getNextPageURL($dealerLocationsCollection);
    const currentPageItems = $dealerLocationsCollection.find('.dealer-location-item.w-dyn-item').toArray();

    return nextPageUrl ? currentPageItems.concat(await fetchNextLocations(nextPageUrl)) : currentPageItems;
}

/**
 * Fetches the raw HTML content from a URL.
 * @param {string} url - URL to fetch.
 * @returns {Promise<string|null>} - HTML content or null on failure.
 */
async function fetchPageContent(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Network error: ${response.status} ${response.statusText}`);
        return await response.text();
    } catch (error) {
        console.error('Error fetching the page:', error);
        return null;
    }
}

/**
 * Gets all dealer location elements (first page and fetched pages).
 * @returns {Promise<Array>} - Array of parsed dealer location objects.
 */
async function getAllDealerLocations() {
    const currentDealerElements = Array.from(getFirstPageDealerElements());
    const nextPageUrl = getNextPageURL($('.dealer-locations-collection'));

    const allDealerElements = nextPageUrl
        ? currentDealerElements.concat(await fetchNextLocations(nextPageUrl))
        : currentDealerElements;

    return allDealerElements.map(parseDealerElement);
}

/**
 * Gets the dealer location elements already present in the DOM.
 * @returns {HTMLCollection} - Collection of dealer location elements.
 */
function getFirstPageDealerElements() {
    return document.querySelector('.dealer-locations-collection .w-dyn-items')?.children || [];
}

/**
 * Retrieves the user's current latitude and longitude.
 * @param {function} callback - Callback function with (error, location) params.
 */
function getLocation(callback) {
    navigator.geolocation.getCurrentPosition(
        (position) => callback(null, { lat: position.coords.latitude, lon: position.coords.longitude }),
        (error) => callback(`Error getting location: ${error.message}`, null)
    );
}

/**
 * Extracts the next page URL from the .dealer-locations-collection container.
 * @param {jQuery} $container - jQuery-wrapped container element.
 * @returns {string|null} - Next page URL or null if not found.
 */
function getNextPageURL($container) {
    if ($container.length === 0) {
        console.log('No element found with class dealer-locations-collection');
        return null;
    }

    const hrefValue = $container.find('a.w-pagination-next').attr('href');
    return hrefValue ? (window.location.origin + window.location.pathname + hrefValue) : null;
}

/**
 * Parses a dealer location element into a JSON object.
 * @param {HTMLElement} dealerElement - The dealer location element.
 * @returns {Object} - Parsed dealer location data.
 */
function parseDealerElement(dealerElement) {
    const attributesToExtract = [
        "id", "name", "description", "address", "city", "state",
        "postalCode", "lat", "lon", "phone", "hours", "diversity", "website"
    ];

    const dealerData = {};
    attributesToExtract.forEach(attr => {
        let attrValue = dealerElement.getAttribute(`data-dealer-${attr}`);

        if (attr === "lat" || attr === "lon") {
            dealerData[attr] = attrValue ? parseFloat(attrValue) : null;
        } else {
            dealerData[attr] = attrValue ? attrValue.replace(/\\n/g, "<br>") : null;
        }
    });

    return dealerData;
}

/**
 * Initializes and sets up the Mapbox map.
 * @returns {Object} - Mapbox map instance.
 */
function setUpLocatorMap() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiYWR3YXRlcm1lZGlhIiwiYSI6ImNtNnd0M3MwbDBtOXAyam9xODlicW5reHkifQ.dAVvtYk3QDyhI2ImGbBabg';

    const map = new mapboxgl.Map({
        container: 'dealer-locator-map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-94.58650494238294, 39.10092961416475],
        zoom: 6
    });

    const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        marker: true,
    });

    map.addControl(geocoder, 'top-left');
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    return map;
}

// Initialize the Mapbox map
const map = setUpLocatorMap();

/**
 * Main function: Fetches user location and dealer locations, then updates the map.
 */
(async function main() {
    // Get user location and update map center
    getLocation((error, coords) => {
        if (error) {
            console.error(error);
        } else {
            map.setCenter([coords.lon, coords.lat]);
        }
    });

    const locations = await getAllDealerLocations();
    document.querySelector(".dealer-locator-sidebar-header-text").innerHTML = `${locations.length} Dealerships`;
    for (const location of locations) {
        addDealerToSidebar(location);
    }

    // Load dealer locations on map
    map.on('load', () => {
        addLocationsToMap(locations, map);
    });
})();

// // Find the .w-dyn-items container inside the .dealer-locations-collection
// const wDynItems = container.querySelector('.w-dyn-items');
// if (!wDynItems) {
//     console.warn('No element found with class .w-dyn-items inside .dealer-locations-collection');
//     return;
// }

// // Append each location item to .w-dyn-items
// // `allLocations` is an array of DOM elements
// allLocations.forEach((locationItem) => {
//     wDynItems.appendChild(locationItem);
// });