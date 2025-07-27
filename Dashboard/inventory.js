// Initialize Supabase client
const supabaseUrl = 'https://jvcrkjkhmglgrwkadzxw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y3JramtobWdsZ3J3a2Fkenh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTQwOTgsImV4cCI6MjA2NzI3MDA5OH0.4uGTPJg2Nbl8QvGy6UhlBJlJ4lUtMl9f6vTJ_jf8z3o';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ===== CHECKBOX FUNCTIONALITY =====
function setupCheckboxFunctionality() {
    const headerCheckbox = document.querySelector('.column.one input[type="checkbox"]');
    const selectedCountElement = document.querySelector('.checked');
    const deleteButton = document.querySelector('.delete');

    // Function to update selected count and visibility
    function updateSelectedCount() {
        const checkedBoxes = document.querySelectorAll('tbody .column.one input[type="checkbox"]:checked');
        const count = checkedBoxes.length;

        if (selectedCountElement) {
            selectedCountElement.textContent = `${count} selected`;
            selectedCountElement.style.display = count === 0 ? 'none' : 'block';
        }

        if (deleteButton) {
            deleteButton.style.display = count === 0 ? 'none' : 'block';
        }
    }

    // Function to update header checkbox state
    function updateHeaderCheckbox() {
        const dataCheckboxes = document.querySelectorAll('tbody .column.one input[type="checkbox"]');
        const totalDataCheckboxes = dataCheckboxes.length;
        const checkedDataCheckboxes = document.querySelectorAll('tbody .column.one input[type="checkbox"]:checked').length;

        if (!headerCheckbox) return;

        if (checkedDataCheckboxes === 0) {
            headerCheckbox.checked = false;
            headerCheckbox.indeterminate = false;
        } else if (checkedDataCheckboxes === totalDataCheckboxes) {
            headerCheckbox.checked = true;
            headerCheckbox.indeterminate = false;
        } else {
            headerCheckbox.checked = false;
            headerCheckbox.indeterminate = true;
        }
    }

    // Function to attach checkbox event listeners
    function attachCheckboxListeners() {
        const dataCheckboxes = document.querySelectorAll('tbody .column.one input[type="checkbox"]');

        // Header checkbox event listener (Check All functionality)
        if (headerCheckbox) {
            headerCheckbox.removeEventListener('change', headerCheckboxHandler);
            headerCheckbox.addEventListener('change', headerCheckboxHandler);
        }

        // Individual checkbox event listeners
        dataCheckboxes.forEach(checkbox => {
            checkbox.removeEventListener('change', dataCheckboxHandler);
            checkbox.addEventListener('change', dataCheckboxHandler);
        });
    }

    // Header checkbox handler
    function headerCheckboxHandler() {
        const isChecked = this.checked;
        const dataCheckboxes = document.querySelectorAll('tbody .column.one input[type="checkbox"]');

        dataCheckboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });

        updateSelectedCount();
        this.indeterminate = false;
    }

    // Data checkbox handler
    function dataCheckboxHandler() {
        updateSelectedCount();
        updateHeaderCheckbox();
    }

    // Initialize checkbox functionality
    function initializeCheckboxes() {
        attachCheckboxListeners();
        updateSelectedCount();
        updateHeaderCheckbox();
    }

    initializeCheckboxes();
    window.initializeCheckboxes = initializeCheckboxes;
}

