// // inventory.js - Complete Inventory Management with Business ID Filtering

// // Initialize Supabase client
// const supabaseUrl = 'https://jvcrkjkhmglgrwkadzxw.supabase.co';
// const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y3JramtobWdsZ3J3a2Fkenh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTQwOTgsImV4cCI6MjA2NzI3MDA5OH0.4uGTPJg2Nbl8QvGy6UhlBJlJ4lUtMl9f6vTJ_jf8z3o';
// const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// // Inventory Manager Class
// class InventoryManager {
//     constructor() {
//         this.inventory = [];
//         this.currentUser = null;
//         this.userBusinessId = null;
//         this.isInitialized = false;
//         this.initializationPromise = null;
//         this.selectedProducts = new Set();
        
//         // Start initialization
//         this.initializationPromise = this.initializeUser();
//     }

//     // Initialize user session and get business ID
//     async initializeUser() {
//         try {
//             console.log('🔄 Initializing InventoryManager...');
            
//             // Get current user session
//             const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
            
//             if (userError) {
//                 console.error('❌ Error getting user:', userError);
//                 this.showError('Failed to authenticate user');
//                 return false;
//             }
            
//             if (!user) {
//                 console.log('⚠️  No authenticated user found');
//                 this.showError('Please log in to view inventory');
//                 this.showNoInventory('Please log in to view inventory');
//                 return false;
//             }
            
//             this.currentUser = user;
//             console.log('✅ User authenticated:', user.id);
            
//             // Get user's business ID from bussiness table
//             const businessId = await this.fetchUserBusinessId();
            
//             if (businessId) {
//                 console.log('✅ Business ID found:', businessId);
//                 this.isInitialized = true;
//                 // Fetch inventory after successful initialization
//                 await this.fetchInventory();
//                 return true;
//             } else {
//                 console.log('⚠️  No business ID found');
//                 this.showNoInventory('No business found for your account');
//                 return false;
//             }
            
//         } catch (error) {
//             console.error('❌ Error initializing user:', error);
//             this.showError('Failed to initialize user session');
//             this.showNoInventory('Failed to initialize user session');
//             return false;
//         }
//     }

//     // Fetch user's business ID from bussiness table (owner or staff)
//     async fetchUserBusinessId() {
//         try {
//             if (!this.currentUser) {
//                 console.log('⚠️  No current user available');
//                 return null;
//             }

//             const userId = this.currentUser.id;
//             const userEmail = this.currentUser.email;

//             // 1. Try to find business where user is the owner
//             let { data: businessData, error: businessError } = await supabaseClient
//                 .from('bussiness')
//                 .select('*')
//                 .eq('user_id', userId)
//                 .maybeSingle();

//             // 2. If not found, try to find business where user is staff (staff_emails contains userEmail)
//             if (!businessData) {
//                 // Try with contains operator (array column)
//                 let { data: staffBusinesses, error: staffError } = await supabaseClient
//                     .from('bussiness')
//                     .select('*')
//                     .contains('staff_emails', [userEmail]);

//                 // Fallback: If contains fails (for older Postgres or if staff_emails is not array), check manually
//                 if (staffError) {
//                     // Try fallback: fetch all businesses and check manually
//                     const { data: allBusinesses, error: allError } = await supabaseClient
//                         .from('bussiness')
//                         .select('*');
//                     if (!allError && Array.isArray(allBusinesses)) {
//                         staffBusinesses = allBusinesses.filter(biz =>
//                             Array.isArray(biz.staff_emails) && biz.staff_emails.includes(userEmail)
//                         );
//                     }
//                 }

//                 if (staffBusinesses && staffBusinesses.length > 0) {
//                     businessData = staffBusinesses[0];
//                 }
//             }

//             if (!businessData || !businessData.id) {
//                 console.log('⚠️  No business found for user or staff email');
//                 this.userBusinessId = null;
//                 return null;
//             }

//             this.userBusinessId = businessData.id;
//             console.log('✅ User business found:', {
//                 id: this.userBusinessId,
//                 name: businessData.company_name,
//                 user_id: businessData.user_id,
//                 staff_emails: businessData.staff_emails
//             });

//             return this.userBusinessId;

//         } catch (error) {
//             console.error('❌ Error getting user business ID:', error);
//             this.showError('Failed to get business information');
//             return null;
//         }
//     }

//     // Wait for initialization to complete
//     async waitForInitialization() {
//         if (this.isInitialized) {
//             return true;
//         }
        
//         if (this.initializationPromise) {
//             return await this.initializationPromise;
//         }
        
//         return false;
//     }

//     // Format product ID to display format (PRO + padded number)
//     formatProductId(id) {
//         return `PRO${String(id).padStart(3, '0')}`;
//     }

