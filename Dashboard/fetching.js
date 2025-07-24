// fetching.js - Complete Product Fetching with Business ID Filtering

// Initialize Supabase client
const supabaseUrl = 'https://jvcrkjkhmglgrwkadzxw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y3JramtobWdsZ3J3a2Fkenh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTQwOTgsImV4cCI6MjA2NzI3MDA5OH0.4uGTPJg2Nbl8QvGy6UhlBJlJ4lUtMl9f6vTJ_jf8z3o';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Product Fetcher Class with Enhanced Business ID Handling
class ProductFetcher {
    constructor() {
        this.products = [];
        this.currentUser = null;
        this.userBusinessId = null;
        this.isInitialized = false;
        this.cartManager = window.cartManager || null;
        this.initializationPromise = null;
        
        // Start initialization
        this.initializationPromise = this.initializeUser();
    }

    // Initialize user session and get business ID
    async initializeUser() {
        try {
            console.log('🔄 Initializing ProductFetcher...');
            
            // Get current user session
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
            
            if (userError) {
                console.error('❌ Error getting user:', userError);
                this.showError('Failed to authenticate user');
                return false;
            }
            
            if (!user) {
                console.log('⚠️  No authenticated user found');
                this.showError('Please log in to view products');
                this.showNoProducts('Please log in to view products');
                return false;
            }
            
            this.currentUser = user;
            console.log('✅ User authenticated:', user.id);
            
            // Get user's business ID from bussiness table
            const businessId = await this.fetchUserBusinessId();
            
            if (businessId) {
                console.log('✅ Business ID found:', businessId);
                this.isInitialized = true;
                // Fetch products after successful initialization
                await this.fetchAllProducts();
                return true;
            } else {
                console.log('⚠️  No business ID found');
                this.showNoProducts('No business found for your account');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error initializing user:', error);
            this.showError('Failed to initialize user session');
            this.showNoProducts('Failed to initialize user session');
            return false;
        }
    }

    // Fetch user's business ID from bussiness table (owner or staff)
    async fetchUserBusinessId() {
        try {
            if (!this.currentUser) {
                console.log('⚠️  No current user available');
                return null;
            }

            const userId = this.currentUser.id;
            const userEmail = this.currentUser.email;

            // 1. Try to find business where user is the owner
            let { data: businessData, error: businessError } = await supabaseClient
                .from('bussiness')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            // 2. If not found, try to find business where user is staff (staff_emails contains userEmail)
            if (!businessData) {
                // Try with contains operator (array column)
                let { data: staffBusinesses, error: staffError } = await supabaseClient
                    .from('bussiness')
                    .select('*')
                    .contains('staff_emails', [userEmail]);

                // Fallback: If contains fails (for older Postgres or if staff_emails is not array), check manually
                if (staffError) {
                    // Try fallback: fetch all businesses and check manually
                    const { data: allBusinesses, error: allError } = await supabaseClient
                        .from('bussiness')
                        .select('*');
                    if (!allError && Array.isArray(allBusinesses)) {
                        staffBusinesses = allBusinesses.filter(biz =>
                            Array.isArray(biz.staff_emails) && biz.staff_emails.includes(userEmail)
                        );
                    }
                }

                if (staffBusinesses && staffBusinesses.length > 0) {
                    businessData = staffBusinesses[0];
                }
            }

            if (!businessData || !businessData.id) {
                console.log('⚠️  No business found for user or staff email');
                this.userBusinessId = null;
                return null;
            }

            this.userBusinessId = businessData.id;
            console.log('✅ User business found:', {
                id: this.userBusinessId,
                name: businessData.company_name,
                user_id: businessData.user_id,
                staff_emails: businessData.staff_emails
            });

            return this.userBusinessId;

        } catch (error) {
            console.error('❌ Error getting user business ID:', error);
            this.showError('Failed to get business information');
            return null;
        }
    }

    // Wait for initialization to complete
    async waitForInitialization() {
        if (this.isInitialized) {
            return true;
        }
        
        if (this.initializationPromise) {
            return await this.initializationPromise;
        }
        
        return false;
    }

    // Fetch all products from database filtered by user's business ID
    async fetchAllProducts() {
        try {
            // Ensure initialization is complete
            await this.waitForInitialization();
            
            if (!this.userBusinessId) {
                console.log('⚠️  No business ID available - showing no products');
                this.showNoProducts('No business found for your account');
                return [];
            }

            console.log('🔍 Fetching products for business ID:', this.userBusinessId);

            // Query products table filtered by business_id
            const { data, error } = await supabaseClient
                .from('products')
                .select('*, unit_amount, unit_type')
                .eq('business_id', this.userBusinessId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error fetching products:', error);
                this.showError('Failed to fetch products: ' + error.message);
                this.showNoProducts('Failed to fetch products');
                return [];
            }

            console.log('📦 Products query result:', {
                business_id: this.userBusinessId,
                products_found: data ? data.length : 0,
                products: data
            });

            this.products = data || [];
            
            if (this.products.length === 0) {
                console.log('📦 No products found for business ID:', this.userBusinessId);
                this.showNoProducts('No products found for your business');
            } else {
                console.log('✅ Products found:', this.products.length);
                this.displayProducts(this.products);
            }
            
            return this.products;
            
        } catch (error) {
            console.error('❌ Fetch all products error:', error);
            this.showError('Failed to fetch products: ' + error.message);
            this.showNoProducts('Failed to fetch products');
            return [];
        }
    }

    // Fetch products by category (filtered by business ID)
    async fetchProductsByCategory(category) {
        try {
            await this.waitForInitialization();
            
            if (!this.userBusinessId) {
                console.log('⚠️  No business ID available for category filter');
                this.showNoProducts('No business found for your account');
                return [];
            }

            console.log('🔍 Fetching products by category:', category, 'for business ID:', this.userBusinessId);

            let query = supabaseClient
                .from('products')
                .select('*, unit_amount, unit_type')
                .eq('business_id', this.userBusinessId)
                .order('created_at', { ascending: false });

            if (category && category !== 'all') {
                query = query.eq('category', category);
            }

            const { data, error } = await query;

            if (error) {
                console.error('❌ Error fetching by category:', error);
                this.showError('Failed to fetch products by category');
                return [];
            }

            console.log('📦 Category filter result:', {
                category: category,
                business_id: this.userBusinessId,
                products_found: data ? data.length : 0
            });

            this.products = data || [];
            
            if (this.products.length === 0) {
                this.showNoProducts(`No products found in category: ${category}`);
            } else {
                this.displayProducts(this.products);
            }
            
            return this.products;
            
        } catch (error) {
            console.error('❌ Category fetch error:', error);
            this.showError('Failed to fetch products by category');
            return [];
        }
    }

    // Search products (filtered by business ID)
    async searchProducts(searchQuery) {
        try {
            await this.waitForInitialization();
            
            if (!this.userBusinessId) {
                console.log('⚠️  No business ID available for search');
                this.showNoProducts('No business found for your account');
                return [];
            }

            console.log('🔍 Searching products:', searchQuery, 'for business ID:', this.userBusinessId);

            const { data, error } = await supabaseClient
                .from('products')
                .select('*, unit_amount, unit_type')
                .eq('business_id', this.userBusinessId)
                .or(`name.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error searching products:', error);
                this.showError('Failed to search products');
                return [];
            }

            console.log('🔍 Search result:', {
                query: searchQuery,
                business_id: this.userBusinessId,
                products_found: data ? data.length : 0
            });

            this.products = data || [];
            
            if (this.products.length === 0) {
                this.showNoProducts(`No products found for: "${searchQuery}"`);
            } else {
                this.displayProducts(this.products);
            }
            
            return this.products;
            
        } catch (error) {
            console.error('❌ Search error:', error);
            this.showError('Failed to search products');
            return [];
        }
    }

    // Fetch single product by ID (filtered by business ID)
    async fetchProductById(productId) {
        try {
            await this.waitForInitialization();
            
            if (!this.userBusinessId) {
                console.log('⚠️  No business ID available for product fetch');
                return null;
            }

            console.log('🔍 Fetching product by ID:', productId, 'for business ID:', this.userBusinessId);

            const { data, error } = await supabaseClient
                .from('products')
                .select('*, unit_amount, unit_type')
                .eq('id', productId)
                .eq('business_id', this.userBusinessId)
                .single();

            if (error) {
                console.error('❌ Error fetching product by ID:', error);
                return null;
            }

            console.log('✅ Product found:', data);
            return data;
            
        } catch (error) {
            console.error('❌ Product fetch error:', error);
            return null;
        }
    }

    formatUnitInfo(product) {
        const unitAmount = product.unit_amount || 0;
        const unitType = product.unit_type || '';
        const stock = product.stock || 0;
        
        // Create unit display string with colored spans
        let unitDisplay = '';
        
        if (unitAmount > 0 && unitType) {
            // Both amount and type available
            unitDisplay = `<span class="unit-amounts" style='color: black;'>${unitAmount}</span> <span class="unit-types" style='color: black;'>${unitType}</span>`;
        } else if (unitAmount > 0 && !unitType) {
            // Only amount available
            unitDisplay = `<span class="unit-amounts" style='color: black;'>${unitAmount}</span> <span class="unit-types">units</span>`;
        } else if (!unitAmount && unitType) {
            // Only type available (no amount)
            unitDisplay = `<span class="unit-types" style='color: black;'>${unitType}</span>`;
        } else {
            // Neither available
            unitDisplay = '<span class="no-unit-info" style="color: black;" >No unit info</span>';
        }
        
        // Create stock status with appropriate styling
        const stockStatus = stock > 0 ? 
            '<span class="stock-in">In Stock</span>' : 
            '<span class="stock-out">Out of Stock</span>';
        
        return `${unitDisplay} • ${stockStatus}`;
    }

    // Display products in existing HTML structure
    displayProducts(products) {
        console.log('🎨 Displaying products:', products.length);
        
        const productContainer = document.querySelector('.pro');
        if (!productContainer) {
            console.error('❌ Product container (.pro) not found');
            return;
        }

        // Clear existing content
        productContainer.innerHTML = '';

        // If no products, show message
        if (products.length === 0) {
            this.showNoProducts('No products found');
            return;
        }

        // Create product HTML
        products.forEach(product => {
            const productDiv = document.createElement('div');
            productDiv.className = 'product';
            productDiv.dataset.id = product.id;
            
            // Check if product is in cart
            const isInCart = this.cartManager ? this.cartManager.isInCart(product.id) : false;
            
            // Add visual indicators
            let productClass = 'product';
            if (isInCart) productClass += ' in-cart';
            if (product.stock <= 0) productClass += ' out-of-stock';
            
            productDiv.className = productClass;

            const unitInfo = this.formatUnitInfo(product);
            
            productDiv.innerHTML = `
                <div class="product-info">
                    <div class="info-left">
                        <p class="thename" >${product.name}</p>
                        <p class="category">${product.category}</p>
                    </div>
                    <div class="info-right">
                        <p class="price">$${product.price}</p>
                        <p class="stock units-data ${product.stock <= 0 ? 'out-of-stock' : ''}">${unitInfo}</p>
                    </div>
                </div>
                ${isInCart ? '<div class="cart-indicator" style="position:absolute; right:100px;">✓ In Cart</div>' : ''}
            `;
            
            productContainer.appendChild(productDiv);
        });

        // Attach event listeners
        this.attachCartEventListeners();
        this.updateCartDisplay();
        
        console.log('✅ Products displayed successfully');
    }

    // Show no products message
    showNoProducts(message = 'No products found') {
        const productContainer = document.querySelector('.pro');
        if (!productContainer) {
            console.error('❌ Product container (.pro) not found');
            return;
        }

        productContainer.innerHTML = `
            <div class="no-products-message" style="
                text-align: center;
                padding: 40px 20px;
                background: #f8f9fa;
                border-radius: 8px;
                margin: 20px 0;
                border: 1px solid #e9ecef;
            ">
                <div style="font-size: 48px; color: #6c757d; margin-bottom: 16px;">📦</div>
                <h3 style="color: #495057; margin-bottom: 8px;">${message}</h3>
                <p style="color: #6c757d; margin: 0;">
                    User ID: ${this.currentUser?.id || 'Not logged in'}<br>
                    Business ID: ${this.userBusinessId || 'Not found'}
                </p>
            </div>
        `;
    }

    // Handle add to cart functionality
    async handleAddToCart(productId, event) {
        event.stopPropagation();
        
        try {
            console.log('🛒 Adding product to cart:', productId);
            
            if (!this.cartManager) {
                this.showError('Cart manager not available!');
                return;
            }
            
            const product = await this.fetchProductById(productId);
            if (!product) {
                this.showError('Product not found!');
                return;
            }

            if (product.stock <= 0) {
                this.showError('Sorry, this product is out of stock!');
                return;
            }

            const success = this.cartManager.addToCart(productId, 1);
            
            if (success) {
                this.showSuccess(`${product.name} added to cart!`);
                this.updateCartDisplay();
                this.updateProductUIInstantly(productId, true);
            } else {
                this.showError('Failed to add product to cart!');
            }
            
        } catch (error) {
            console.error('❌ Error handling add to cart:', error);
            this.showError('An error occurred while adding to cart!');
        }
    }

    // Update product UI instantly
    updateProductUIInstantly(productId, isInCart) {
        const productElement = document.querySelector(`.product[data-id="${productId}"]`);
        if (!productElement) return;
        
        if (isInCart) {
            productElement.classList.add('in-cart');
            
            if (!productElement.querySelector('.cart-indicator')) {
                const cartIndicator = document.createElement('div');
                cartIndicator.className = 'cart-indicator';
                cartIndicator.innerHTML = '✓ In Cart';
                productElement.appendChild(cartIndicator);
            }
        } else {
            productElement.classList.remove('in-cart');
            const cartIndicator = productElement.querySelector('.cart-indicator');
            if (cartIndicator) {
                cartIndicator.remove();
            }
        }
    }

    // Attach event listeners to product containers
    attachCartEventListeners() {
        const productContainers = document.querySelectorAll('.product');
        productContainers.forEach(container => {
            container.addEventListener('click', (event) => {
                const productId = parseInt(container.dataset.id);
                this.handleAddToCart(productId, event);
            });
        });
    }

    // Update cart display
    updateCartDisplay() {
        if (!this.cartManager) return;
        
        const cartCount = this.cartManager.getCartCount();
        const cartCountElement = document.querySelector('.cart-count');
        if (cartCountElement) {
            cartCountElement.textContent = cartCount;
        }
    }

    // Get all unique categories (filtered by business ID)
    async getCategories() {
        try {
            await this.waitForInitialization();
            
            if (!this.userBusinessId) {
                console.log('⚠️  No business ID available for categories');
                return [];
            }

            const { data, error } = await supabaseClient
                .from('products')
                .select('category')
                .eq('business_id', this.userBusinessId);

            if (error) {
                console.error('❌ Error fetching categories:', error);
                return [];
            }

            const categories = [...new Set(data.map(item => item.category))];
            console.log('📂 Categories found:', categories);
            return categories;
            
        } catch (error) {
            console.error('❌ Categories error:', error);
            return [];
        }
    }

    // Get product count (filtered by business ID)
    async getProductCount() {
        try {
            await this.waitForInitialization();
            
            if (!this.userBusinessId) {
                return 0;
            }

            const { count, error } = await supabaseClient
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', this.userBusinessId);

            if (error) {
                console.error('❌ Error getting count:', error);
                return 0;
            }

            return count;
            
        } catch (error) {
            console.error('❌ Count error:', error);
            return 0;
        }
    }

    // Refresh products
    async refreshProducts() {
        console.log('🔄 Refreshing products...');
        return await this.fetchAllProducts();
    }

    // Set cart manager reference
    setCartManager(cartManager) {
        this.cartManager = cartManager;
    }

    // Utility methods
    isUserReady() {
        return this.currentUser && this.userBusinessId;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    // Show success message
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    // Show error message
    showError(message) {
        this.showMessage(message, 'error');
    }

    // Show message utility
    showMessage(message, type = 'info') {
        const existingMsg = document.getElementById('product-message');
        if (existingMsg) existingMsg.remove();
        
        const msgElement = document.createElement('div');
        msgElement.id = 'product-message';
        msgElement.textContent = message;
        msgElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 350px;
            word-wrap: break-word;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            animation: slideInFadeOut 4s forwards;
        `;
        
        document.body.appendChild(msgElement);
        
        setTimeout(() => {
            if (msgElement.parentNode) {
                msgElement.parentNode.removeChild(msgElement);
            }
        }, 4000);
    }

    // Debug information
    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            currentUser: this.currentUser?.id || null,
            userBusinessId: this.userBusinessId,
            productsCount: this.products.length,
            cartManager: !!this.cartManager
        };
    }
}

// Initialize the product fetcher
let productFetcher = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📋 DOM loaded, initializing product fetcher...');
    
