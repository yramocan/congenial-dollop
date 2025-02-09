const LIMIT = 8; // Items per page
let currentIndex = 0; // Current index for visible items
let activeFilter = 'all'; // Currently active filter

const items = document.querySelectorAll('.w-dyn-item'); // All items to paginate
const loadMoreGroup = document.getElementById('load-more-group');
const loadMoreButton = document.getElementById('load-more'); // Load More button

// Function to initialize pagination
function initializePagination() {
  currentIndex = 0; // Reset current index
  updatePagination(); // Apply pagination
}

// Function to update visible items based on pagination and filtering
function updatePagination() {
  let visibleCount = 0; // Track number of visible items

  items.forEach(item => {
    const itemYear = item.getAttribute('data-year'); // Get item's year
    const matchesFilter = activeFilter === 'all' || itemYear === activeFilter;

    if (matchesFilter && visibleCount < currentIndex + LIMIT) {
      item.style.display = ''; // Show matching item
      visibleCount++;
    } else if (matchesFilter) {
      item.style.display = 'none'; // Hide extra items
    } else {
      item.style.display = 'none'; // Hide items that don't match the filter
    }
  });

  // Check if there are more items to load
  const remainingItems = Array.from(items).filter(
    item => item.style.display === 'none' && (activeFilter === 'all' || item.getAttribute('data-year') === activeFilter)
  );
  loadMoreGroup.style.display = remainingItems.length > 0 ? 'flex' : 'none'; // Show/hide Load More button
}

// Function to handle "Load More" button click
function loadMoreItems() {
  currentIndex += LIMIT; // Increase the visible range
  updatePagination(); // Update visibility
}

// Function to set up filters
function configureMagazineFilters() {
  const filterContainer = document.getElementById('year-filters'); // Filter buttons container
  const yearsSet = new Set(); // To store unique years

  // Extract years from items
  items.forEach(item => {
    const issueDate = item.querySelector('.magazine-issue-date').textContent.trim();
    const year = new Date(issueDate).getFullYear();
    yearsSet.add(year);
    item.setAttribute('data-year', year); // Store year as a data attribute
  });

  // Convert yearsSet to a sorted array
  const yearsArray = Array.from(yearsSet).sort((a, b) => b - a);

  // Create "All" button
  const allButton = document.createElement('label');
  allButton.innerHTML = `<input type="radio" name="year-filter" value="all" checked><span>All</span>`;
  filterContainer.appendChild(allButton);

  // Create buttons for each unique year
  yearsArray.forEach(year => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="radio" name="year-filter" value="${year}"><span>${year}</span>`;
    filterContainer.appendChild(label);
  });

  // Add event listeners to filters
  const radioButtons = document.querySelectorAll('#year-filters input[type="radio"]');
  radioButtons.forEach(radio => {
    radio.addEventListener('change', function () {
      activeFilter = this.value; // Update the active filter
      initializePagination(); // Reset pagination for the new filter
    });
  });
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
  configureMagazineFilters(); // Set up year filters
  initializePagination(); // Initialize pagination
  loadMoreButton.addEventListener('click', loadMoreItems); // Add event listener to Load More button
});