//     // Calculate total sales for a product (you might need to adjust this based on your sales/orders table)
//     async calculateProductSales(productId) {
//         try {
//             // Assuming you have an 'orders' table with product sales data
//             // Adjust the table name and columns based on your actual schema
//             const { data, error } = await supabaseClient
//                 .from('orders')
//                 .select('quantity')
//                 .eq('product_id', productId)
//                 .eq('business_id', this.userBusinessId);

//             if (error) {
//                 console.log('⚠️  Error fetching sales data:', error);
//                 return 0;
//             }

//             const totalSales = data?.reduce((sum, order) => sum + (order.quantity || 0), 0) || 0;
//             return totalSales;
//         } catch (error) {
//             console.log('⚠️  Error calculating sales:', error);
//             return 0;
//         }
//     }

//     // Fetch inventory from products table
//     async fetchInventory() {
//         try {
//             // Ensure initialization is complete
//             await this.waitForInitialization();
            
//             if (!this.userBusinessId) {
//                 console.log('⚠️  No business ID available - showing no inventory');
//                 this.showNoInventory('No business found for your account');
//                 return [];
//             }

//             console.log('📦 Fetching inventory for business ID:', this.userBusinessId);

//             // Query products table filtered by business_id
//             const { data, error } = await supabaseClient
//                 .from('products')
//                 .select('*')
//                 .eq('business_id', this.userBusinessId)
//                 .order('id', { ascending: true });

//             if (error) {
//                 console.error('❌ Error fetching inventory:', error);
//                 this.showError('Failed to fetch inventory: ' + error.message);
//                 this.showNoInventory('Failed to fetch inventory');
//                 return [];
//             }

//             console.log('📦 Inventory query result:', {
//                 business_id: this.userBusinessId,
//                 products_found: data ? data.length : 0,
//                 products: data
//             });

//             this.inventory = data || [];
            
//             if (this.inventory.length === 0) {
//                 console.log('📦 No inventory found for business ID:', this.userBusinessId);
//                 this.showNoInventory('No products found in inventory');
//             } else {
//                 console.log('✅ Inventory found:', this.inventory.length);
//                 await this.displayInventory(this.inventory);
//             }
            
//             return this.inventory;
            
//         } catch (error) {
//             console.error('❌ Fetch inventory error:', error);
//             this.showError('Failed to fetch inventory: ' + error.message);
//             this.showNoInventory('Failed to fetch inventory');
//             return [];
//         }
//     }

//     // Display inventory in the table
//     async displayInventory(products) {
//         console.log('🎨 Displaying inventory:', products.length);
        
//         const inventoryTableBody = document.querySelector('.orders.inventory tbody');
//         if (!inventoryTableBody) {
//             console.error('❌ Inventory table body not found');
//             return;
//         }

//         // Clear existing content
//         inventoryTableBody.innerHTML = '';

//         // If no products, show message
//         if (products.length === 0) {
//             this.showNoInventory('No products found in inventory');
//             return;
//         }

//         // Create inventory rows
//         for (const product of products) {
//             // Calculate sales for this product
//             const salesCount = await this.calculateProductSales(product.id);
            
//             const row = document.createElement('tr');
//             row.className = 'row data';
//             row.dataset.productId = product.id;
            
//             // Add low stock warning class if stock is low
//             if (product.stock <= 5) {
//                 row.classList.add('low-stock');
//             }
            
//             row.innerHTML = `
//                 <td class="column one">
//                     <input type="checkbox" name="check" value="yes" data-product-id="${product.id}">
//                     <span class="data-info product-id">${this.formatProductId(product.id)}</span>
//                 </td>
//                 <td class="column two">
//                     <span class="data-info product-name">${product.name}</span>
//                 </td>
//                 <td class="column three">
//                     <span class="data-info product-price">$${product.price}</span>
//                 </td>
//                 <td class="column four">
//                     <span class="data-info product-stock ${product.stock <= 5 ? 'low-stock-text' : ''}">${product.stock}</span>
//                 </td>
//                 <td class="column five">
//                     <span class="data-info product-category">${product.category}</span>
//                 </td>
//                 <td class="column six">
//                     <a href="#" class="sales-link" data-product-id="${product.id}">
//                         <span class="data-info product-sales">${salesCount}</span>
//                     </a>
//                 </td>
//             `;
            
//             inventoryTableBody.appendChild(row);
//         }

//         // Attach event listeners
//         this.attachEventListeners();
//         this.updateInventoryStats();
        
//         console.log('✅ Inventory displayed successfully');
//     }

//     // Show no inventory message
//     showNoInventory(message = 'No products found in inventory') {
//         const inventoryTableBody = document.querySelector('.orders.inventory tbody');
//         if (!inventoryTableBody) {
//             console.error('❌ Inventory table body not found');
//             return;
//         }