    try {
        // Create new instance
        productFetcher = new ProductFetcher();
        
        // Wait for initialization
        await productFetcher.waitForInitialization();
        
        // Create cart count element if it doesn't exist
        const cartIcon = document.querySelector('.cart[data-target="cart-content"]');
        if (cartIcon && !cartIcon.querySelector('.cart-count')) {
            const cartCount = document.createElement('div');
            cartCount.className = 'cart-count';
            cartCount.textContent = '0';
            cartCount.style.cssText = `
                position: absolute;
                top: -8px;
                right: -8px;
                background: #ff4757;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            cartIcon.appendChild(cartCount);
        }
        
        console.log('✅ Product fetcher initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing product fetcher:', error);
    }
});

// If DOM already loaded
if (document.readyState !== 'loading') {
    console.log('📋 DOM already loaded, initializing product fetcher...');
    (async () => {
        try {
            productFetcher = new ProductFetcher();
            await productFetcher.waitForInitialization();
            console.log('✅ Product fetcher initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing product fetcher:', error);
        }
    })();
}

// Global functions for easy access
window.fetchAllProducts = async () => {
    if (!productFetcher) {
        console.error('❌ Product fetcher not initialized');
        return [];
    }
    return await productFetcher.fetchAllProducts();
};

window.searchProducts = async (query) => {
    if (!productFetcher) {
        console.error('❌ Product fetcher not initialized');
        return [];
    }
    return await productFetcher.searchProducts(query);
};

window.filterByCategory = async (category) => {
    if (!productFetcher) {
        console.error('❌ Product fetcher not initialized');
        return [];
    }
    return await productFetcher.fetchProductsByCategory(category);
};

window.refreshProducts = async () => {
    if (!productFetcher) {
        console.error('❌ Product fetcher not initialized');
        return [];
    }
    return await productFetcher.refreshProducts();
};

window.getProductDebugInfo = () => {
    if (!productFetcher) {
        console.error('❌ Product fetcher not initialized');
        return null;
    }
    return productFetcher.getDebugInfo();
};

// Make productFetcher globally accessible
window.productFetcher = productFetcher;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProductFetcher };
}

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInFadeOut {
        0% { opacity: 0; transform: translateX(100%); }
        10% { opacity: 1; transform: translateX(0); }
        90% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(100%); }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.8); }
        to { opacity: 1; transform: scale(1); }
    }
    
    .product {
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        position: relative;
    }
    
    .product:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    .product.in-cart {
        border: 2px solid #28a745 !important;
        background-color: #f8f9fa !important;
    }
    
    .product.out-of-stock {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .product.out-of-stock:hover {
        transform: none;
        box-shadow: none;
    }
    
    .cart-indicator {
        position: absolute;
        top: 10px;
        right: 100px;
        background: #28a745;
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
        animation: fadeIn 0.3s ease-in;
    }
    
    .stock.out-of-stock {
        color: #dc3545;
        font-weight: bold;
    }
    
    .no-products-message {
        font-family: Arial, sans-serif;
    }
`;
document.head.appendChild(style);

console.log('✅ Product fetcher script loaded successfully');

// Real-time updates functionality
function initializeRealTimeUpdates() {
    console.log('🔄 Initializing real-time updates...');
    
    // Search input handler
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                const query = this.value.trim();
                if (query && productFetcher) {
                    await productFetcher.searchProducts(query);
                } else if (productFetcher) {
                    await productFetcher.fetchAllProducts();
                }
            }, 300);
        });
    }
    
    // Navigation updates
    const navItems = document.querySelectorAll('.home[data-target]');
    navItems.forEach(item => {
        item.addEventListener('click', async function() {
            const targetId = this.getAttribute('data-target');
            
            if (targetId === 'product-content' && productFetcher) {
                // Refresh products when navigating to product view
                setTimeout(async () => {
                    await productFetcher.refreshProducts();
                }, 100);
            }
        });
    });
    
    console.log('✅ Real-time updates initialized');
}

