// Initialize Supabase client
const supabaseUrl = 'https://jvcrkjkhmglgrwkadzxw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y3JramtobWdsZ3J3a2Fkenh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTQwOTgsImV4cCI6MjA2NzI3MDA5OH0.4uGTPJg2Nbl8QvGy6UhlBJlJ4lUtMl9f6vTJ_jf8z3o';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ===== CHECKBOX FUNCTIONALITY =====
function setupCheckboxFunctionality() {
    // Get all checkboxes
    const headerCheckbox = document.querySelector('.column.one .row.header input[type="checkbox"]');
    const selectedCountElement = document.querySelector('.checked');
    const deleteButton = document.querySelector('.delete');
    
    // Function to update selected count and visibility
    function updateSelectedCount() {
        const checkedBoxes = document.querySelectorAll('.column.one .row.data input[type="checkbox"]:checked');
        const count = checkedBoxes.length;
        
        if (selectedCountElement) {
            selectedCountElement.textContent = `${count} selected`;
            // Hide/show selected count based on selection
            if (count === 0) {
                selectedCountElement.style.display = 'none';
            } else {
                selectedCountElement.style.display = 'block';
            }
        }
        
        // Hide/show delete button based on selection
        if (deleteButton) {
            if (count === 0) {
                deleteButton.style.display = 'none';
            } else {
                deleteButton.style.display = 'block';
            }
        }
    }
    
    // Function to update header checkbox state
    function updateHeaderCheckbox() {
        const dataCheckboxes = document.querySelectorAll('.column.one .row.data input[type="checkbox"]');
        const totalDataCheckboxes = dataCheckboxes.length;
        const checkedDataCheckboxes = document.querySelectorAll('.column.one .row.data input[type="checkbox"]:checked').length;
        
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
        const dataCheckboxes = document.querySelectorAll('.column.one .row.data input[type="checkbox"]');
        
        // Header checkbox event listener (Check All functionality)
        if (headerCheckbox) {
            // Remove existing listener
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
        const dataCheckboxes = document.querySelectorAll('.column.one .row.data input[type="checkbox"]');
        
        // Check/uncheck all data checkboxes
        dataCheckboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        
        // Update selected count and visibility
        updateSelectedCount();
        
        // Remove indeterminate state when manually clicked
        this.indeterminate = false;
    }
    
    // Data checkbox handler
    function dataCheckboxHandler() {
        // Update selected count and visibility
        updateSelectedCount();
        
        // Update header checkbox state
        updateHeaderCheckbox();
    }
    
    // Initialize checkbox functionality
    function initializeCheckboxes() {
        attachCheckboxListeners();
        updateSelectedCount();
        updateHeaderCheckbox();
    }
    
    // Initialize on DOM load
    initializeCheckboxes();
    
    // Make initialization function available globally
    window.initializeCheckboxes = initializeCheckboxes;
}

// Global checkbox utility functions
window.checkboxFunctionality = {
    updateSelectedCount: function() {
        const checkedBoxes = document.querySelectorAll('.column.one .row.data input[type="checkbox"]:checked');
        const count = checkedBoxes.length;
        const selectedCountElement = document.querySelector('.checked');
        const deleteButton = document.querySelector('.delete');
        
        if (selectedCountElement) {
            selectedCountElement.textContent = `${count} selected`;
            // Hide/show selected count based on selection
            if (count === 0) {
                selectedCountElement.style.display = 'none';
            } else {
                selectedCountElement.style.display = 'block';
            }
        }
        
        // Hide/show delete button based on selection
        if (deleteButton) {
            if (count === 0) {
                deleteButton.style.display = 'none';
            } else {
                deleteButton.style.display = 'block';
            }
        }
    },
    
    selectAll: function() {
        const headerCheckbox = document.querySelector('.column.one .row.header input[type="checkbox"]');
        if (headerCheckbox) {
            headerCheckbox.checked = true;
            headerCheckbox.dispatchEvent(new Event('change'));
        }
    },
    
    deselectAll: function() {
        const headerCheckbox = document.querySelector('.column.one .row.header input[type="checkbox"]');
        if (headerCheckbox) {
            headerCheckbox.checked = false;
            headerCheckbox.dispatchEvent(new Event('change'));
        }
    },
    
    getSelectedItems: function() {
        const checkedBoxes = document.querySelectorAll('.column.one .row.data input[type="checkbox"]:checked');
        const selectedItems = [];
        
        checkedBoxes.forEach(checkbox => {
            const row = checkbox.closest('.row.data');
            if (row) {
                const orderIDElement = row.querySelector('.data-info');
                const orderID = orderIDElement ? orderIDElement.textContent : null;
                selectedItems.push({
                    checkbox: checkbox,
                    orderID: orderID,
                    row: row
                });
            }
        });
        
        return selectedItems;
    },
    
    getSelectedCount: function() {
        return document.querySelectorAll('.column.one .row.data input[type="checkbox"]:checked').length;
    }
};

// ===== ORDER MANAGER WITH BUSINESS ID FILTERING =====
class OrderManager {
    constructor() {
        this.orders = [];
        this.filteredOrders = [];
        this.isFiltered = false;
        this.currentUser = null;
        this.userBusinessId = null;
        this.init();
    }

    // Initialize the order manager
    async init() {
        try {
            console.log('Initializing Order Manager...');
            
            // Step 1: Get authenticated user
            await this.getAuthenticatedUser();
            
            // Step 2: Get user's business ID
            await this.fetchUserBusinessId();
            
            // Step 3: Fetch orders
            await this.fetchOrders();
            
            // Step 4: Render orders
            this.renderOrders();
            
            // Step 5: Setup event listeners
            this.setupEventListeners();
            this.setupDeleteButton();
            
            console.log('Order Manager initialized successfully');
        } catch (error) {
            console.error('Error initializing order manager:', error);
            this.showMessage('Failed to load orders', 'error');
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

    // Fetch user's business ID from bussiness table
    async fetchUserBusinessId() {
        try {
            if (!this.currentUser) {
                throw new Error('No current user available');
            }

            const userId = this.currentUser.id;
            const userEmail = this.currentUser.email;

            // 1. Try to find business where user is the owner
            let { data: businessData, error: businessError } = await supabaseClient
                .from('bussiness')
                .select('id, staff_emails')
                .eq('user_id', userId)
                .maybeSingle();

            // 2. If not found, try to find business where user is staff (staff_emails contains userEmail)
            if (!businessData) {
                let { data: staffBusinesses, error: staffError } = await supabaseClient
                    .from('bussiness')
                    .select('id, staff_emails')
                    .contains('staff_emails', [userEmail]);

                // Fallback: If contains fails, check manually
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

    // Fetch all orders for the current business
    async fetchOrders() {
        try {
            if (!this.userBusinessId) {
                throw new Error('No business ID available');
            }

            console.log('Fetching orders for business ID:', this.userBusinessId);
            
            const { data: orders, error } = await supabaseClient
                .from('orders')
                .select('id, order_number, ordername, quantity, totalprice, payment_method, created_at')
                .eq('business_id', this.userBusinessId) // CRITICAL: Filter by business ID
                .order('created_at', { ascending: false });
            
            if (error) {
                throw new Error(`Order fetch error: ${error.message}`);
            }
            
            this.orders = orders || [];
            this.filteredOrders = [...this.orders];
            this.isFiltered = false;
            
            console.log(`Fetched ${this.orders.length} orders`);
            
        } catch (error) {
            console.error('Error in fetchOrders:', error);
            throw error;
        }
    }

    // Render orders in the HTML structure
    renderOrders() {
        try {
            const orderContainer = document.querySelector('.orders');
            if (!orderContainer) {
                console.error('Orders container not found');
                return;
            }

            // Clear existing data rows (keep headers)
            this.clearDataRows();

            const ordersToRender = this.isFiltered ? this.filteredOrders : this.orders;

            if (ordersToRender.length === 0) {
                this.showEmptyState();
                return;
            }

            // Add data rows for each order
            ordersToRender.forEach((order, index) => {
                this.addOrderRow(order, index);
            });

            // Reinitialize checkbox functionality after rendering
            if (window.initializeCheckboxes) {
                window.initializeCheckboxes();
            }
            
        } catch (error) {
            console.error('Error rendering orders:', error);
            this.showMessage('Failed to display orders', 'error');
        }
    }

    // Clear existing data rows while keeping headers
    clearDataRows() {
        const columns = document.querySelectorAll('.column');
        columns.forEach(column => {
            const dataRows = column.querySelectorAll('.row.data');
            dataRows.forEach(row => row.remove());
        });
    }

    // Add a single order row to all columns
    addOrderRow(order, index) {
        try {
            // Use order_number from database or generate one
            const orderId = order.order_number || `ORD${String(order.id).padStart(3, '0')}`;
            
            // Get product count from order
            const productCount = this.getProductCountFromOrder(order);
            
            // Format date with time (12/01/1999, 13:50)
            const orderDateTime = this.formatDateTime(order.created_at);
            
            // Format total price
            const totalPrice = `$${parseFloat(order.totalprice || 0).toFixed(2)}/-`;
            
            // Payment method
            const paymentMethod = order.payment_method || 'N/A';
            
            // Add to column one (OrderID with checkbox)
            const columnOne = document.querySelector('.column.one');
            if (columnOne) {
                const dataRow = document.createElement('div');
                dataRow.className = 'row data';
                dataRow.innerHTML = `
                    <input type="checkbox" name="check" value="yes">
                    <p class="data-info">${orderId}</p>
                `;
                columnOne.appendChild(dataRow);
            }

            // Add to column two (Total Products)
            const columnTwo = document.querySelector('.column.two');
            if (columnTwo) {
                const dataRow = document.createElement('div');
                dataRow.className = 'row data';
                dataRow.innerHTML = `
                    <p class="data-info">${productCount}</p>
                `;
                columnTwo.appendChild(dataRow);
            }

            // Add to column three (Total Price)
            const columnThree = document.querySelector('.column.three');
            if (columnThree) {
                const dataRow = document.createElement('div');
                dataRow.className = 'row data';
                dataRow.innerHTML = `
                    <p class="data-info">${totalPrice}</p>
                `;
                columnThree.appendChild(dataRow);
            }

            // Add to column four (Payment Method)
            const columnFour = document.querySelector('.column.four');
            if (columnFour) {
                const dataRow = document.createElement('div');
                dataRow.className = 'row data';
                dataRow.innerHTML = `
                    <p class="data-info">${paymentMethod}</p>
                `;
                columnFour.appendChild(dataRow);
            }

            // Add to column five (Order Date & Time)
            const columnFive = document.querySelector('.column.five');
            if (columnFive) {
                const dataRow = document.createElement('div');
                dataRow.className = 'row data';
                dataRow.innerHTML = `
                    <p class="data-info">${orderDateTime}</p>
                `;
                columnFive.appendChild(dataRow);
            }

            // Add to column six (Receipt)
            const columnSix = document.querySelector('.column.six');
            if (columnSix) {
                const dataRow = document.createElement('div');
                dataRow.className = 'row data';
                dataRow.innerHTML = `
                    <a href="#" onclick="viewReceipt('${orderId}')">
                        <p class="data-info receipt">view</p>
                    </a>
                `;
                columnSix.appendChild(dataRow);
            }

        } catch (error) {
            console.error('Error adding order row:', error);
        }
    }

    // Get product count from order data
    getProductCountFromOrder(order) {
        try {
            // First try to get from quantity field
            if (order.quantity && typeof order.quantity === 'number') {
                return order.quantity;
            }
            
            // If quantity field is not available, calculate from ordername array
            if (order.ordername && Array.isArray(order.ordername)) {
                return order.ordername.reduce((total, item) => {
                    if (typeof item === 'object' && item.quantity) {
                        return total + (parseInt(item.quantity) || 1);
                    }
                    return total + 1; // If no quantity specified, assume 1
                }, 0);
            }
            
            // If ordername is a string, try to parse it
            if (order.ordername && typeof order.ordername === 'string') {
                try {
                    const parsed = JSON.parse(order.ordername);
                    if (Array.isArray(parsed)) {
                        return parsed.reduce((total, item) => {
                            if (typeof item === 'object' && item.quantity) {
                                return total + (parseInt(item.quantity) || 1);
                            }
                            return total + 1;
                        }, 0);
                    }
                } catch (e) {
                    // If parsing fails, assume it's a single product
                    return 1;
                }
            }
            
            // Fallback
            return 1;
        } catch (error) {
            console.error('Error getting product count:', error);
            return 1;
        }
    }

    // Format date and time for display (12/01/1999, 13:50)
    formatDateTime(dateString) {
        try {
            const date = new Date(dateString);
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return 'Invalid Date';
            }
            
            // Format date as DD/MM/YYYY
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            
            // Format time as HH:MM
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            
            return `${day}/${month}/${year}, ${hours}:${minutes}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid Date';
        }
    }

    // Show empty state when no orders
    showEmptyState() {
        const columns = document.querySelectorAll('.column');
        columns.forEach((column, index) => {
            const dataRow = document.createElement('div');
            dataRow.className = 'row data';
            
            let content = '';
            switch (index) {
                case 0: // OrderID column
                    content = `
                        <input type="checkbox" name="check" value="yes" disabled>
                        <p class="data-info">No orders</p>
                    `;
                    break;
                case 1: // Products column
                    content = `<p class="data-info">-</p>`;
                    break;
                case 2: // Price column
                    content = `<p class="data-info">-</p>`;
                    break;
                case 3: // Payment column
                    content = `<p class="data-info">-</p>`;
                    break;
                case 4: // Date column
                    content = `<p class="data-info">-</p>`;
                    break;
                case 5: // Receipt column
                    content = `<a href="#"><p class="data-info receipt">-</p></a>`;
                    break;
                default:
                    content = `<p class="data-info">-</p>`;
            }
            
            dataRow.innerHTML = content;
            column.appendChild(dataRow);
        });
    }

    // Setup event listeners for search and refresh
    setupEventListeners() {
        // Refresh button functionality
        const refreshButton = document.getElementById('refresh-orders');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshOrders();
            });
        }
        
        // Search functionality
        const searchInput = document.getElementById('search-orders');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.trim();
                if (searchTerm) {
                    this.searchOrders(searchTerm);
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
                this.deleteSelectedOrders();
            });
            
            // Initially hide the delete button
            deleteButton.style.display = 'none';
        }
    }

    // Search orders by order ID or other criteria
    searchOrders(searchTerm) {
        try {
            const term = searchTerm.toLowerCase().trim();
            
            this.filteredOrders = this.orders.filter(order => {
                const orderId = (order.order_number || `ORD${String(order.id).padStart(3, '0')}`).toLowerCase();
                const paymentMethod = (order.payment_method || '').toLowerCase();
                const totalPrice = String(order.totalprice || '');
                
                return orderId.includes(term) || 
                       paymentMethod.includes(term) || 
                       totalPrice.includes(term);
            });
            
            this.isFiltered = true;
            this.renderOrders();
            
            this.showMessage(`Found ${this.filteredOrders.length} matching orders`, 'info');
        } catch (error) {
            console.error('Error searching orders:', error);
            this.showMessage('Error searching orders', 'error');
        }
    }

    // Clear search and show all orders
    clearSearch() {
        this.filteredOrders = [...this.orders];
        this.isFiltered = false;
        this.renderOrders();
    }

    // Refresh orders (fetch and re-render)
    async refreshOrders() {
        try {
            this.showMessage('Refreshing orders...', 'info');
            await this.fetchOrders();
            this.renderOrders();
            this.showMessage('Orders refreshed successfully', 'success');
        } catch (error) {
            console.error('Error refreshing orders:', error);
            this.showMessage('Failed to refresh orders', 'error');
        }
    }

    // Delete selected orders
    async deleteSelectedOrders() {
        try {
            const selectedItems = window.checkboxFunctionality.getSelectedItems();
            
            if (selectedItems.length === 0) {
                this.showMessage('No orders selected', 'warning');
                return;
            }

            const confirm = window.confirm(`Are you sure you want to delete ${selectedItems.length} order(s)?`);
            if (!confirm) return;

            this.showMessage('Deleting orders...', 'info');

            const orderIds = selectedItems.map(item => {
                const orderId = item.orderID;
                // Extract numeric ID from order number (e.g., "ORD001" -> 1)
                const match = orderId.match(/\d+/);
                return match ? parseInt(match[0]) : null;
            }).filter(id => id !== null);

            if (orderIds.length === 0) {
                this.showMessage('No valid order IDs found', 'error');
                return;
            }

            const { error } = await supabaseClient
                .from('orders')
                .delete()
                .in('id', orderIds);

            if (error) {
                throw new Error(`Failed to delete orders: ${error.message}`);
            }

            this.showMessage(`Successfully deleted ${orderIds.length} order(s)`, 'success');
            await this.refreshOrders();

        } catch (error) {
            console.error('Error deleting orders:', error);
            this.showMessage('Failed to delete orders', 'error');
        }
    }

    // Show message to user
    showMessage(message, type = 'success') {
        const existingMsg = document.getElementById('order-message');
        if (existingMsg) existingMsg.remove();
        
        const msgElement = document.createElement('div');
        msgElement.id = 'order-message';
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
        
        // Add CSS animation if not already present
        if (!document.getElementById('order-message-styles')) {
            const style = document.createElement('style');
            style.id = 'order-message-styles';
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
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (msgElement.parentNode) {
                msgElement.parentNode.removeChild(msgElement);
            }
        }, 4000);
    }
}

// ===== REAL-TIME UPDATES =====
function initializeOrderRealTimeUpdates() {
    console.log('Initializing real-time order updates...');

    // Wait for businessId to be available
    const waitForBusinessId = setInterval(() => {
        const businessId = window.orderManager?.userBusinessId;
        if (businessId) {
            // Listen for order changes
            const orderSubscription = supabaseClient
                .channel('orders-channel')
                .on('postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'orders',
                        filter: `business_id=eq.${businessId}`
                    },
                    (payload) => {
                        console.log('Order change detected:', payload);
                        window.orderManager?.refreshOrders();
                    }
                )
                .subscribe();

            // Listen for product changes if needed for order display
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
                        window.orderManager?.refreshOrders();
                    }
                )
                .subscribe();

            // Store channels for cleanup if needed
            window.orderRealtimeChannels = [orderSubscription, productSubscription];

            clearInterval(waitForBusinessId);
        }
    }, 200);
}

// ===== MAIN INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Setup checkbox functionality
    setupCheckboxFunctionality();

    // Initialize order manager
    const orderManager = new OrderManager();
    window.orderManager = orderManager;

    // Set up real-time updates after businessId is available
    initializeOrderRealTimeUpdates();
});

// ===== GLOBAL UTILITY FUNCTIONS =====
window.getOrderManager = () => window.orderManager;
window.refreshOrders = () => window.orderManager?.refreshOrders();
window.searchOrders = (searchTerm) => window.orderManager?.searchOrders(searchTerm);
window.deleteSelectedOrders = () => window.orderManager?.deleteSelectedOrders();

// Receipt viewing function
window.viewReceipt = (orderId) => {
    console.log('Viewing receipt for order:', orderId);
    // Implement receipt viewing logic here
    alert(`Receipt for order ${orderId} - Feature to be implemented`);
};

// Export orders function
window.exportOrders = async (format = 'csv') => {
    try {
        const orderManager = window.orderManager;
        if (!orderManager) {
            console.error('Order manager not initialized');
            return;
        }

        const orders = orderManager.orders;
        if (orders.length === 0) {
            alert('No orders to export');
            return;
        }

        let content = '';
        let filename = '';

        if (format === 'csv') {
            // CSV format
            const headers = ['Order ID', 'Products', 'Total Price', 'Payment Method', 'Date & Time', 'Business ID'];
            content = headers.join(',') + '\n';
            
            orders.forEach(order => {
                const orderId = order.order_number || `ORD${String(order.id).padStart(3, '0')}`;
                const productCount = orderManager.getProductCountFromOrder(order);
                const totalPrice = parseFloat(order.totalprice || 0).toFixed(2);
                const paymentMethod = order.payment_method || 'N/A';
                const dateTime = orderManager.formatDateTime(order.created_at);
                
                content += `"${orderId}","${productCount}","$${totalPrice}","${paymentMethod}","${dateTime}","${orderManager.userBusinessId}"\n`;
            });
            
            filename = `orders_${new Date().toISOString().split('T')[0]}.csv`;
        }

        // Create and download file
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`Exported ${orders.length} orders to ${filename}`);
        
    } catch (error) {
        console.error('Error exporting orders:', error);
        alert('Failed to export orders');
    }
};