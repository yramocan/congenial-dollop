const LIMIT = 8; // Items per page
let currentIndex = 0; // Current index of the last visible item

const items = document.querySelectorAll(".magazine-cell");
const loadMoreButton = document.getElementById("load-more");

// Function to initialize visibility
function initializeVisibility() {
  // Initially hide all items
  items.forEach((item, index) => {
    item.style.display = index < LIMIT ? "block" : "none";
  });

  // Update the index to track how many items are visible
  currentIndex = LIMIT;

  // Hide the "Load More" button if all items are already visible
  updateLoadMoreButton();
}

// Function to load more items
function loadMoreItems() {
  const nextIndex = Math.min(currentIndex + LIMIT, items.length); // Determine the next set of items to show

  // Show the next batch of items
  for (let i = currentIndex; i < nextIndex; i++) {
    items[i].style.display = "block";
  }

  // Update the current index
  currentIndex = nextIndex;

  // Hide the "Load More" button if all items are visible
  updateLoadMoreButton();
}

// Function to update the visibility of the "Load More" button
function updateLoadMoreButton() {
  if (currentIndex >= items.length) {
    loadMoreButton.style.display = "none";
  }
}

// Add event listener to the "Load More" button
loadMoreButton.addEventListener("click", loadMoreItems);

// Initialize visibility on page load
initializeVisibility();