// Initialize real-time updates
setTimeout(() => {
    initializeRealTimeUpdates();
}, 2000);

// Real-time cart count updates using Supabase Realtime
function initializeCartRealtime() {
    if (!productFetcher || !productFetcher.userBusinessId) return;

    // Subscribe to changes in 'cart' or 'orders' table for this business
    // If you have a 'cart' table, use that. If not, listen to 'orders' table for new orders.
    // Here, we'll use 'orders' table as an example for real-time order placement.

    const businessId = productFetcher.userBusinessId;

    const ordersChannel = supabaseClient
        .channel('orders-cart-realtime')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `business_id=eq.${businessId}`
            },
            payload => {
                // Whenever an order is inserted/updated/deleted, update the cart count UI
                if (productFetcher && productFetcher.cartManager) {
                    productFetcher.updateCartDisplay();
                }
            }
        )
        .subscribe();

    window.cartRealtimeChannel = ordersChannel;
}

// Call this after productFetcher is initialized and businessId is set
document.addEventListener('DOMContentLoaded', () => {
    const waitForBusinessId = setInterval(() => {
        if (productFetcher && productFetcher.userBusinessId) {
            initializeCartRealtime();
            clearInterval(waitForBusinessId);
        }
    }, 200);
});

// Add this after DOMContentLoaded or after productFetcher is initialized
document.addEventListener('DOMContentLoaded', () => {
    // Wait for productFetcher to be ready
    const waitForFetcher = setInterval(() => {
        if (window.productFetcher && productFetcher.userBusinessId) {
            const categorySelect = document.getElementById('category-filter');
            if (categorySelect) {
                categorySelect.addEventListener('change', async function () {
                    const selectedCategory = this.value;
                    if (!selectedCategory) {
                        // If "Select a category..." is chosen, show all products
                        await productFetcher.fetchAllProducts();
                    } else {
                        // Fetch products by selected category
                        await productFetcher.fetchProductsByCategory(selectedCategory);
                    }
                });
            }
            clearInterval(waitForFetcher);
        }
    }, 200);
});