//         inventoryTableBody.innerHTML = `
//             <tr>
//                 <td colspan="6" style="text-align: center; padding: 40px 20px;">
//                     <div style="
//                         background: #f8f9fa;
//                         border-radius: 8px;
//                         padding: 30px;
//                         border: 1px solid #e9ecef;
//                     ">
//                         <div style="font-size: 48px; color: #6c757d; margin-bottom: 16px;">📦</div>
//                         <h3 style="color: #495057; margin-bottom: 8px;">${message}</h3>
//                         <p style="color: #6c757d; margin: 0; font-size: 14px;">
//                             User ID: ${this.currentUser?.id || 'Not logged in'}<br>
//                             Business ID: ${this.userBusinessId || 'Not found'}
//                         </p>
//                     </div>
//                 </td>
//             </tr>
//         `;
//     }

//     // Attach event listeners
//     attachEventListeners() {
//         // Header checkbox for select all
//         const headerCheckbox = document.querySelector('.orders.inventory thead input[type="checkbox"]');
//         if (headerCheckbox) {
//             headerCheckbox.addEventListener('change', (e) => {
//                 this.handleSelectAll(e.target.checked);
//             });
//         }

//         // Individual checkboxes
//         const checkboxes = document.querySelectorAll('.orders.inventory tbody input[type="checkbox"]');
//         checkboxes.forEach(checkbox => {
//             checkbox.addEventListener('change', (e) => {
//                 this.handleProductSelect(e.target.dataset.productId, e.target.checked);
//             });
//         });

//         // Sales links
//         const salesLinks = document.querySelectorAll('.sales-link');
//         salesLinks.forEach(link => {
//             link.addEventListener('click', (e) => {
//                 e.preventDefault();
//                 const productId = e.target.closest('.sales-link').dataset.productId;
//                 this.showProductSalesDetails(productId);
//             });
//         });

//         // Edit Product button
//         const editButton = document.querySelector('.edit-product');
//         if (editButton) {
//             editButton.addEventListener('click', () => {
//                 this.handleEditSelected();
//             });
//         }
//     }

//     // Handle select all checkbox
//     handleSelectAll(isChecked) {
//         const checkboxes = document.querySelectorAll('.orders.inventory tbody input[type="checkbox"]');
//         checkboxes.forEach(checkbox => {
//             checkbox.checked = isChecked;
//             const productId = checkbox.dataset.productId;
//             if (isChecked) {
//                 this.selectedProducts.add(productId);
//             } else {
//                 this.selectedProducts.delete(productId);
//             }
//         });
        
//         this.updateEditButtonState();
//     }

//     // Handle individual product selection
//     handleProductSelect(productId, isChecked) {
//         if (isChecked) {
//             this.selectedProducts.add(productId);
//         } else {
//             this.selectedProducts.delete(productId);
//         }
        
//         // Update header checkbox state
//         const headerCheckbox = document.querySelector('.orders.inventory thead input[type="checkbox"]');
//         const allCheckboxes = document.querySelectorAll('.orders.inventory tbody input[type="checkbox"]');
//         const checkedCheckboxes = document.querySelectorAll('.orders.inventory tbody input[type="checkbox"]:checked');
        
//         if (headerCheckbox) {
//             if (checkedCheckboxes.length === 0) {
//                 headerCheckbox.indeterminate = false;
//                 headerCheckbox.checked = false;
//             } else if (checkedCheckboxes.length === allCheckboxes.length) {
//                 headerCheckbox.indeterminate = false;
//                 headerCheckbox.checked = true;
//             } else {
//                 headerCheckbox.indeterminate = true;
//                 headerCheckbox.checked = false;
//             }
//         }
        
//         this.updateEditButtonState();
//     }

//     // Update edit button state
//     updateEditButtonState() {
//         const editButton = document.querySelector('.edit-product');
//         if (editButton) {
//             if (this.selectedProducts.size > 0) {
//                 editButton.textContent = `Edit ${this.selectedProducts.size} Product${this.selectedProducts.size > 1 ? 's' : ''}`;
//                 editButton.disabled = false;
//                 editButton.style.opacity = '1';
//             } else {
//                 editButton.textContent = 'Edit Product';
//                 editButton.disabled = true;
//                 editButton.style.opacity = '0.5';
//             }
//         }
//     }

//     // Handle edit selected products
//     handleEditSelected() {
//         if (this.selectedProducts.size === 0) {
//             this.showError('Please select at least one product to edit');
//             return;
//         }

//         const selectedIds = Array.from(this.selectedProducts);
//         console.log('🔧 Editing products:', selectedIds);
        
//         // You can implement the edit functionality here
//         // For example, open a modal or navigate to edit page
//         this.showSuccess(`Selected ${selectedIds.length} product(s) for editing`);
        
//         // Example: You might want to emit an event or call a function
//         if (window.openProductEditModal) {
//             window.openProductEditModal(selectedIds);
//         }
//     }

//     // Show product sales details
//     async showProductSalesDetails(productId) {
//         try {
//             console.log('📊 Showing sales details for product:', productId);
            
//             const product = this.inventory.find(p => p.id == productId);
//             if (!product) {
//                 this.showError('Product not found');
//                 return;
//             }

