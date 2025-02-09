document.addEventListener("DOMContentLoaded", () => {
    const itemsPerPage = 3;
    const itemsContainer = document.querySelector(".items");
    const items = itemsContainer.children;
    const prevButton = document.getElementById("prev");
    const nextButton = document.getElementById("next");
  
    const totalItems = items.length; // Total items already in the DOM
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    let currentPage = 1;
  
    // Show the current page of items
    function showPage(page) {
      let startIndex, endIndex;
      if (page === totalPages && totalItems % itemsPerPage !== 0) {
        // For the last page, ensure we "pull up" the items to show 3 items if there are fewer than 3 left
        endIndex = totalItems;
        startIndex = Math.max(0, totalItems - itemsPerPage);
      } else {
        // Regular pagination
        startIndex = (page - 1) * itemsPerPage;
        endIndex = page * itemsPerPage;
      }
  
      // Show only the items in the current range
      Array.from(items).forEach((item, index) => {
        item.style.display = index >= startIndex && index < endIndex ? "block" : "none";
      });
  
      // Update button states
      prevButton.disabled = page === 1;
      nextButton.disabled = page === totalPages;
    }
  
    // Event listeners for buttons
    prevButton.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        showPage(currentPage);
      }
    });
  
    nextButton.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        showPage(currentPage);
      }
    });
  
    // Initialize the first page
    showPage(currentPage);
  });