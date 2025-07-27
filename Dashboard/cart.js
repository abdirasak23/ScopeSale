// Cart Management Class with Order Confirmation System, Business ID Integration, and Seller Information
class CartManager {
    constructor() {
        this.cartKey = 'shopping_cart';
        this.cart = this.loadCartFromStorage();
        this.attachCartEvents();
        this.initializePopupStyles();
    }

    // Load cart from localStorage
    loadCartFromStorage() {
        try {
            const cartData = localStorage.getItem(this.cartKey);
            return cartData ? JSON.parse(cartData) : [];
        } catch (error) {
            console.error('Error loading cart from storage:', error);
            return [];
        }
    }

    // Save cart to localStorage
    saveCartToStorage() {
        try {
            localStorage.setItem(this.cartKey, JSON.stringify(this.cart));
        } catch (error) {
            console.error('Error saving cart to storage:', error);
        }
    }

    // Get current user's information (ID and email)
    async getCurrentUserInfo() {
        try {
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

            if (userError || !user) {
                console.error('Error getting current user:', userError);
                throw new Error('User not authenticated');
            }

            return {
                id: user.id,
                email: user.email
            };
        } catch (error) {
            console.error('Error getting current user info:', error);
            throw error;
        }
    }

    // Get current user's business ID (owner or staff)
    async getCurrentBusinessId() {
        try {
            // Get current authenticated user
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

            if (userError || !user) {
                console.error('Error getting current user:', userError);
                throw new Error('User not authenticated');
            }

            const userId = user.id;
            const userEmail = user.email;

            // 1. Try to find business where user is the owner
            let { data: business, error: businessError } = await supabaseClient
                .from('bussiness')
                .select('id, staff_emails')
                .eq('user_id', userId)
                .maybeSingle();

            // 2. If not found, try to find business where user is staff (staff_emails contains userEmail)
            if (!business) {
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
                    business = staffBusinesses[0];
                }
            }

            if (!business || !business.id) {
                console.error('Error fetching user business: No business found for current user or staff email');
                throw new Error('No business found for current user');
            }

            console.log('Current business ID:', business.id);
            return business.id;
        } catch (error) {
            console.error('Error getting current business ID:', error);
            throw error;
        }
    }

    // Get product stock from database
    async getProductStock(productId) {
        try {
            const { data, error } = await supabaseClient
                .from('products')
                .select('stock')
                .eq('id', productId)
                .single();

            if (error) {
                console.error('Error fetching product stock:', error);
                return 0;
            }

            return data.stock;
        } catch (error) {
            console.error('Error getting product stock:', error);
            return 0;
        }
    }

    // Add product to cart with stock validation
    async addToCart(productId, quantity = 1) {
        try {
            // Get current product stock
            const availableStock = await this.getProductStock(productId);
            
            if (availableStock <= 0) {
                this.showMessage('Product is out of stock!', 'error');
                return false;
            }

            const existingItem = this.cart.find(item => item.id === productId);
            const currentCartQuantity = existingItem ? existingItem.quantity : 0;
            const newTotalQuantity = currentCartQuantity + quantity;

            // Check if new quantity exceeds available stock
            if (newTotalQuantity > availableStock) {
                this.showMessage(`Only ${availableStock} items available in stock!`, 'error');
                return false;
            }
            
            if (existingItem) {
                existingItem.quantity = newTotalQuantity;
            } else {
                this.cart.push({
                    id: productId,
                    quantity: quantity,
                    dateAdded: new Date().toISOString()
                });
            }
            
            this.saveCartToStorage();
            return true;
        } catch (error) {
            console.error('Error adding to cart:', error);
            return false;
        }
    }

    // Update product quantity with stock validation
    async updateQuantity(productId, newQuantity) {
        try {
            if (newQuantity < 1) {
                this.showMessage('Quantity must be at least 1', 'error');
                return false;
            }

            // Get current product stock
            const availableStock = await this.getProductStock(productId);
            
            if (newQuantity > availableStock) {
                this.showMessage(`Only ${availableStock} items available in stock!`, 'error');
                return false;
            }

            const item = this.cart.find(item => item.id === productId);
            if (item) {
                item.quantity = newQuantity;
                this.saveCartToStorage();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating quantity:', error);
            return false;
        }
    }

    // Increment quantity with stock validation
    async incrementQuantity(productId) {
        try {
            const item = this.cart.find(item => item.id === productId);
            if (!item) return false;

            const availableStock = await this.getProductStock(productId);
            
            if (item.quantity >= availableStock) {
                this.showMessage(`Maximum stock limit reached (${availableStock} items)!`, 'error');
                return false;
            }

            return await this.updateQuantity(productId, item.quantity + 1);
        } catch (error) {
            console.error('Error incrementing quantity:', error);
            return false;
        }
    }

    // Decrement quantity
    async decrementQuantity(productId) {
        try {
            const item = this.cart.find(item => item.id === productId);
            if (!item) return false;

            if (item.quantity <= 1) {
                this.showMessage('Minimum quantity is 1', 'error');
                return false;
            }

            return await this.updateQuantity(productId, item.quantity - 1);
        } catch (error) {
            console.error('Error decrementing quantity:', error);
            return false;
        }
    }

    // Remove product from cart
    removeFromCart(productId) {
        try {
            this.cart = this.cart.filter(item => item.id !== productId);
            this.saveCartToStorage();
            return true;
        } catch (error) {
            console.error('Error removing from cart:', error);
            return false;
        }
    }

    // Get cart items
    getCartItems() {
        return this.cart;
    }

    // Get cart count
    getCartCount() {
        return this.cart.reduce((total, item) => total + item.quantity, 0);
    }

    // Clear cart
    clearCart() {
        this.cart = [];
        this.saveCartToStorage();
    }

    // Check if product is in cart
    isInCart(productId) {
        return this.cart.some(item => item.id === productId);
    }

    // Get cart total (requires product data)
    async getCartTotal() {
        if (this.cart.length === 0) return 0;
        
        let total = 0;
        for (const item of this.cart) {
            try {
                const { data, error } = await supabaseClient
                    .from('products')
                    .select('price')
                    .eq('id', item.id)
                    .single();

                if (!error && data) {
                    total += data.price * item.quantity;
                }
            } catch (error) {
                console.error('Error calculating total:', error);
            }
        }
        return total;
    }

    // Initialize popup styles
    initializePopupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }

            .popup-container {
                background: white;
                border-radius: 0px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                width: 90%;
                max-width: 400px;
                overflow: hidden;
                animation: slideIn 0.3s ease;
            }

            .popup-header {
                background: #3498db;
                color: white;
                padding: 15px;
                text-align: center;
                position: relative;
            }

            .popup-close {
                position: absolute;
                top: 10px;
                right: 10px;
                background: transparent;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
            }

            .popup-content {
                padding: 20px;
                text-align: center;
            }

            .popup-message {
                font-size: 16px;
                margin-bottom: 10px;
                color: #333;
            }

            .payment-display {
                font-weight: bold;
                margin-bottom: 15px;
                padding: 8px;
                background: #f8f9fa;
                border-radius: 5px;
                border: 1px dashed #ccc;
            }

            .popup-buttons {
                display: flex;
                justify-content: center;
                gap: 15px;
                margin-top: 20px;
            }

            .popup-button {
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.3s ease;
            }

            .cancel-button {
                background: #e74c3c;
                color: white;
            }

            .sell-button {
                background: #2d22c0ff;
                color: white;
            }

            .success-button {
                background: #2ecc71;
                color: white;
                width: 100%;
            }

            .popup-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideIn {
                from { transform: translateY(-30px); }
                to { transform: translateY(0); }
            }

            .success-popup {
                text-align: center;
                padding: 20px;
            }

            .success-icon {
                font-size: 48px;
                color: #2ecc71;
                margin-bottom: 15px;
            }
        `;
        document.head.appendChild(style);
    }

    // Update stock in database using direct SQL update
    async updateProductStock(productId, quantityToReduce) {
        try {
            // Get current stock first
            const { data: currentProduct, error: fetchError } = await supabaseClient
                .from('products')
                .select('stock')
                .eq('id', productId)
                .single();

            if (fetchError) {
                throw new Error(`Failed to fetch current stock: ${fetchError.message}`);
            }

            const newStock = currentProduct.stock - quantityToReduce;
            
            if (newStock < 0) {
                throw new Error(`Insufficient stock for product ${productId}. Available: ${currentProduct.stock}, Requested: ${quantityToReduce}`);
            }

            // Update the stock
            const { error: updateError } = await supabaseClient
                .from('products')
                .update({ stock: newStock })
                .eq('id', productId);

            if (updateError) {
                throw new Error(`Failed to update stock: ${updateError.message}`);
            }

            console.log(`Stock updated for product ${productId}: ${currentProduct.stock} -> ${newStock}`);
            return true;
        } catch (error) {
            console.error(`Error updating stock for product ${productId}:`, error);
            throw error;
        }
    }

    // Save order to Supabase with payment method, business_id, seller_id, and seller_email
    async saveOrderToDatabase(paymentMethod) {
        try {
            console.log('Starting order save process...');
            
            // Get current business ID and user info
            const businessId = await this.getCurrentBusinessId();
            const userInfo = await this.getCurrentUserInfo();
            
            console.log('Using business ID:', businessId);
            console.log('Seller ID:', userInfo.id);
            console.log('Seller Email:', userInfo.email);
            
            // Prepare order items
            const orderItems = [];
            let totalPrice = 0;
            let totalQuantity = 0;
            
            // Fetch product details and calculate total
            for (const cartItem of this.cart) {
                const { data: product, error } = await supabaseClient
                    .from('products')
                    .select('id, name, price, stock')
                    .eq('id', cartItem.id)
                    .single();
                
                if (error || !product) {
                    console.error(`Product fetch error for ID ${cartItem.id}:`, error);
                    throw new Error(`Failed to fetch product details for ID ${cartItem.id}`);
                }
                
                // Double-check stock availability
                if (product.stock < cartItem.quantity) {
                    throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}`);
                }
                
                const itemTotal = product.price * cartItem.quantity;
                totalPrice += itemTotal;
                totalQuantity += cartItem.quantity;
                
                orderItems.push({
                    product_id: product.id,
                    product_name: product.name,
                    quantity: cartItem.quantity,
                    unit_price: product.price,
                    line_total: itemTotal
                });
            }
            
            // Create order data with payment method, business_id, seller_id, and seller_email
            const orderData = {
                ordername: orderItems,
                quantity: totalQuantity,
                price: orderItems[0]?.unit_price || 0,
                totalprice: totalPrice,
                payment_method: paymentMethod,
                business_id: businessId, // Link order to current user's business
                saler_id: userInfo.id, // ID of the user who made the sale
                saler_email: userInfo.email, // Email of the user who made the sale
                created_at: new Date().toISOString()
            };
            
            console.log("Saving order to database:", orderData);
            
            // Insert into orders table
            const { data: insertedOrder, error: insertError } = await supabaseClient
                .from('orders')
                .insert([orderData])
                .select();
            
            if (insertError) {
                console.error("Order insert error:", insertError);
                throw new Error(`Failed to save order: ${insertError.message}`);
            }
            
            console.log("Order saved successfully with seller info:", insertedOrder);
            
            // Update product stock for each item
            for (const cartItem of this.cart) {
                try {
                    await this.updateProductStock(cartItem.id, cartItem.quantity);
                } catch (stockError) {
                    console.error(`Stock update failed for product ${cartItem.id}:`, stockError);
                    // Note: Order is already saved, but stock update failed
                    // You might want to handle this scenario based on your business logic
                    throw new Error(`Stock update failed for product ${cartItem.id}: ${stockError.message}`);
                }
            }
            
            console.log("All stock updates completed successfully");
            return true;
            
        } catch (error) {
            console.error('Error in saveOrderToDatabase:', error);
            throw error; // Re-throw to let the caller handle it
        }
    }

    // Show confirmation popup
    showConfirmationPopup() {
        // Get selected payment method from HTML
        const paymentSelect = document.querySelector('.payment');
        if (!paymentSelect || !paymentSelect.value) {
            this.showMessage('Please select a payment method', 'error');
            return;
        }
        
        // Get payment method text from selected option
        const paymentMethod = paymentSelect.options[paymentSelect.selectedIndex].text;
        
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.id = 'confirmation-overlay';
        
        overlay.innerHTML = `
            <div class="popup-container">
                <div class="popup-header">
                    <h3>Confirm Sale</h3>
                    <button class="popup-close">&times;</button>
                </div>
                <div class="popup-content">
                    <p class="popup-message">Do you want to sell these products?</p>
                    <div class="payment-display">Payment Method: ${paymentMethod}</div>
                    <div class="popup-buttons">
                        <button class="popup-button cancel-button" id="cancel-sale">Cancel</button>
                        <button class="popup-button sell-button" id="confirm-sale" data-payment="${paymentMethod}">Sell</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Event listeners
        overlay.querySelector('.popup-close').addEventListener('click', () => {
            this.closePopup(overlay);
        });
        
        overlay.querySelector('#cancel-sale').addEventListener('click', () => {
            this.closePopup(overlay);
        });
        
        overlay.querySelector('#confirm-sale').addEventListener('click', async (e) => {
            try {
                // Get payment method from button data attribute
                const paymentMethod = e.target.dataset.payment;
                
                // Disable buttons during processing
                e.target.disabled = true;
                e.target.textContent = 'Processing...';
                overlay.querySelector('#cancel-sale').disabled = true;
                
                // Process the sale
                const success = await this.processSale(paymentMethod);
                
                if (success) {
                    this.closePopup(overlay);
                    this.showSuccessPopup(paymentMethod);
                } else {
                    this.showMessage('Failed to complete sale. Please try again.', 'error');
                    // Re-enable buttons on failure
                    e.target.disabled = false;
                    e.target.textContent = 'Sell';
                    overlay.querySelector('#cancel-sale').disabled = false;
                }
            } catch (error) {
                console.error('Error in confirm sale:', error);
                this.showMessage('An error occurred while processing the sale.', 'error');
                // Re-enable buttons on error
                e.target.disabled = false;
                e.target.textContent = 'Sell';
                overlay.querySelector('#cancel-sale').disabled = false;
            }
        });
        
        // Close when clicking outside
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closePopup(overlay);
            }
        });
    }

    // Show success popup
    showSuccessPopup(paymentMethod) {
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.id = 'success-overlay';
        
        overlay.innerHTML = `
            <div class="popup-container">
                <div class="popup-content success-popup">
                    <div class="success-icon">✓</div>
                    <h3>Sale Successful!</h3>
                    <p>Products sold successfully</p>
                    <p>Payment Method: ${paymentMethod}</p>
                    <div style="margin-top: 20px;">
                        <button class="popup-button success-button" id="success-ok">OK</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Event listener
        overlay.querySelector('#success-ok').addEventListener('click', () => {
            this.closePopup(overlay);
        });
        
        // Close when clicking outside
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closePopup(overlay);
            }
        });
    }

    // Close popup
    closePopup(overlay) {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }

    // Process sale
    async processSale(paymentMethod) {
        try {
            console.log('Starting sale process...');
            
            // Validate cart is not empty
            if (this.cart.length === 0) {
                this.showMessage('Cart is empty!', 'error');
                return false;
            }
            
            // Validate stock before processing
            const invalidItems = await this.validateCartStock();
            if (invalidItems.length > 0) {
                let message = 'Stock validation failed:\n';
                invalidItems.forEach(item => {
                    message += `Product ${item.productId}: Requested ${item.requestedQuantity}, Available ${item.availableStock}\n`;
                });
                this.showMessage(message, 'error');
                return false;
            }
            
            // Save order to database (this includes stock updates, business_id, seller_id, and seller_email)
            await this.saveOrderToDatabase(paymentMethod);
            
            // Clear cart only if everything succeeded
            this.clearCart();
            await this.renderCart();
            
            console.log('Sale completed successfully');
            return true;
            
        } catch (error) {
            console.error('Error in processSale:', error);
            this.showMessage(`Sale failed: ${error.message}`, 'error');
            return false;
        }
    }

    // Attach cart-related DOM events
    attachCartEvents() {
        // Handle cart icon click to display cart content
        const cartIcon = document.querySelector('.cart[data-target="cart-content"]');
        if (cartIcon) {
            cartIcon.addEventListener('click', async () => {
                await this.renderCart();
            });
        }
        
        // Event delegation for cart controls
        document.addEventListener('click', async (e) => {
            const cartSection = document.querySelector('.cart-section');
            if (!cartSection) return;
            
            // Handle plus button
            if (e.target.closest('.plus') || e.target.classList.contains('bx-plus')) {
                const productId = e.target.closest('.plus')?.dataset?.id;
                if (productId) {
                    this.showLoadingState(productId, 'plus');
                    const success = await this.incrementQuantity(parseInt(productId));
                    if (success) {
                        await this.renderCart();
                    }
                    this.hideLoadingState(productId, 'plus');
                }
            }
            
            // Handle minus button
            if (e.target.closest('.minus') || e.target.classList.contains('bx-minus')) {
                const productId = e.target.closest('.minus')?.dataset?.id;
                if (productId) {
                    this.showLoadingState(productId, 'minus');
                    const success = await this.decrementQuantity(parseInt(productId));
                    if (success) {
                        await this.renderCart();
                    }
                    this.hideLoadingState(productId, 'minus');
                }
            }
            
            // Handle sell button
            if (e.target.closest('.sell') || e.target.textContent === 'Sell Now') {
                if (this.cart.length === 0) {
                    this.showMessage('Your cart is empty!', 'error');
                    return;
                }
                
                // Show confirmation popup
                this.showConfirmationPopup();
            }
        });
    }

    // Show loading state for quantity buttons
    showLoadingState(productId, buttonType) {
        const button = document.querySelector(`.${buttonType}[data-id="${productId}"]`);
        if (button) {
            button.style.opacity = '0.5';
            button.style.pointerEvents = 'none';
            const icon = button.querySelector('i');
            if (icon) {
                icon.className = 'bx bx-loader-alt bx-spin';
            }
        }
    }

    // Hide loading state for quantity buttons
    hideLoadingState(productId, buttonType) {
        const button = document.querySelector(`.${buttonType}[data-id="${productId}"]`);
        if (button) {
            button.style.opacity = '1';
            button.style.pointerEvents = 'auto';
            const icon = button.querySelector('i');
            if (icon) {
                icon.className = buttonType === 'plus' ? 'bxr bx-plus' : 'bxr bx-minus';
            }
        }
    }

    // Render cart items in the cart container
    async renderCart() {
        const cartSection = document.querySelector('.cart-section');
        if (!cartSection) return;
        
        // Remove existing cart products
        const existingProducts = cartSection.querySelectorAll('.cart-product');
        existingProducts.forEach(el => el.remove());
        
        // Get cart items
        const cartItems = this.getCartItems();
        
        if (cartItems.length === 0) {
            // Show empty cart state
            const bottomCart = cartSection.querySelector('.bottom-cart');
            if (bottomCart) {
                bottomCart.style.display = 'none';
            }
            return;
        }
        
        // Show bottom cart
        const bottomCart = cartSection.querySelector('.bottom-cart');
        if (bottomCart) {
            bottomCart.style.display = 'block';
        }
        
        // Create and append cart products
        let total = 0;
        
        for (const item of cartItems) {
            try {
                // Get product data from database
                const { data: product, error } = await supabaseClient
                    .from('products')
                    .select('*')
                    .eq('id', item.id)
                    .single();

                if (error || !product) {
                    console.error('Error fetching product:', error);
                    continue;
                }
                
                total += product.price * item.quantity;
                
                const cartProduct = document.createElement('div');
                cartProduct.className = 'cart-product';
                cartProduct.innerHTML = `
                    <div class="cart-left">
                        <p class="cart-name">${product.name}</p>
                        <p class="cart-price">Price: ₹${product.price}/-</p>
                        <p class="cart-stock">Stock: ${product.stock} available</p>
                    </div>
                    <div class="cart-right">
                        <div class="quantity">
                            <div class="minus" data-id="${product.id}">
                                <i class='bxr bx-minus'></i>
                            </div>
                            <p class="qua">${item.quantity.toString().padStart(2, '0')}</p>
                            <div class="plus" data-id="${product.id}">
                                <i class='bxr bx-plus'></i>
                            </div>
                        </div>
                    </div>
                `;
                
                cartSection.insertBefore(cartProduct, cartSection.querySelector('.bottom-cart'));
            } catch (error) {
                console.error('Error rendering cart item:', error);
            }
        }
        
        // Update total
        const totalElement = document.querySelector('.total p');
        if (totalElement) {
            totalElement.textContent = `Total: ₹${total}/-`;
        }
    }

    // Show message to user
    showMessage(message, type = 'success') {
        const existingMsg = document.getElementById('cart-message');
        if (existingMsg) existingMsg.remove();
        
        const msgElement = document.createElement('div');
        msgElement.id = 'cart-message';
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
            white-space: pre-wrap;
            background: ${type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#dc3545'};
            color: ${type === 'warning' ? '#333' : 'white'};
            animation: fadeInOut 5s forwards;
        `;
        
        document.body.appendChild(msgElement);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (msgElement.parentNode) {
                msgElement.parentNode.removeChild(msgElement);
            }
        }, 5000);
    }

    // Validate cart against current stock levels
    async validateCartStock() {
        const invalidItems = [];
        
        for (const item of this.cart) {
            const availableStock = await this.getProductStock(item.id);
            if (item.quantity > availableStock) {
                invalidItems.push({
                    productId: item.id,
                    requestedQuantity: item.quantity,
                    availableStock: availableStock
                });
            }
        }
        
        return invalidItems;
    }
}

// Initialize the cart manager
const cartManager = new CartManager();

// Make cart manager available globally
window.cartManager = cartManager;

// Global functions for easy access
window.getCartManager = () => cartManager;
window.getCartCount = () => cartManager.getCartCount();
window.getCartItems = () => cartManager.getCartItems();
window.clearCart = () => cartManager.clearCart();
window.addToCart = (productId, quantity = 1) => cartManager.addToCart(productId, quantity);
window.removeFromCart = (productId) => cartManager.removeFromCart(productId);
window.updateCartQuantity = (productId, quantity) => cartManager.updateQuantity(productId, quantity);

// Additional CSS for fade animation
const fadeAnimationStyle = document.createElement('style');
fadeAnimationStyle.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(100%); }
        10% { opacity: 1; transform: translateX(0); }
        90% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(100%); }
    }
`;
document.head.appendChild(fadeAnimationStyle);