//             // Fetch detailed sales data
//             const { data: salesData, error } = await supabaseClient
//                 .from('orders')
//                 .select('*')
//                 .eq('product_id', productId)
//                 .eq('business_id', this.userBusinessId)
//                 .order('created_at', { ascending: false });

//             if (error) {
//                 console.error('❌ Error fetching sales details:', error);
//                 this.showError('Failed to fetch sales details');
//                 return;
//             }

//             const totalSales = salesData?.reduce((sum, order) => sum + (order.quantity || 0), 0) || 0;
//             const totalRevenue = salesData?.reduce((sum, order) => sum + ((order.quantity || 0) * (order.price || product.price)), 0) || 0;

//             // Show sales details (you can customize this display)
//             this.showSalesModal(product, salesData, totalSales, totalRevenue);
            
//         } catch (error) {
//             console.error('❌ Error showing sales details:', error);
//             this.showError('Failed to show sales details');
//         }
//     }

//     // Show sales modal (you can customize this)
//     showSalesModal(product, salesData, totalSales, totalRevenue) {
//         const modal = document.createElement('div');
//         modal.className = 'sales-modal';
//         modal.innerHTML = `
//             <div class="modal-overlay">
//                 <div class="modal-content">
//                     <div class="modal-header">
//                         <h3>Sales Details - ${product.name}</h3>
//                         <button class="close-modal">&times;</button>
//                     </div>
//                     <div class="modal-body">
//                         <div class="sales-summary">
//                             <div class="stat">
//                                 <span class="stat-label">Product ID:</span>
//                                 <span class="stat-value">${this.formatProductId(product.id)}</span>
//                             </div>
//                             <div class="stat">
//                                 <span class="stat-label">Total Sales:</span>
//                                 <span class="stat-value">${totalSales} units</span>
//                             </div>
//                             <div class="stat">
//                                 <span class="stat-label">Total Revenue:</span>
//                                 <span class="stat-value">$${totalRevenue.toFixed(2)}</span>
//                             </div>
//                             <div class="stat">
//                                 <span class="stat-label">Current Stock:</span>
//                                 <span class="stat-value">${product.stock} units</span>
//                             </div>
//                         </div>
//                         ${salesData && salesData.length > 0 ? `
//                             <div class="recent-sales">
//                                 <h4>Recent Sales</h4>
//                                 <div class="sales-list">
//                                     ${salesData.slice(0, 5).map(sale => `
//                                         <div class="sale-item">
//                                             <span>Qty: ${sale.quantity}</span>
//                                             <span>$${(sale.quantity * (sale.price || product.price)).toFixed(2)}</span>
//                                             <span>${new Date(sale.created_at).toLocaleDateString()}</span>
//                                         </div>
//                                     `).join('')}
//                                 </div>
//                             </div>
//                         ` : '<p>No sales recorded yet</p>'}
//                     </div>
//                 </div>
//             </div>
//         `;
        
//         document.body.appendChild(modal);
        
//         // Close modal functionality
//         const closeBtn = modal.querySelector('.close-modal');
//         const overlay = modal.querySelector('.modal-overlay');
        
//         const closeModal = () => {
//             document.body.removeChild(modal);
//         };
        
//         closeBtn.addEventListener('click', closeModal);
//         overlay.addEventListener('click', (e) => {
//             if (e.target === overlay) closeModal();
//         });
//     }

//     // Update inventory statistics
//     updateInventoryStats() {
//         const totalProducts = this.inventory.length;
//         const lowStockProducts = this.inventory.filter(p => p.stock <= 5).length;
//         const outOfStockProducts = this.inventory.filter(p => p.stock === 0).length;
//         const totalValue = this.inventory.reduce((sum, p) => sum + (p.price * p.stock), 0);

//         // You can display these stats somewhere in your UI
//         console.log('📊 Inventory Stats:', {
//             totalProducts,
//             lowStockProducts,
//             outOfStockProducts,
//             totalValue: `$${totalValue.toFixed(2)}`
//         });

//         // Update stats display if elements exist
//         const statsElements = {
//             '.total-products': totalProducts,
//             '.low-stock-count': lowStockProducts,
//             '.out-of-stock-count': outOfStockProducts,
//             '.total-inventory-value': `$${totalValue.toFixed(2)}`
//         };

//         Object.entries(statsElements).forEach(([selector, value]) => {
//             const element = document.querySelector(selector);
//             if (element) {
//                 element.textContent = value;
//             }
//         });
//     }

//     // Search inventory
//     async searchInventory(searchQuery) {
//         try {
//             await this.waitForInitialization();
            
//             if (!this.userBusinessId) {
//                 console.log('⚠️  No business ID available for search');
//                 this.showNoInventory('No business found for your account');
//                 return [];
//             }

//             console.log('🔍 Searching inventory:', searchQuery, 'for business ID:', this.userBusinessId);

