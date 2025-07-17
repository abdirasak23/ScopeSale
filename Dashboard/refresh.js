// Method 1: Refresh entire page
function refreshPage() {
    location.reload();
}

// Method 2: Refresh specific element content
function refreshElement(elementId, newContent) {
    document.getElementById(elementId).innerHTML = newContent;
}

// Method 3: Refresh element with current timestamp
function refreshWithTimestamp(elementId) {
    const timestamp = new Date().toLocaleString();
    document.getElementById(elementId).innerHTML = `Updated: ${timestamp}`;
}

// Method 4: Refresh multiple elements
function refreshMultipleElements(elementUpdates) {
    elementUpdates.forEach(update => {
        document.getElementById(update.id).innerHTML = update.content;
    });
}

// Method 5: Auto-refresh function with interval
function autoRefresh(elementId, contentFunction, intervalMs = 5000) {
    setInterval(() => {
        document.getElementById(elementId).innerHTML = contentFunction();
    }, intervalMs);
}

// Method 6: Refresh with fade effect
function refreshWithFade(elementId, newContent) {
    const element = document.getElementById(elementId);
    element.style.opacity = '0';
    setTimeout(() => {
        element.innerHTML = newContent;
        element.style.opacity = '1';
    }, 300);
}