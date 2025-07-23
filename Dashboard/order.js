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
                const orderIDElement = row.querySelector('.column.one .data-info');
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

    getSelectedCount: function () {
        return document.querySelectorAll('tbody .column.one input[type="checkbox"]:checked').length;
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

            await this.getAuthenticatedUser();
            await this.fetchUserBusinessId();
            await this.fetchOrders();
            this.renderOrders();
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
                .eq('business_id', this.userBusinessId)
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

    // Render orders in the HTML table structure
    renderOrders() {
        try {
            const tbody = document.querySelector('.orders tbody');
            if (!tbody) {
                console.error('Orders tbody not found');
                return;
            }

            // Clear existing data rows
            tbody.innerHTML = '';

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

    // Add a single order row to the table
    addOrderRow(order, index) {
        try {
            const tbody = document.querySelector('.orders tbody');
            if (!tbody) return;

            // Use order_number from database or generate one
            const orderId = order.order_number || `ORD${String(order.id).padStart(3, '0')}`;

            // Get product information from order
            const productInfo = this.getProductInfoFromOrder(order);

            // Format date with time (DD/MM/YYYY, HH:MM)
            const orderDateTime = this.formatDateTime(order.created_at);

            // Format total price
            const totalPrice = `$${parseFloat(order.totalprice || 0).toFixed(2)}`;

            // Payment method
            const paymentMethod = order.payment_method || 'N/A';

            // Create table row
            const row = document.createElement('tr');
            row.className = 'row data';
            row.setAttribute('data-order-id', order.id);

            row.innerHTML = `
                <td class="column one">
                    <input type="checkbox" name="check" value="yes">
                    <span class="data-info">${orderId}</span>
                </td>
                <td class="column two">
                    <span class="data-info">${productInfo}</span>
                </td>
                <td class="column three">
                    <span class="data-info">${totalPrice}</span>
                </td>
                <td class="column four">
                    <span class="data-info">${paymentMethod}</span>
                </td>
                <td class="column five">
                    <span class="data-info date">${orderDateTime}</span>
                </td>
                <td class="column six">
    <a href="#" onclick="viewReceipt('${orderId}')">
        <span class="data-info receipt">view</span>
    </a>
</td>
            `;

            tbody.appendChild(row);

        } catch (error) {
            console.error('Error adding order row:', error);
        }
    }

    // Get product information from order data
    getProductInfoFromOrder(order) {
        try {
            let productText = '';
            let totalQuantity = 0;

            // Handle different formats of ordername
            let orderItems = [];

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
                            orderItems = [{ name: order.ordername, quantity: 1 }];
                        }
                    } catch (e) {
                        // Not JSON, treat as single product name
                        orderItems = [{ name: order.ordername, quantity: 1 }];
                    }
                }
            }

            if (orderItems.length === 0) {
                return 'No products';
            }

            // Calculate total quantity and format product display
            orderItems.forEach(item => {
                const quantity = parseInt(item.quantity) || 1;
                totalQuantity += quantity;
            });

            // If single product, show product name
            if (orderItems.length === 1) {
                const item = orderItems[0];
                const productName = item.name || item.product_name || 'Unknown Product';
                const quantity = parseInt(item.quantity) || 1;
                productText = quantity > 1 ? `${productName} (${quantity})` : productName;
            } else {
                // Multiple products, show count
                productText = `${orderItems.length} products (${totalQuantity} items)`;
            }

            return productText;

        } catch (error) {
            console.error('Error getting product info:', error);
            return 'Error loading products';
        }
    }

    // Format date and time for display (DD/MM/YYYY, HH:MM)
    formatDateTime(dateString) {
        try {
            const date = new Date(dateString);

            if (isNaN(date.getTime())) {
                return 'Invalid Date';
            }

            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();

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
        const tbody = document.querySelector('.orders tbody');
        if (!tbody) return;

        const row = document.createElement('tr');
        row.className = 'row data';
        row.innerHTML = `
            <td class="column one">
                <input type="checkbox" name="check" value="yes" disabled>
                <span class="data-info">No orders</span>
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
                <a href="#"><span class="data-info receipt">-</span></a>
            </td>
        `;

        tbody.appendChild(row);
    }

    // Setup event listeners for search and refresh
    setupEventListeners() {
        const refreshButton = document.getElementById('refresh-orders');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshOrders();
            });
        }

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
                const productInfo = this.getProductInfoFromOrder(order).toLowerCase();

                return orderId.includes(term) ||
                    paymentMethod.includes(term) ||
                    totalPrice.includes(term) ||
                    productInfo.includes(term);
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
                const row = item.row;
                return parseInt(row.getAttribute('data-order-id'));
            }).filter(id => !isNaN(id));

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

    const waitForBusinessId = setInterval(() => {
        const businessId = window.orderManager?.userBusinessId;
        if (businessId) {
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

            window.orderRealtimeChannels = [orderSubscription];
            clearInterval(waitForBusinessId);
        }
    }, 200);
}

// ===== MAIN INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    setupCheckboxFunctionality();

    const orderManager = new OrderManager();
    window.orderManager = orderManager;

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

        const headers = ['Order ID', 'Products', 'Total Price', 'Payment Method', 'Date & Time'];
        let content = headers.join(',') + '\n';

        orders.forEach(order => {
            const orderId = order.order_number || `ORD${String(order.id).padStart(3, '0')}`;
            const productInfo = orderManager.getProductInfoFromOrder(order);
            const totalPrice = parseFloat(order.totalprice || 0).toFixed(2);
            const paymentMethod = order.payment_method || 'N/A';
            const dateTime = orderManager.formatDateTime(order.created_at);

            content += `"${orderId}","${productInfo}","$${totalPrice}","${paymentMethod}","${dateTime}"\n`;
        });

        const filename = `orders_${new Date().toISOString().split('T')[0]}.csv`;
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