//             const { data, error } = await supabaseClient
//                 .from('products')
//                 .select('*')
//                 .eq('business_id', this.userBusinessId)
//                 .or(`name.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
//                 .order('id', { ascending: true });

//             if (error) {
//                 console.error('❌ Error searching inventory:', error);
//                 this.showError('Failed to search inventory');
//                 return [];
//             }

//             console.log('🔍 Search result:', {
//                 query: searchQuery,
//                 business_id: this.userBusinessId,
//                 products_found: data ? data.length : 0
//             });

//             this.inventory = data || [];
            
//             if (this.inventory.length === 0) {
//                 this.showNoInventory(`No products found for: "${searchQuery}"`);
//             } else {
//                 await this.displayInventory(this.inventory);
//             }
            
//             return this.inventory;
            
//         } catch (error) {
//             console.error('❌ Search error:', error);
//             this.showError('Failed to search inventory');
//             return [];
//         }
//     }

//     // Filter by category
//     async filterByCategory(category) {
//         try {
//             await this.waitForInitialization();
            
//             if (!this.userBusinessId) {
//                 console.log('⚠️  No business ID available for category filter');
//                 this.showNoInventory('No business found for your account');
//                 return [];
//             }

//             console.log('🔍 Filtering inventory by category:', category, 'for business ID:', this.userBusinessId);

//             let query = supabaseClient
//                 .from('products')
//                 .select('*')
//                 .eq('business_id', this.userBusinessId)
//                 .order('id', { ascending: true });

//             if (category && category !== 'all') {
//                 query = query.eq('category', category);
//             }

//             const { data, error } = await query;

//             if (error) {
//                 console.error('❌ Error filtering by category:', error);
//                 this.showError('Failed to filter inventory by category');
//                 return [];
//             }

//             console.log('📦 Category filter result:', {
//                 category: category,
//                 business_id: this.userBusinessId,
//                 products_found: data ? data.length : 0
//             });

//             this.inventory = data || [];
            
//             if (this.inventory.length === 0) {
//                 this.showNoInventory(`No products found in category: ${category}`);
//             } else {
//                 await this.displayInventory(this.inventory);
//             }
            
//             return this.inventory;
            
//         } catch (error) {
//             console.error('❌ Category filter error:', error);
//             this.showError('Failed to filter inventory by category');
//             return [];
//         }
//     }

//     // Refresh inventory
//     async refreshInventory() {
//         console.log('🔄 Refreshing inventory...');
//         this.selectedProducts.clear();
//         return await this.fetchInventory();
//     }

//     // Get selected products
//     getSelectedProducts() {
//         return Array.from(this.selectedProducts);
//     }

//     // Clear selections
//     clearSelections() {
//         this.selectedProducts.clear();
//         const checkboxes = document.querySelectorAll('.orders.inventory input[type="checkbox"]');
//         checkboxes.forEach(checkbox => {
//             checkbox.checked = false;
//             checkbox.indeterminate = false;
//         });
//         this.updateEditButtonState();
//     }

//     // Utility methods
//     isUserReady() {
//         return this.currentUser && this.userBusinessId;
//     }

//     getCurrentUser() {
//         return this.currentUser;
//     }

//     // Show success message
//     showSuccess(message) {
//         this.showMessage(message, 'success');
//     }

//     // Show error message
//     showError(message) {
//         this.showMessage(message, 'error');
//     }

//     // Show message utility
//     showMessage(message, type = 'info') {
//         const existingMsg = document.getElementById('inventory-message');
//         if (existingMsg) existingMsg.remove();
        
//         const msgElement = document.createElement('div');
//         msgElement.id = 'inventory-message';
//         msgElement.textContent = message;
//         msgElement.style.cssText = `
//             position: fixed;
//             top: 20px;
//             right: 20px;
//             padding: 15px 25px;
//             border-radius: 8px;
//             z-index: 10000;
//             box-shadow: 0 4px 20px rgba(0,0,0,0.1);
//             font-family: Arial, sans-serif;
//             font-size: 14px;
//             max-width: 350px;
//             word-wrap: break-word;
//             background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
//             color: white;
//             animation: slideInFadeOut 4s forwards;
//         `;
        
//         document.body.appendChild(msgElement);
        
//         setTimeout(() => {
//             if (msgElement.parentNode) {
//                 msgElement.parentNode.removeChild(msgElement);
//             }
//         }, 4000);
//     }

//     // Debug information
//     getDebugInfo() {
//         return {
//             isInitialized: this.isInitialized,
//             currentUser: this.currentUser?.id || null,
//             userBusinessId: this.userBusinessId,
//             inventoryCount: this.inventory.length,
//             selectedCount: this.selectedProducts.size
//         };
//     }
// }

// // Initialize the inventory manager
// let inventoryManager = null;

// // Initialize when DOM is loaded
// document.addEventListener('DOMContentLoaded', async () => {
//     console.log('📋 DOM loaded, initializing inventory manager...');
    
