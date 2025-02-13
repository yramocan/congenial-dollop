const DEALER_SIDEBAR_ITEM_PREFIX = "dealer-sidebar-location-"
const map = setUpLocatorMap();
const geocoder = setUpGeocoder();

let cachedBBox = null;  // Store the bounding box covering all previous fetches
let dealersCache = [];  // Store fetched dealer locations
const dealerIDsSet = new Set(); // Stores unique dealer IDs
let markers = []; // Store markers on map
const markerIDs = new Set(); // Track added marker IDs to prevent duplicates
let totalDealerCount = 0;

map.addControl(geocoder, 'top-left');

navigator.geolocation.getCurrentPosition(
    (position) => map.setCenter([position.coords.longitude, position.coords.latitude]),
    (error) => console.error(error)
);

map.on("moveend", async () => {
    const bounds = map.getBounds();
    const center = map.getCenter();
    const geoJSON = await fetchDealerLocationsInBoundingBox(bounds);
    sortLocationsByDistance([center.lon, center.lat], geoJSON);
    configureSidebar(geoJSON.features);
    addLocationsToMap(geoJSON.features, map);
});

geocoder.on('result', (event) => {
    const coordinates = event.result.geometry.coordinates;
    sortLocationsByDistance(coordinates, geoJSON);
    configureSidebar(geoJSON.features);

    const idOfFirstItemInSidebar = DEALER_SIDEBAR_ITEM_PREFIX + geoJSON.features[0].properties.id;
    scrollToItemWithID(idOfFirstItemInSidebar);
});

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
    let dealerHTML = `<div class="dealer-item-name">${props.dealer_name}</div><div class="dealer-location-item-facts w-layout-vflex">`;

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
        props.address && props.city && props.state && props.postal_code
            ? `${props.address}<br>${props.city}, ${props.state} ${props.postal_code}`
            : null);
    dealerHTML += createRow("call", props.phone);
    dealerHTML += createRow("schedule", props.open_hours);
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

        // Skip if marker already exists
        if (markerIDs.has(props.id)) continue;

        const marker = new mapboxgl.Marker({ className: "dealer-location-pin", color: "#f31b37" })
            .setLngLat([longitude, latitude])
            .setPopup(
                new mapboxgl.Popup({ offset: 25 })
                    .setHTML(createMarkerPopUpHTML(props))
            )
            .addTo(map);

        // Store marker reference and mark as added
        markers.push(marker);
        markerIDs.add(props.id);

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
    document.querySelector(".dealer-locator-sidebar-header-text").innerHTML = `${totalDealerCount} Dealerships`;
    for (const feature of features) {
        // Skip if marker already exists
        if (markerIDs.has(feature.properties.id)) continue;
        addDealerToSidebar(feature);
    }
}

function createMarkerPopUpHTML(props) {
    let popUpHTML = `
        <h3>${props.dealer_name}</h3>
        <p>${props.address}<br>${props.city}, ${props.state} ${props.postal_code}</p>  
    `;

    if (props.description) {
        popUpHTML += `<p>${props.description}</p>`
    }

    if (props.open_hours) {
        popUpHTML += `<p>${props.open_hours}</p>`
    }

    if (props.website) {
        popUpHTML += `<a href="${props.website}" target="_blank" rel="noopener noreferrer">${props.website}</a>`
    }

    if (props.diversity) {
        popUpHTML += `<p>${props.diversity}</p>`
    }

    return popUpHTML;
}

function dealerToGeoJSON(dealer) {
    return {
        type: "Feature",
        geometry: {
            type: "Point",
            coordinates: [dealer.longitude, dealer.latitude],
        },
        properties: {
            id: dealer.id,
            slug: dealer.slug,
            dealer_name: dealer.dealer_name,
            description: dealer.description ? dealer.description.replace(/\\n/g, "<br>") : dealer.description,
            address: dealer.address,
            city: dealer.city,
            state: dealer.state,
            postal_code: dealer.postal_code,
            phone: dealer.phone,
            open_hours: dealer.open_hours ? dealer.open_hours.replace(/\\n/g, "<br>") : dealer.open_hours,
            diversity: dealer.diversity,
            website: dealer.website,
        }
    };
}

async function fetchDealerLocationsInBoundingBox(bounds) {
    // Extract southwest (min) and northeast (max) coordinates from Mapbox's LngLatBounds
    const minLng = bounds.getSouthWest().lng;
    const minLat = bounds.getSouthWest().lat;
    const maxLng = bounds.getNorthEast().lng;
    const maxLat = bounds.getNorthEast().lat;
    const newBBox = [minLng, minLat, maxLng, maxLat];

    // If we already have a cached bounding box, check if the new bbox is inside it
    if (cachedBBox && isBBoxInside(newBBox, cachedBBox)) return turf.featureCollection(dealersCache);

    const apiUrl = `https://tl-moda.yramocan.workers.dev/dealers?min_latitude=${minLat}&max_latitude=${maxLat}&min_longitude=${minLng}&max_longitude=${maxLng}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Error fetching dealer locations: ${response.statusText}`);

        const data = await response.json();
        const newDealers = data.dealers.map(dealerToGeoJSON);
        totalDealerCount = data.metadata.total_dealers;

        // Filter out duplicates by checking `id`
        const uniqueDealers = newDealers.filter(dealer => {
            if (dealerIDsSet.has(dealer.properties.id)) {
                return false; // Already exists, don't add it
            }
            dealerIDsSet.add(dealer.properties.id); // Mark this dealer as seen
            return true;
        });

        dealersCache = [...dealersCache, ...uniqueDealers];

        cachedBBox = cachedBBox
            ? mergeBoundingBoxes(cachedBBox, newBBox)
            : newBBox;

        return turf.featureCollection(dealersCache);
    } catch (error) {
        console.error("Failed to fetch dealers:", error);
        return [];
    }
}

// Helper function: Check if one bounding box is inside another
function isBBoxInside(innerBBox, outerBBox) {
    return (
        innerBBox[0] >= outerBBox[0] && // minLng is greater
        innerBBox[1] >= outerBBox[1] && // minLat is greater
        innerBBox[2] <= outerBBox[2] && // maxLng is smaller
        innerBBox[3] <= outerBBox[3]    // maxLat is smaller
    );
}

// Helper function: Merge two bounding boxes into the smallest bbox that contains both
function mergeBoundingBoxes(bbox1, bbox2) {
    return [
        Math.min(bbox1[0], bbox2[0]), // minLng
        Math.min(bbox1[1], bbox2[1]), // minLat
        Math.max(bbox1[2], bbox2[2]), // maxLng
        Math.max(bbox1[3], bbox2[3])  // maxLat
    ];
}

function replaceNewlinesInJSON(json) {
    function traverse(obj) {
        if (Array.isArray(obj)) {
            console.log("is array");
            return obj.map(item => (typeof item === "string" ? item.replace(/\\n/g, "<br>") : traverse(item)));
        } else if (typeof obj === "object" && obj !== null) {
            for (const key in obj) {
                obj[key] = traverse(obj[key]);
            }
        }
        return obj;
    }

    traverse(json);
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