// Global checkbox utility functions
window.checkboxFunctionality = {
    updateSelectedCount: function () {
        const checkedBoxes = document.querySelectorAll('tbody .column.one input[type="checkbox"]:checked');
        const count = checkedBoxes.length;
        const selectedCountElement = document.querySelector('.checked');
        const deleteButton = document.querySelector('.delete');

        if (selectedCountElement) {
            selectedCountElement.textContent = `${count} selected`;
            selectedCountElement.style.display = count === 0 ? 'none' : 'block';
        }

        if (deleteButton) {
            deleteButton.style.display = count === 0 ? 'none' : 'block';
        }
    },

    selectAll: function () {
        const headerCheckbox = document.querySelector('.column.one input[type="checkbox"]');
        if (headerCheckbox) {
            headerCheckbox.checked = true;
            headerCheckbox.dispatchEvent(new Event('change'));
        }
    },

    deselectAll: function () {
        const headerCheckbox = document.querySelector('.column.one input[type="checkbox"]');
        if (headerCheckbox) {
            headerCheckbox.checked = false;
            headerCheckbox.dispatchEvent(new Event('change'));
        }
    },

    getSelectedItems: function () {
        const checkedBoxes = document.querySelectorAll('tbody .column.one input[type="checkbox"]:checked');
        const selectedItems = [];

        checkedBoxes.forEach(checkbox => {
            const row = checkbox.closest('tr');
            if (row) {
                const productIDElement = row.querySelector('.column.one .data-info');
                const productID = productIDElement ? productIDElement.textContent : null;
                selectedItems.push({
                    checkbox: checkbox,
                    productID: productID,
                    row: row
                });
            }
        });

        return selectedItems;
    },

    getSelectedCount: function () {
        return document.querySelectorAll('tbody .column.one input[type="checkbox"]:checked').length;
    }
};