//     try {
//         // Create new instance
//         inventoryManager = new InventoryManager();
        
//         // Wait for initialization
//         await inventoryManager.waitForInitialization();
        
//         console.log('✅ Inventory manager initialized successfully');
        
//     } catch (error) {
//         console.error('❌ Error initializing inventory manager:', error);
//     }
// });

// // If DOM already loaded
// if (document.readyState !== 'loading') {
//     console.log('📋 DOM already loaded, initializing inventory manager...');
//     (async () => {
//         try {
//             inventoryManager = new InventoryManager();
//             await inventoryManager.waitForInitialization();
//             console.log('✅ Inventory manager initialized successfully');
//         } catch (error) {
//             console.error('❌ Error initializing inventory manager:', error);
//         }
//     })();
// }

// // Global functions for easy access
// window.fetchInventory = async () => {
//     if (!inventoryManager) {
//         console.error('❌ Inventory manager not initialized');
//         return [];
//     }
//     return await inventoryManager.fetchInventory();
// };

// window.searchInventory = async (query) => {
//     if (!inventoryManager) {
//         console.error('❌ Inventory manager not initialized');
//         return [];
//     }
//     return await inventoryManager.searchInventory(query);
// };

// window.filterInventoryByCategory = async (category) => {
//     if (!inventoryManager) {
//         console.error('❌ Inventory manager not initialized');
//         return [];
//     }
//     return await inventoryManager.filterByCategory(category);
// };

// window.refreshInventory = async () => {
//     if (!inventoryManager) {
//         console.error('❌ Inventory manager not initialized');
//         return [];
//     }
//     return await inventoryManager.refreshInventory();
// };

// window.getInventoryDebugInfo = () => {
//     if (!inventoryManager) {
//         console.error('❌ Inventory manager not initialized');
//         return null;
//     }
//     return inventoryManager.getDebugInfo();
// };

// window.getSelectedProducts = () => {
//     if (!inventoryManager) {
//         console.error('❌ Inventory manager not initialized');
//         return [];
//     }
//     return inventoryManager.getSelectedProducts();
// };

// window.clearInventorySelections = () => {
//     if (!inventoryManager) {
//         console.error('❌ Inventory manager not initialized');
//         return;
//     }
//     inventoryManager.clearSelections();
// };

// // Make inventoryManager globally accessible
// window.inventoryManager = inventoryManager;

// // Export for module use
// if (typeof module !== 'undefined' && module.exports) {
//     module.exports = { InventoryManager };
// }

// // Add CSS styles for inventory
// const inventoryStyle = document.createElement('style');
// inventoryStyle.textContent = `
//     @keyframes slideInFadeOut {
//         0% { opacity: 0; transform: translateX(100%); }
//         10% { opacity: 1; transform: translateX(0); }
//         90% { opacity: 1; transform: translateX(0); }
//         100% { opacity: 0; transform: translateX(100%); }
//     }
    
//     @keyframes fadeIn {
//         from { opacity: 0; transform: scale(0.8); }
//         to { opacity: 1; transform: scale(1); }
//     }
    
//     /* Low stock styling */
//     .orders.inventory tbody tr.low-stock {
//         background-color: #fff3cd !important;
//         border-left: 4px solid #ffc107;
//     }
    
//     .low-stock-text {
//         color: #856404 !important;
//         font-weight: bold;
//     }
    
//     /* Out of stock styling */
//     .orders.inventory tbody tr.out-of-stock {
//         background-color: #f8d7da !important;
//         border-left: 4px solid #dc3545;
//     }
    
//     .out-of-stock-text {
//         color: #721c24 !important;
//         font-weight: bold;
//     }
    
//     /* Hover effects for inventory rows */
//     .orders.inventory tbody tr:hover {
//         background-color: #f8f9fa !important;
//         cursor: pointer;
//     }
    
//     /* Checkbox styling */
//     .orders.inventory input[type="checkbox"] {
//         margin-right: 8px;
//         cursor: pointer;
//         transform: scale(1.1);
//     }
    
//     .orders.inventory input[type="checkbox"]:indeterminate {
//         background-color: #007bff;
//         border-color: #007bff;
//     }
    
//     /* Selected row styling */
//     .orders.inventory tbody tr.selected {
//         background-color: #d1ecf1 !important;
//         border-left: 4px solid #007bff;
//     }
    
//     /* Product ID styling */
//     .product-id {
//         font-family: 'Courier New', monospace;
//         font-weight: bold;
//         color: #495057;
//         background-color: #e9ecef;
//         padding: 2px 6px;
//         border-radius: 4px;
//         font-size: 12px;
//     }
    
//     /* Product name styling */
//     .product-name {
//         font-weight: 500;
//         color: #212529;
//     }
    
//     /* Price styling */
//     .product-price {
//         font-weight: bold;
//         color: #28a745;
//     }
    
