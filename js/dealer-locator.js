const DEALER_SIDEBAR_ITEM_PREFIX = "dealer-sidebar-location-"

/**
 * Adds a dealer location item to the sidebar list.
 *
 * This function dynamically creates a new `.dealer-location-item` element
 * and appends it to the `.dealer-locator-sidebar-items-list` container.
 *
 * @param {Object} location - The dealer location GeoJSON feature.
 */
function addDealerToSidebar(location) {
    const props = location.properties
    // Select the sidebar container
    const sidebarList = document.querySelector('.dealer-locator-sidebar-items-list');
    if (!sidebarList) {
        console.error("Sidebar container '.dealer-locator-sidebar-items-list' not found.");
        return;
    }

    // Create dealer location item container
    const dealerItem = document.createElement('div');
    dealerItem.classList.add('dealer-location-item');
    dealerItem.id = DEALER_SIDEBAR_ITEM_PREFIX + props.id;

    // Create the dealer name section
    let dealerHTML = `<div class="dealer-item-name">${props.name}</div><div class="dealer-location-item-facts w-layout-vflex">`;

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
        props.address && props.city && props.state && props.postalCode
            ? `${props.address}<br>${props.city}, ${props.state} ${props.postalCode}`
            : null);
    dealerHTML += createRow("call", props.phone);
    dealerHTML += createRow("schedule", props.hours);
    dealerHTML += createRow("person", props.diversity);

    if (props.distance) {
        dealerHTML += `<p><b>${props.distance.toFixed(2)} miles away</b></p>`;
    }

    // Close the container
    dealerHTML += `</div>`;

    // Set the innerHTML and append to sidebar
    dealerItem.innerHTML = dealerHTML;

    dealerItem.addEventListener('click', () => {
        setSidebarItemActive(dealerItem.id);
        flyToLocation(location);
    });

    sidebarList.appendChild(dealerItem);
}

/**
 * Adds dealer locations to the Mapbox map.
 * @param {Array} locations - Array of dealer location objects (as GeoJSON features).
 * @param {Object} map - Mapbox map instance.
 */
function addLocationsToMap(locations, map) {
    for (const location of locations) {
        const props = location.properties
        const latitude = location.geometry.coordinates[1];
        const longitude = location.geometry.coordinates[0];

        const marker = new mapboxgl.Marker({ className: "dealer-location-pin", color: "#f31b37" })
            .setLngLat([longitude, latitude])
            .setPopup(
                new mapboxgl.Popup({ offset: 25 })
                    .setHTML(createMarkerPopUpHTML(props))
            )
            .addTo(map);
        marker.getElement().addEventListener('click', () => {
            const itemID = DEALER_SIDEBAR_ITEM_PREFIX + props.id;
            setSidebarItemActive(itemID);
            scrollToItemWithID(itemID);
            map.flyTo({
                center: [longitude, latitude],
                zoom: 13,
                essential: true
            });
        });
    }
}

function calculateDistanceToLocationFeature(feature, originCoordinates) {
    const options = { units: 'miles' };
    return turf.distance(
        { "type": "Point", "coordinates": originCoordinates },
        feature.geometry,
        options
    );
}

function configureSidebar(features) {
    document.querySelector(".dealer-locator-sidebar-header-text").innerHTML = `${features.length} Dealerships`;
    removeSidebarLocations();
    for (const feature of features) {
        addDealerToSidebar(feature);
    }
}

function createMarkerPopUpHTML(props) {
    let popUpHTML = `
        <h3>${props.name}</h3>
        <p>${props.address}<br>${props.city}, ${props.state} ${props.postalCode}</p>  
    `;

    if (props.diversity) {
        popUpHTML += `<p>${props.diversity}</p>`
    }

    if (props.hours) {
        popUpHTML += `<p>${props.hours}</p>`
    }

    if (props.website) {
        popUpHTML += `<a href="${props.website}" target="_blank" rel="noopener noreferrer">${props.website}</a>`
    }

    return popUpHTML;
}

/**
 * Recursively fetch all pages of dealer locations, returning a single array
 * of DOM elements (.dealer-location-item.w-dyn-item).
 * @param {string} url - URL to fetch dealer locations from.
 * @returns {Promise<Array>} - Array of dealer location elements.
 */