// ===== INVENTORY MANAGER WITH BUSINESS ID FILTERING =====
class InventoryManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.orders = [];
        this.salesData = {};
        this.isFiltered = false;
        this.currentUser = null;
        this.userBusinessId = null;
        this.init();
    }

    // Initialize the inventory manager
    async init() {
        try {
            console.log('Initializing Inventory Manager...');

            await this.getAuthenticatedUser();
            await this.fetchUserBusinessId();
            await this.fetchProducts();
            await this.fetchOrdersForSalesCalculation();
            this.calculateSalesData();
            this.renderProducts();
            this.setupEventListeners();
            this.setupDeleteButton();

            console.log('Inventory Manager initialized successfully');
        } catch (error) {
            console.error('Error initializing inventory manager:', error);
            this.showMessage('Failed to load inventory', 'error');
        }
    }

    // Get authenticated user
    async getAuthenticatedUser() {
        try {
            const { data: { user }, error } = await supabaseClient.auth.getUser();

            if (error) {
                throw new Error(`Authentication error: ${error.message}`);
            }

            if (!user) {
                throw new Error('No authenticated user found');
            }

            this.currentUser = user;
            console.log('Authenticated user:', user.id);
        } catch (error) {
            console.error('Error getting authenticated user:', error);
            throw error;
        }
    }

    // Fetch user's business ID from business table
    async fetchUserBusinessId() {
        try {
            if (!this.currentUser) {
                throw new Error('No current user available');
            }

            const userId = this.currentUser.id;
            const userEmail = this.currentUser.email;

            // Try to find business where user is the owner
            let { data: businessData, error: businessError } = await supabaseClient
                .from('bussiness')
                .select('id, staff_emails')
                .eq('user_id', userId)
                .maybeSingle();

            // If not found, try to find business where user is staff
            if (!businessData) {
                let { data: staffBusinesses, error: staffError } = await supabaseClient
                    .from('bussiness')
                    .select('id, staff_emails')
                    .contains('staff_emails', [userEmail]);

                if (staffError) {
                    const { data: allBusinesses, error: allError } = await supabaseClient
                        .from('bussiness')
                        .select('id, staff_emails');
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
                throw new Error('No business found for user or staff email');
            }

            this.userBusinessId = businessData.id;
            console.log('User business ID:', this.userBusinessId);

        } catch (error) {
            console.error('Error getting business ID:', error);
            throw error;
        }
    }

    // Fetch all products for the current business
    async fetchProducts() {
        try {
            if (!this.userBusinessId) {
                throw new Error('No business ID available');
            }

            console.log('Fetching products for business ID:', this.userBusinessId);

            const { data: products, error } = await supabaseClient
                .from('products')
                .select('id, name, price, stock, category, created_at')
                .eq('business_id', this.userBusinessId)
                .order('created_at', { ascending: false });

            if (error) {
                throw new Error(`Product fetch error: ${error.message}`);
            }

            this.products = products || [];
            this.filteredProducts = [...this.products];
            this.isFiltered = false;

            console.log(`Fetched ${this.products.length} products`);

        } catch (error) {
            console.error('Error in fetchProducts:', error);
            throw error;
        }
    }

    // Fetch orders to calculate sales data
    async fetchOrdersForSalesCalculation() {
        try {
            if (!this.userBusinessId) {
                throw new Error('No business ID available');
            }

            console.log('Fetching orders for sales calculation...');

            const { data: orders, error } = await supabaseClient
                .from('orders')
                .select('id, ordername, totalprice, created_at')
                .eq('business_id', this.userBusinessId);

            if (error) {
                throw new Error(`Orders fetch error: ${error.message}`);
            }

            this.orders = orders || [];
            console.log(`Fetched ${this.orders.length} orders for sales calculation`);

        } catch (error) {
            console.error('Error fetching orders for sales calculation:', error);
            throw error;
        }
    }

    // Calculate sales data for each product
    calculateSalesData() {
        try {
            console.log('Calculating sales data...');
            
            // Initialize sales data for all products
            this.salesData = {};
            this.products.forEach(product => {
                this.salesData[product.name.toLowerCase()] = {
                    timesSold: 0,
                    totalRevenue: 0
                };
            });

            // Process each order to calculate sales
            this.orders.forEach(order => {
                try {
                    let orderItems = [];

                    // Parse order items from ordername field
                    if (order.ordername) {
                        if (Array.isArray(order.ordername)) {
                            orderItems = order.ordername;
                        } else if (typeof order.ordername === 'string') {
                            try {
                                // Try to parse JSON string
                                const parsed = JSON.parse(order.ordername);
                                if (Array.isArray(parsed)) {
                                    orderItems = parsed;
                                } else {
                                    // Single product as string
                                    orderItems = [{ name: order.ordername, quantity: 1, price: order.totalprice || 0 }];
                                }
                            } catch (e) {
                                // Not JSON, treat as single product name
                                orderItems = [{ name: order.ordername, quantity: 1, price: order.totalprice || 0 }];
                            }
                        }
                    }

                    // Update sales data for each item in the order
                    orderItems.forEach(item => {
                        const productName = (item.name || item.product_name || '').toLowerCase();
                        const quantity = parseInt(item.quantity) || 1;
                        const itemPrice = parseFloat(item.price) || 0;

                        if (productName && this.salesData[productName]) {
                            this.salesData[productName].timesSold += quantity;
                            
                            // If item has individual price, use it; otherwise distribute total order price
                            if (itemPrice > 0) {
                                this.salesData[productName].totalRevenue += (itemPrice * quantity);
                            } else if (orderItems.length === 1) {
                                // Single item order, use total order price
                                this.salesData[productName].totalRevenue += parseFloat(order.totalprice || 0);
                            } else {
                                // Multiple items, estimate by dividing total price
                                const estimatedPrice = parseFloat(order.totalprice || 0) / orderItems.length;
                                this.salesData[productName].totalRevenue += (estimatedPrice * quantity);
                            }
                        }
                    });

                } catch (itemError) {
                    console.error('Error processing order item:', itemError, order);
                }
            });

            console.log('Sales data calculated:', this.salesData);

        } catch (error) {
            console.error('Error calculating sales data:', error);
            // Initialize empty sales data on error
            this.salesData = {};
            this.products.forEach(product => {
                this.salesData[product.name.toLowerCase()] = {
                    timesSold: 0,
                    totalRevenue: 0
                };
            });
        }
    }

    // Render products in the HTML table structure
    renderProducts() {
        try {
            const tbody = document.querySelector('.orders.inventory tbody');
            if (!tbody) {
                console.error('Inventory tbody not found');
                return;
            }

            // Clear existing data rows
            tbody.innerHTML = '';

            const productsToRender = this.isFiltered ? this.filteredProducts : this.products;

            if (productsToRender.length === 0) {
                this.showEmptyState();
                return;
            }

            // Add data rows for each product
            productsToRender.forEach((product, index) => {
                this.addProductRow(product, index);
            });

            // Reinitialize checkbox functionality after rendering
            if (window.initializeCheckboxes) {
                window.initializeCheckboxes();
            }

        } catch (error) {
            console.error('Error rendering products:', error);
            this.showMessage('Failed to display products', 'error');
        }
    }

    // Add a single product row to the table
    addProductRow(product, index) {
        try {
            const tbody = document.querySelector('.orders.inventory tbody');
            if (!tbody) return;

            // Generate product ID
            const productId = `PRO${String(product.id).padStart(3, '0')}`;

            // Get product information
            const productName = product.name || 'Unknown Product';
            const totalPrice = `$${parseFloat(product.price || 0).toFixed(2)}`;
            const quantity = parseInt(product.stock || 0);
            const category = product.category || 'Uncategorized';

            // Get sales data for this product
            const salesInfo = this.salesData[productName.toLowerCase()] || { timesSold: 0, totalRevenue: 0 };
            const salesDisplay = `${salesInfo.timesSold} (${salesInfo.totalRevenue.toFixed(2)})`;

            // Create table row
            const row = document.createElement('tr');
            row.className = 'row data';
            row.setAttribute('data-product-id', product.id);

            row.innerHTML = `
                <td class="column one">
                    <input type="checkbox" name="check" value="yes">
                    <span class="data-info">${productId}</span>
                </td>
                <td class="column two">
                    <span class="data-info">${productName}</span>
                </td>
                <td class="column three">
                    <span class="data-info">${totalPrice}</span>
                </td>
                <td class="column four">
                    <span class="data-info">${quantity}</span>
                </td>
                <td class="column five">
                    <span class="data-info">${category}</span>
                </td>
                <td class="column six">
                    <a href="#" onclick="viewProductSales('${productId}', '${productName}')">
                        <span class="data-info">${salesDisplay}</span>
                    </a>
                </td>
            `;

            tbody.appendChild(row);

        } catch (error) {
            console.error('Error adding product row:', error);
        }
    }

    // Show empty state when no products
    showEmptyState() {
        const tbody = document.querySelector('.orders.inventory tbody');
        if (!tbody) return;

        const row = document.createElement('tr');
        row.className = 'row data';
        row.innerHTML = `
            <td class="column one">
                <input type="checkbox" name="check" value="yes" disabled>
                <span class="data-info">No products</span>
            </td>
            <td class="column two">
                <span class="data-info">-</span>
            </td>
            <td class="column three">
                <span class="data-info">-</span>
            </td>
            <td class="column four">
                <span class="data-info">-</span>
            </td>
            <td class="column five">
                <span class="data-info">-</span>
            </td>
            <td class="column six">
                <a href="#"><span class="data-info">0 ($0.00)</span></a>
            </td>
        `;

        tbody.appendChild(row);
    }

    // Setup event listeners for search and refresh
    setupEventListeners() {
        const refreshButton = document.getElementById('refresh-inventory');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshInventory();
            });
        }

        const searchInput = document.getElementById('search-inventory');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.trim();
                if (searchTerm) {
                    this.searchProducts(searchTerm);
                } else {
                    this.clearSearch();
                }
            });
        }
    }

    // Setup delete button functionality
    setupDeleteButton() {
        const deleteButton = document.querySelector('.delete');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                this.deleteSelectedProducts();
            });

            deleteButton.style.display = 'none';
        }
    }

    // Search products by name, category, or ID
    searchProducts(searchTerm) {
        try {
            const term = searchTerm.toLowerCase().trim();

            this.filteredProducts = this.products.filter(product => {
                const productId = `PRO${String(product.id).padStart(3, '0')}`.toLowerCase();
                const productName = (product.name || '').toLowerCase();
                const category = (product.category || '').toLowerCase();
                const price = String(product.price || '');
                const stock = String(product.stock || '');

                return productId.includes(term) ||
                    productName.includes(term) ||
                    category.includes(term) ||
                    price.includes(term) ||
                    stock.includes(term);
            });

            this.isFiltered = true;
            this.renderProducts();

            this.showMessage(`Found ${this.filteredProducts.length} matching products`, 'info');
        } catch (error) {
            console.error('Error searching products:', error);
            this.showMessage('Error searching products', 'error');
        }
    }

    // Clear search and show all products
    clearSearch() {
        this.filteredProducts = [...this.products];
        this.isFiltered = false;
        this.renderProducts();
    }

    // Refresh inventory (fetch and re-render)
    async refreshInventory() {
        try {
            this.showMessage('Refreshing inventory...', 'info');
            await this.fetchProducts();
            await this.fetchOrdersForSalesCalculation();
            this.calculateSalesData();
            this.renderProducts();
            this.showMessage('Inventory refreshed successfully', 'success');
        } catch (error) {
            console.error('Error refreshing inventory:', error);
            this.showMessage('Failed to refresh inventory', 'error');
        }
    }

    // Delete selected products
    async deleteSelectedProducts() {
        try {
            const selectedItems = window.checkboxFunctionality.getSelectedItems();

            if (selectedItems.length === 0) {
                this.showMessage('No products selected', 'warning');
                return;
            }

            const confirm = window.confirm(`Are you sure you want to delete ${selectedItems.length} product(s)?`);
            if (!confirm) return;

            this.showMessage('Deleting products...', 'info');

            const productIds = selectedItems.map(item => {
                const row = item.row;
                return parseInt(row.getAttribute('data-product-id'));
            }).filter(id => !isNaN(id));

            if (productIds.length === 0) {
                this.showMessage('No valid product IDs found', 'error');
                return;
            }

            const { error } = await supabaseClient
                .from('products')
                .delete()
                .in('id', productIds);

            if (error) {
                throw new Error(`Failed to delete products: ${error.message}`);
            }

            this.showMessage(`Successfully deleted ${productIds.length} product(s)`, 'success');
            await this.refreshInventory();

        } catch (error) {
            console.error('Error deleting products:', error);
            this.showMessage('Failed to delete products', 'error');
        }
    }

    // Show message to user
    showMessage(message, type = 'success') {
        const existingMsg = document.getElementById('inventory-message');
        if (existingMsg) existingMsg.remove();

        const msgElement = document.createElement('div');
        msgElement.id = 'inventory-message';
        msgElement.textContent = message;
        msgElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 5px;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
            background: ${type === 'success' ? '#28a745' :
                type === 'info' ? '#17a2b8' :
                    type === 'warning' ? '#ffc107' : '#dc3545'};
            color: ${type === 'warning' ? '#333' : 'white'};
            animation: fadeInOut 4s forwards;
        `;

        if (!document.getElementById('inventory-message-styles')) {
            const style = document.createElement('style');
            style.id = 'inventory-message-styles';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateY(-20px); }
                    15% { opacity: 1; transform: translateY(0); }
                    85% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(msgElement);

        setTimeout(() => {
            if (msgElement.parentNode) {
                msgElement.parentNode.removeChild(msgElement);
            }
        }, 4000);
    }
}

// ===== REAL-TIME UPDATES =====
function initializeInventoryRealTimeUpdates() {
    console.log('Initializing real-time inventory updates...');

    const waitForBusinessId = setInterval(() => {
        const businessId = window.inventoryManager?.userBusinessId;
        if (businessId) {
            // Subscribe to products table changes
            const productSubscription = supabaseClient
                .channel('products-channel')
                .on('postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'products',
                        filter: `business_id=eq.${businessId}`
                    },
                    (payload) => {
                        console.log('Product change detected:', payload);
                        window.inventoryManager?.refreshInventory();
                    }
                )
                .subscribe();

            // Subscribe to orders table changes (for sales calculation)
            const orderSubscription = supabaseClient
                .channel('orders-for-inventory-channel')
                .on('postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'orders',
                        filter: `business_id=eq.${businessId}`
                    },
                    (payload) => {
                        console.log('Order change detected (inventory):', payload);
                        window.inventoryManager?.refreshInventory();
                    }
                )
                .subscribe();

            window.inventoryRealtimeChannels = [productSubscription, orderSubscription];
            clearInterval(waitForBusinessId);
        }
    }, 200);
}

// ===== MAIN INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    setupCheckboxFunctionality();

    const inventoryManager = new InventoryManager();
    window.inventoryManager = inventoryManager;

    initializeInventoryRealTimeUpdates();
});

// ===== GLOBAL UTILITY FUNCTIONS =====
window.getInventoryManager = () => window.inventoryManager;
window.refreshInventory = () => window.inventoryManager?.refreshInventory();
window.searchProducts = (searchTerm) => window.inventoryManager?.searchProducts(searchTerm);
window.deleteSelectedProducts = () => window.inventoryManager?.deleteSelectedProducts();

// Product sales viewing function
window.viewProductSales = (productId, productName) => {
    console.log('Viewing sales for product:', productId, productName);
    const inventoryManager = window.inventoryManager;
    if (inventoryManager) {
        const salesInfo = inventoryManager.salesData[productName.toLowerCase()] || { timesSold: 0, totalRevenue: 0 };
        alert(`Sales for ${productName}:\n\nTimes Sold: ${salesInfo.timesSold}\nTotal Revenue: $${salesInfo.totalRevenue.toFixed(2)}`);
    }
};

// Export inventory function
window.exportInventory = async (format = 'csv') => {
    try {
        const inventoryManager = window.inventoryManager;
        if (!inventoryManager) {
            console.error('Inventory manager not initialized');
            return;
        }

        const products = inventoryManager.products;
        if (products.length === 0) {
            alert('No products to export');
            return;
        }

        const headers = ['Product ID', 'Product Name', 'Price', 'Stock', 'Category', 'Times Sold', 'Revenue Generated'];
        let content = headers.join(',') + '\n';

        products.forEach(product => {
            const productId = `PRO${String(product.id).padStart(3, '0')}`;
            const productName = product.name || 'Unknown Product';
            const price = parseFloat(product.price || 0).toFixed(2);
            const stock = parseInt(product.stock || 0);
            const category = product.category || 'Uncategorized';
            
            const salesInfo = inventoryManager.salesData[productName.toLowerCase()] || { timesSold: 0, totalRevenue: 0 };
            const timesSold = salesInfo.timesSold;
            const revenue = salesInfo.totalRevenue.toFixed(2);

            content += `"${productId}","${productName}","$${price}","${stock}","${category}","${timesSold}","$${revenue}"\n`;
        });

        const filename = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`Exported ${products.length} products to ${filename}`);

    } catch (error) {
        console.error('Error exporting inventory:', error);
        alert('Failed to export inventory');
    }
};

// Add new product function (can be called from UI)
window.addNewProduct = async (productData) => {
    try {
        const inventoryManager = window.inventoryManager;
        if (!inventoryManager || !inventoryManager.userBusinessId) {
            throw new Error('Inventory manager not initialized');
        }

        const { error } = await supabaseClient
            .from('products')
            .insert([{
                ...productData,
                business_id: inventoryManager.userBusinessId
            }]);

        if (error) {
            throw new Error(`Failed to add product: ${error.message}`);
        }

        inventoryManager.showMessage('Product added successfully', 'success');
        await inventoryManager.refreshInventory();

    } catch (error) {
        console.error('Error adding product:', error);
        if (window.inventoryManager) {
            window.inventoryManager.showMessage('Failed to add product', 'error');
        }
    }
};

// Update product function (can be called from UI)
window.updateProduct = async (productId, updatedData) => {
    try {
        const inventoryManager = window.inventoryManager;
        if (!inventoryManager) {
            throw new Error('Inventory manager not initialized');
        }

        const { error } = await supabaseClient
            .from('products')
            .update(updatedData)
            .eq('id', productId)
            .eq('business_id', inventoryManager.userBusinessId);

        if (error) {
            throw new Error(`Failed to update product: ${error.message}`);
        }

        inventoryManager.showMessage('Product updated successfully', 'success');
        await inventoryManager.refreshInventory();

    } catch (error) {
        console.error('Error updating product:', error);
        if (window.inventoryManager) {
            window.inventoryManager.showMessage('Failed to update product', 'error');
        }
    }
};

// Get product by ID function
window.getProductById = (productId) => {
    const inventoryManager = window.inventoryManager;
    if (!inventoryManager) return null;
    
    return inventoryManager.products.find(product => product.id === productId);
};

// Get low stock products function
window.getLowStockProducts = (threshold = 5) => {
    const inventoryManager = window.inventoryManager;
    if (!inventoryManager) return [];
    
    return inventoryManager.products.filter(product => 
        parseInt(product.stock || 0) <= threshold
    );
};

// Get top selling products function
window.getTopSellingProducts = (limit = 10) => {
    const inventoryManager = window.inventoryManager;
    if (!inventoryManager) return [];
    
    const productsWithSales = inventoryManager.products.map(product => ({
        ...product,
        salesData: inventoryManager.salesData[product.name.toLowerCase()] || { timesSold: 0, totalRevenue: 0 }
    }));
    
    return productsWithSales
        .sort((a, b) => b.salesData.timesSold - a.salesData.timesSold)
        .slice(0, limit);
};

// Get products by category function
window.getProductsByCategory = (category) => {
    const inventoryManager = window.inventoryManager;
    if (!inventoryManager) return [];
    
    return inventoryManager.products.filter(product => 
        (product.category || '').toLowerCase() === category.toLowerCase()
    );
};

// Calculate total inventory value function
window.getTotalInventoryValue = () => {
    const inventoryManager = window.inventoryManager;
    if (!inventoryManager) return 0;
    
    return inventoryManager.products.reduce((total, product) => {
        const price = parseFloat(product.price || 0);
        const stock = parseInt(product.stock || 0);
        return total + (price * stock);
    }, 0);
};

// Calculate total revenue from sales function
window.getTotalSalesRevenue = () => {
    const inventoryManager = window.inventoryManager;
    if (!inventoryManager) return 0;
    
    return Object.values(inventoryManager.salesData).reduce((total, sales) => {
        return total + (sales.totalRevenue || 0);
    }, 0);
};

// Get inventory statistics function
window.getInventoryStatistics = () => {
    const inventoryManager = window.inventoryManager;
    if (!inventoryManager) return null;
    
    const totalProducts = inventoryManager.products.length;
    const totalValue = window.getTotalInventoryValue();
    const totalRevenue = window.getTotalSalesRevenue();
    const lowStockProducts = window.getLowStockProducts().length;
    const outOfStockProducts = inventoryManager.products.filter(p => parseInt(p.stock || 0) === 0).length;
    
    const totalItemsSold = Object.values(inventoryManager.salesData).reduce((total, sales) => {
        return total + (sales.timesSold || 0);
    }, 0);
    
    return {
        totalProducts,
        totalValue: totalValue.toFixed(2),
        totalRevenue: totalRevenue.toFixed(2),
        lowStockProducts,
        outOfStockProducts,
        totalItemsSold,
        categories: [...new Set(inventoryManager.products.map(p => p.category || 'Uncategorized'))]
    };
};