//     /* Category badge styling */
//     .product-category {
//         background-color: #6c757d;
//         color: white;
//         padding: 2px 8px;
//         border-radius: 12px;
//         font-size: 11px;
//         text-transform: uppercase;
//         font-weight: 500;
//     }
    
//     /* Sales link styling */
//     .sales-link {
//         color: #007bff;
//         text-decoration: none;
//         font-weight: bold;
//         transition: color 0.2s ease;
//     }
    
//     .sales-link:hover {
//         color: #0056b3;
//         text-decoration: underline;
//     }
    
//     /* Edit button styling */
//     .edit-product {
//         background: linear-gradient(135deg, #007bff, #0056b3);
//         color: white;
//         border: none;
//         padding: 10px 20px;
//         border-radius: 6px;
//         cursor: pointer;
//         font-weight: 500;
//         transition: all 0.3s ease;
//         box-shadow: 0 2px 4px rgba(0,123,255,0.2);
//     }
    
//     .edit-product:hover:not(:disabled) {
//         background: linear-gradient(135deg, #0056b3, #004085);
//         transform: translateY(-1px);
//         box-shadow: 0 4px 8px rgba(0,123,255,0.3);
//     }
    
//     .edit-product:disabled {
//         background: #6c757d;
//         cursor: not-allowed;
//         transform: none;
//         box-shadow: none;
//     }
    
//     /* Sales modal styling */
//     .sales-modal {
//         position: fixed;
//         top: 0;
//         left: 0;
//         width: 100%;
//         height: 100%;
//         z-index: 10000;
//         animation: fadeIn 0.3s ease;
//     }
    
//     .modal-overlay {
//         position: absolute;
//         top: 0;
//         left: 0;
//         width: 100%;
//         height: 100%;
//         background: rgba(0, 0, 0, 0.5);
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         padding: 20px;
//     }
    
//     .modal-content {
//         background: white;
//         border-radius: 12px;
//         max-width: 600px;
//         width: 100%;
//         max-height: 80vh;
//         overflow-y: auto;
//         box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
//         animation: fadeIn 0.3s ease;
//     }
    
//     .modal-header {
//         display: flex;
//         justify-content: space-between;
//         align-items: center;
//         padding: 20px 24px 16px;
//         border-bottom: 1px solid #e9ecef;
//     }
    
//     .modal-header h3 {
//         margin: 0;
//         color: #212529;
//         font-size: 20px;
//         font-weight: 600;
//     }
    
//     .close-modal {
//         background: none;
//         border: none;
//         font-size: 24px;
//         color: #6c757d;
//         cursor: pointer;
//         padding: 0;
//         width: 30px;
//         height: 30px;
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         border-radius: 50%;
//         transition: all 0.2s ease;
//     }
    
//     .close-modal:hover {
//         background-color: #f8f9fa;
//         color: #495057;
//     }
    
//     .modal-body {
//         padding: 24px;
//     }
    
//     .sales-summary {
//         display: grid;
//         grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
//         gap: 16px;
//         margin-bottom: 24px;
//     }
    
//     .stat {
//         display: flex;
//         flex-direction: column;
//         padding: 16px;
//         background: #f8f9fa;
//         border-radius: 8px;
//         border-left: 4px solid #007bff;
//     }
    
//     .stat-label {
//         font-size: 12px;
//         color: #6c757d;
//         text-transform: uppercase;
//         font-weight: 600;
//         margin-bottom: 4px;
//     }
    
//     .stat-value {
//         font-size: 18px;
//         font-weight: bold;
//         color: #212529;
//     }
    
//     .recent-sales h4 {
//         margin: 0 0 16px 0;
//         color: #495057;
//         font-size: 16px;
//         font-weight: 600;
//     }
    
//     .sales-list {
//         display: flex;
//         flex-direction: column;
//         gap: 8px;
//     }
    
//     .sale-item {
//         display: flex;
//         justify-content: space-between;
//         align-items: center;
//         padding: 12px 16px;
//         background: #f8f9fa;
//         border-radius: 6px;
//         font-size: 14px;
//     }
    
//     .sale-item span:first-child {
//         color: #6c757d;
//     }
    
//     .sale-item span:nth-child(2) {
//         font-weight: bold;
//         color: #28a745;
//     }
    
//     .sale-item span:last-child {
//         color: #495057;
//         font-size: 12px;
//     }
    
//     /* Responsive design */
//     @media (max-width: 768px) {
//         .orders.inventory {
//             font-size: 12px;
//         }
        
//         .orders.inventory th,
//         .orders.inventory td {
//             padding: 8px 4px;
//         }
        
//         .product-id {
//             font-size: 10px;
//             padding: 1px 4px;
//         }
        
//         .product-category {
//             font-size: 9px;
//             padding: 1px 6px;
//         }
        
//         .edit-product {
//             padding: 8px 12px;
//             font-size: 12px;
//         }
        