async function fetchNextLocations(url) {
    const pageContent = await fetchPageContent(url);
    if (!pageContent) {
        console.log(`Page content not found for URL: ${url}.`);
        return [];
    }

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
   * Use Mapbox GL JS's `flyTo` to move the camera smoothly
   * a given dealer location feature.
   **/
function flyToLocation(feature) {
    map.flyTo({
        center: feature.geometry.coordinates,
        zoom: 15
    });
}

/**
 * Gets all dealer location elements (first page and fetched pages).
 * @returns {Promise<Array>} - Array of parsed dealer location objects.
 */
async function getAllDealerLocations() {
    const currentDealerElements = getCurrentDealerElements();
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
function getCurrentDealerElements() {
    return Array.from(document.querySelector('.dealer-locations-collection .w-dyn-items')?.children || []);
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
 * Parses a dealer location element into a GeoJSON feature.
 * @param {HTMLElement} dealerElement - The dealer location element.
 * @returns {Object} - Parsed dealer location data as a GeoJSON feature.
 */
function parseDealerElement(dealerElement) {
    const lon = parseFloat(dealerElement.getAttribute("data-dealer-lon"));
    const lat = parseFloat(dealerElement.getAttribute("data-dealer-lat"));

    let feature = {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [lon, lat]
        },
        "properties": {}
    };

    const attributesToExtract = [
        "id", "name", "description", "address", "city", "state",
        "postalCode", "phone", "hours", "diversity", "website"
    ];

    const properties = {};
    attributesToExtract.forEach(attr => {
        let attrValue = dealerElement.getAttribute(`data-dealer-${attr}`);
        properties[attr] = attrValue ? attrValue.replace(/\\n/g, "<br>") : null;
    });

    feature.properties = properties;
    return feature;
}

function removeSidebarLocations() {
    const sidebar = document.querySelector('.dealer-locator-sidebar-items-list');
    while (sidebar.firstChild) {
        sidebar.removeChild(sidebar.firstChild);
    }
}

function scrollToItemWithID(elementID) {
    const listItem = document.getElementById(elementID);
    const height = listItem.offsetHeight;
    const topPos = listItem.offsetTop - height;
    document.getElementById('dealer-locator-sidebar').scrollTop = topPos;
}

function setSidebarItemActive(itemID) {
    const sidebarList = document.querySelector('.dealer-locator-sidebar-items-list');
    const activeItems = sidebarList.getElementsByClassName('active');
    for (const activeItem of activeItems) {
        activeItem.classList.remove('active');
    }

    document.getElementById(itemID).classList.add("active");
}

function setUpGeocoder() {
    return new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        marker: true,
    });
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

    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    return map;
}

function sortLocationsByDistance(originCoordinates, geoJSON) {
    for (const feature of geoJSON.features) {
        feature.properties.distance = calculateDistanceToLocationFeature(feature, originCoordinates);
    }

    geoJSON.features.sort((a, b) => {
        if (a.properties.distance > b.properties.distance) {
            return 1;
        }
        if (a.properties.distance < b.properties.distance) {
            return -1;
        }
        return 0;
    });
}

// Initialize the Mapbox map
const map = setUpLocatorMap();
const geocoder = setUpGeocoder();
map.addControl(geocoder, 'top-left');

// Get user location and update map center
getLocation((error, coords) => {
    if (error) {
        console.error(error);
    } else {
        map.setCenter([coords.lon, coords.lat]);
    }
});

/**
 * Main function: Fetches user location and dealer locations, then updates the map.
 */
(async function main() {
    const features = await getAllDealerLocations();
    const geoJSON = {
        type: 'FeatureCollection',
        features: features
    };

    getLocation((error, coords) => {
        if (error) {
            console.error(error);
        } else {
            sortLocationsByDistance([coords.lon, coords.lat], geoJSON);
            configureSidebar(geoJSON.features);
        }
    });

    configureSidebar(geoJSON.features);

    geocoder.on('result', (event) => {
        const coordinates = event.result.geometry.coordinates;
        sortLocationsByDistance(coordinates, geoJSON);
        configureSidebar(geoJSON.features);

        const idOfFirstItemInSidebar = DEALER_SIDEBAR_ITEM_PREFIX + geoJSON.features[0].properties.id;
        scrollToItemWithID(idOfFirstItemInSidebar);
    });

    // Load dealer locations on map
    map.on('load', () => {
        addLocationsToMap(geoJSON.features, map);
    });
})();
