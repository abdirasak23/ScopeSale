// Enhanced search.js with Supabase integration
const supabaseUrl = 'https://jvcrkjkhmglgrwkadzxw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y3JramtobWdsZ3J3a2Fkenh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTQwOTgsImV4cCI6MjA2NzI3MDA5OH0.4uGTPJg2Nbl8QvGy6UhlBJlJ4lUtMl9f6vTJ_jf8z3o';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const searchInput = document.getElementById('searchInput');
const recommendations = document.getElementById('recommendations');
const productContainer = document.querySelector('.pro');

// Debounce function to limit API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Search products in database (only for current business)
async function searchProducts(query) {
    if (!query.trim()) {
        recommendations.classList.remove('show');
        return;
    }

    // Wait for productFetcher to be ready and initialized
    if (!window.productFetcher || !productFetcher.userBusinessId) {
        recommendations.classList.remove('show');
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('business_id', productFetcher.userBusinessId) // Only this business's products
            .ilike('name', `%${query}%`)
            .limit(10)
            .order('name');

        if (error) {
            console.error('Search error:', error);
            return;
        }

        showRecommendations(data, query);

    } catch (error) {
        console.error('Search error:', error);
    }
}

// Show recommendations based on search results (only for current business)
function showRecommendations(products, query) {
    if (!products || products.length === 0) {
        // Show "no results" message
        recommendations.innerHTML = `
            <div class="recommendation-category">No Results</div>
            <div class="recommendation-item no-results">
                No products found for "${query}"
            </div>
        `;
        recommendations.classList.add('show');
        return;
    }

    // Filter again by business_id in case (defensive)
    const filteredProducts = products.filter(
        p => p.business_id === productFetcher.userBusinessId
    );

    // Clear previous recommendations
    recommendations.innerHTML = '';

    // Group products by category
    const groupedProducts = filteredProducts.reduce((acc, product) => {
        if (!acc[product.category]) {
            acc[product.category] = [];
        }
        acc[product.category].push(product);
        return acc;
    }, {});

    // Display products grouped by category
    Object.entries(groupedProducts).forEach(([category, categoryProducts]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'recommendation-category';
        categoryDiv.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        recommendations.appendChild(categoryDiv);

        categoryProducts.forEach(product => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'recommendation-item';
            itemDiv.innerHTML = `
                <div class="rec-product-name">${product.name}</div>
                <div class="rec-product-price">$${product.price.toFixed(2)}</div>
            `;
            itemDiv.addEventListener('click', () => {
                searchInput.value = product.name;
                recommendations.classList.remove('show');
                displayProductInContainer(product);
            });
            recommendations.appendChild(itemDiv);
        });
    });

    recommendations.classList.add('show');
}

// Display selected product in the main product container
function displayProductInContainer(product) {
    // Always display in #product-content .pro
    const productContent = document.getElementById('product-content');
    const productContainer = productContent ? productContent.querySelector('.pro') : null;

    if (!productContainer) return;

    // Update or create the product display
    productContainer.innerHTML = `
        <div class="product" data-id="${product.id}">
            <div class="product-info">
                <div class="info-left">
                    <p class="thename">${product.name}</p>
                    <p class="category">${product.category}</p>
                </div>
                <div class="info-right">
                    <p class="price">$${product.price.toFixed(2)}</p>
                    <p class="stock" style="color: ${product.stock > 0 ? '#28a745' : '#dc3545'}">
                        ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </p>
                </div>
            </div>
        </div>
    `;

    // Attach add to cart event like fetching.js
    const productDiv = productContainer.querySelector('.product');
    if (productDiv && window.productFetcher) {
        productDiv.addEventListener('click', (event) => {
            const productId = parseInt(productDiv.dataset.id);
            window.productFetcher.handleAddToCart(productId, event);
        });
    }

    // Switch to product tab to show the product
    const productTab = document.querySelector('.home[data-target="product-content"]');
    const productSection = document.getElementById('product-content');
    if (productTab && productSection) {
        // Remove active class from all tabs and sections
        document.querySelectorAll('.home').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));

        // Activate product tab and section
        productTab.classList.add('active');
        productSection.classList.add('active');
    }
}

// Load and display all products when search is cleared
async function loadAllProducts() {
    try {
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading products:', error);
            return;
        }

        if (data && data.length > 0) {
            displayProductInContainer(data[0]); // Show the most recent product
        }

    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Debounced search function
const debouncedSearch = debounce(searchProducts, 300);

// Event listeners
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query) {
        debouncedSearch(query);
    } else {
        recommendations.classList.remove('show');
        selectedIndex = -1;
    }
});

searchInput.addEventListener('focus', (e) => {
    const query = e.target.value.trim();
    if (query) {
        debouncedSearch(query);
    }
});

// Hide recommendations when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        recommendations.classList.remove('show');
        selectedIndex = -1;
    }
});

// Handle keyboard navigation
let selectedIndex = -1;
const getRecommendationItems = () => recommendations.querySelectorAll('.recommendation-item:not(.no-results)');

searchInput.addEventListener('keydown', (e) => {
    const items = getRecommendationItems();

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelection(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
            items[selectedIndex].click();
        } else {
            // If no item selected, search for the current input
            const query = searchInput.value.trim();
            if (query) {
                searchProducts(query);
            }
        }
    } else if (e.key === 'Escape') {
        recommendations.classList.remove('show');
        selectedIndex = -1;
        searchInput.blur();
    }
});

function updateSelection(items) {
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.style.backgroundColor = '#e3f2fd';
            item.style.borderRadius = '4px';
        } else {
            item.style.backgroundColor = '';
            item.style.borderRadius = '';
        }
    });
}

// Initialize - load a product when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadAllProducts();
});

// Add some CSS styles for better UX
const style = document.createElement('style');
style.textContent = `
    .recommendations {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        max-height: 400px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
    }
    
    .recommendations.show {
        display: block;
    }
    
    .recommendation-category {
        padding: 12px 16px;
        font-weight: 600;
        background: #f8f9fa;
        border-bottom: 1px solid #e9ecef;
        color: #495057;
        font-size: 14px;
    }
    
    .recommendation-item {
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid #f1f1f1;
        transition: background-color 0.2s ease;
    }
    
    .recommendation-item:hover {
        background-color: #f8f9fa;
    }
    
    .recommendation-item:last-child {
        border-bottom: none;
    }
    
    .recommendation-item.no-results {
        color: #6c757d;
        font-style: italic;
        cursor: default;
    }
    
    .recommendation-item.no-results:hover {
        background-color: transparent;
    }
    
    .rec-product-name {
        font-weight: 500;
        color: #212529;
        margin-bottom: 2px;
    }
    
    .rec-product-price {
        font-size: 12px;
        color: #28a745;
        font-weight: 600;
    }
    
    .search-container {
        position: relative;
    }
    
    .search-container .search {
        position: relative;
    }
`;
document.head.appendChild(style);