//         .modal-content {
//             margin: 10px;
//             max-height: 90vh;
//         }
        
//         .sales-summary {
//             grid-template-columns: 1fr;
//         }
//     }
    
//     /* Table enhancements */
//     .orders.inventory {
//         width: 100%;
//         border-collapse: collapse;
//         background: white;
//         border-radius: 8px;
//         overflow: hidden;
//         box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
//     }
    
//     .orders.inventory thead {
//         background: linear-gradient(135deg, #495057, #343a40);
//         color: white;
//     }
    
//     .orders.inventory thead th {
//         padding: 16px 12px;
//         font-weight: 600;
//         text-align: left;
//         border: none;
//     }
    
//     .orders.inventory tbody td {
//         padding: 12px;
//         border-bottom: 1px solid #e9ecef;
//         vertical-align: middle;
//     }
    
//     .orders.inventory tbody tr:last-child td {
//         border-bottom: none;
//     }
    
//     /* Loading state */
//     .inventory-loading {
//         text-align: center;
//         padding: 40px;
//         color: #6c757d;
//     }
    
//     .inventory-loading::before {
//         content: '⏳';
//         font-size: 24px;
//         display: block;
//         margin-bottom: 16px;
//     }
    
//     /* Empty state */
//     .inventory-empty {
//         text-align: center;
//         padding: 60px 20px;
//         color: #6c757d;
//     }
    
//     .inventory-empty::before {
//         content: '📦';
//         font-size: 48px;
//         display: block;
//         margin-bottom: 16px;
//     }
    
//     /* Stats display */
//     .inventory-stats {
//         display: flex;
//         gap: 16px;
//         margin-bottom: 20px;
//         flex-wrap: wrap;
//     }
    
//     .stat-card {
//         flex: 1;
//         min-width: 200px;
//         padding: 16px;
//         background: white;
//         border-radius: 8px;
//         box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
//         text-align: center;
//     }
    
//     .stat-card .number {
//         font-size: 24px;
//         font-weight: bold;
//         color: #007bff;
//         display: block;
//     }
    
//     .stat-card .label {
//         font-size: 12px;
//         color: #6c757d;
//         text-transform: uppercase;
//         margin-top: 4px;
//     }
// `;
// document.head.appendChild(inventoryStyle);

// console.log('✅ Inventory manager script loaded successfully');

// // Initialize real-time inventory updates
// function initializeInventoryRealtime() {
//     if (!inventoryManager || !inventoryManager.userBusinessId) return;

//     const businessId = inventoryManager.userBusinessId;

//     // Subscribe to product changes for this business
//     const productsChannel = supabaseClient
//         .channel('inventory-realtime')
//         .on(
//             'postgres_changes',
//             {
//                 event: '*',
//                 schema: 'public',
//                 table: 'products',
//                 filter: `business_id=eq.${businessId}`
//             },
//             payload => {
//                 console.log('🔄 Real-time inventory update:', payload);
                
//                 // Refresh inventory when products are added, updated, or deleted
//                 if (inventoryManager) {
//                     setTimeout(() => {
//                         inventoryManager.refreshInventory();
//                     }, 1000); // Small delay to ensure data consistency
//                 }
//             }
//         )
//         .subscribe();

//     window.inventoryRealtimeChannel = productsChannel;
//     console.log('✅ Inventory real-time updates initialized');
// }

// // Initialize real-time updates when inventory manager is ready
// document.addEventListener('DOMContentLoaded', () => {
//     const waitForInventoryManager = setInterval(() => {
//         if (inventoryManager && inventoryManager.userBusinessId) {
//             initializeInventoryRealtime();
//             clearInterval(waitForInventoryManager);
//         }
//     }, 500);
// });

// // Search functionality for inventory
// document.addEventListener('DOMContentLoaded', () => {
//     const inventorySearchInput = document.getElementById('inventory-search');
//     if (inventorySearchInput) {
//         let searchTimeout;
//         inventorySearchInput.addEventListener('input', function() {
//             clearTimeout(searchTimeout);
//             searchTimeout = setTimeout(async () => {
//                 const query = this.value.trim();
//                 if (query && inventoryManager) {
//                     await inventoryManager.searchInventory(query);
//                 } else if (inventoryManager) {
//                     await inventoryManager.fetchInventory();
//                 }
//             }, 300);
//         });
//     }

//     // Category filter for inventory
//     const inventoryCategoryFilter = document.getElementById('inventory-category-filter');
//     if (inventoryCategoryFilter) {
//         inventoryCategoryFilter.addEventListener('change', async function() {
//             const selectedCategory = this.value;
//             if (inventoryManager) {
//                 if (!selectedCategory || selectedCategory === 'all') {
//                     await inventoryManager.fetchInventory();
//                 } else {
//                     await inventoryManager.filterByCategory(selectedCategory);
//                 }
//             }
//         });
//     }
// });

// // Export functions for external use
// window.InventoryManager = InventoryManager;