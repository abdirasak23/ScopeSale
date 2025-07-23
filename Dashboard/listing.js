// Initialize Supabase client
const supabaseUrl = 'https://jvcrkjkhmglgrwkadzxw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y3JramtobWdsZ3J3a2Fkenh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTQwOTgsImV4cCI6MjA2NzI3MDA5OH0.4uGTPJg2Nbl8QvGy6UhlBJlJ4lUtMl9f6vTJ_jf8z3o';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Product Management System
class ProductManager {
    handleAddProductBound = null;
    handleUpdateProductBound = null;

    constructor() {
        this.currentBusinessId = null;
        this.init();
    }

    async init() {
        await this.getCurrentUserBusiness();
        this.setupEventListeners();
        this.setupUnitTypeHandler();
        this.loadProducts();
    }

    // Setup unit type change handler
    setupUnitTypeHandler() {
        const unitSelect = document.getElementById('unit');
        const unitAmountDiv = document.getElementById('unit-amount');
        
        if (unitSelect && unitAmountDiv) {
            // Initially hide unit amount
            unitAmountDiv.style.display = 'none';
            
            unitSelect.addEventListener('change', (e) => {
                const selectedUnit = e.target.value;
                const weightVolumeUnits = ['kilogram', 'gram', 'litre'];
                
                if (weightVolumeUnits.includes(selectedUnit)) {
                    unitAmountDiv.style.display = 'block';
                    // Make unit amount required when visible
                    document.getElementById('unit-amounts').required = true;
                } else {
                    unitAmountDiv.style.display = 'none';
                    // Remove required attribute and clear value when hidden
                    document.getElementById('unit-amounts').required = false;
                    document.getElementById('unit-amounts').value = '';
                }
            });
        }
    }

    // Get current user's business ID
    async getCurrentUserBusiness() {
        try {
            // Get current user
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
            
            if (userError || !user) {
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
                throw new Error('No business found for current user or staff email');
            }

            this.currentBusinessId = business.id;
            
        } catch (error) {
            console.error('Error getting user business:', error);
            this.showError('Failed to load user business. Please ensure you have a business set up.');
        }
    }

    setupEventListeners() {
        const productForm = document.getElementById('productForm');
        if (productForm) {
            // Remove any previous listeners before adding
            if (this.handleAddProductBound) {
                productForm.removeEventListener('submit', this.handleAddProductBound);
            }
            this.handleAddProductBound = this.handleAddProduct.bind(this);
            productForm.addEventListener('submit', this.handleAddProductBound);
        }
    }

    // Add new product to database
    async handleAddProduct(event) {
        event.preventDefault();
        
        // Check if we have business ID
        if (!this.currentBusinessId) {
            this.showError('Business ID not found. Please refresh the page and try again.');
            return;
        }

        const formData = this.getFormData();
        if (!this.validateFormData(formData)) {
            return;
        }

        try {
            // Prepare product data
            const productData = {
                name: formData.name,
                price: parseFloat(formData.price),
                category: formData.category,
                stock: parseInt(formData.stock),
                unit_type: formData.unitType,
                business_id: this.currentBusinessId,
                created_at: new Date().toISOString()
            };

            // Add unit amount if applicable
            if (formData.unitAmount !== null) {
                productData.unit_amount = parseFloat(formData.unitAmount);
            }

            const { data, error } = await supabaseClient
                .from('products')
                .insert([productData])
                .select();

            if (error) {
                throw error;
            }

            this.showSuccess('Product added successfully!');
            this.resetForm();
            this.loadProducts(); // Refresh the product list
            
        } catch (error) {
            console.error('Error adding product:', error);
            this.showError('Failed to add product. Please try again.');
        }
    }

    // Get form data (including unit type and unit amount)
    getFormData() {
        const unitType = document.getElementById('unit').value;
        const unitAmountInput = document.getElementById('unit-amounts');
        const weightVolumeUnits = ['kilogram', 'gram', 'litre'];
        
        let unitAmount = null;
        if (weightVolumeUnits.includes(unitType) && unitAmountInput.value) {
            unitAmount = unitAmountInput.value;
        }

        return {
            name: document.getElementById('productName').value.trim(),
            price: document.getElementById('price').value,
            category: document.getElementById('category').value,
            stock: document.getElementById('stock').value,
            unitType: unitType,
            unitAmount: unitAmount
        };
    }

    // Validate form data (including unit validation)
    validateFormData(data) {
        if (!data.name) {
            this.showError('Product name is required');
            return false;
        }
        if (!data.price || data.price <= 0) {
            this.showError('Valid price is required');
            return false;
        }
        
        // Dynamically get allowed categories from the select options
        const categorySelect = document.getElementById('category');
        const allowedCategories = Array.from(categorySelect.options)
            .map(opt => opt.value)
            .filter(val => val); // Exclude empty value
        if (!allowedCategories.includes(data.category)) {
            this.showError('Please select a valid category.');
            return false;
        }
        
        if (!data.stock || data.stock < 0) {
            this.showError('Valid stock quantity is required');
            return false;
        }
        
        // Validate unit type
        const unitSelect = document.getElementById('unit');
        const allowedUnits = Array.from(unitSelect.options)
            .map(opt => opt.value)
            .filter(val => val); // Exclude empty value
        if (!allowedUnits.includes(data.unitType)) {
            this.showError('Please select a valid unit type.');
            return false;
        }
        
        // Validate unit amount for weight/volume units
        const weightVolumeUnits = ['kilogram', 'gram', 'litre'];
        if (weightVolumeUnits.includes(data.unitType)) {
            if (!data.unitAmount || data.unitAmount <= 0) {
                this.showError('Unit amount is required for weight/volume units');
                return false;
            }
        }
        
        return true;
    }

    // Load all products from database (only for current business)
    async loadProducts() {
        if (!this.currentBusinessId) {
            this.showError('Business ID not found. Please refresh the page.');
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from('products')
                .select('*')
                .eq('business_id', this.currentBusinessId) // Filter by business_id
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            this.displayProducts(data);
            
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Failed to load products.');
        }
    }

    // Display products in the UI (including unit information)
    displayProducts(products) {
        const productsList = document.getElementById('productsList');
        if (!productsList) return;

        if (products.length === 0) {
            productsList.innerHTML = '<p>No products found.</p>';
            return;
        }

        productsList.innerHTML = products.map(product => {
            // Format unit display
            let unitDisplay = product.unit_type || 'N/A';
            if (product.unit_amount && ['kilogram', 'gram', 'litre'].includes(product.unit_type)) {
                unitDisplay = `${product.unit_amount} ${product.unit_type}`;
            }

            return `
                <div class="product-item" data-id="${product.id}">
                    <div class="product-name">${product.name}</div>
                    <div class="product-details">
                        <div class="product-detail">
                            <strong>Price:</strong> $${product.price.toFixed(2)}
                        </div>
                        <div class="product-detail">
                            <strong>Category:</strong> ${product.category}
                        </div>
                        <div class="product-detail">
                            <strong>Stock:</strong> ${product.stock}
                        </div>
                        <div class="product-detail">
                            <strong>Unit:</strong> ${unitDisplay}
                        </div>
                        <div class="product-detail">
                            <strong>Added:</strong> ${new Date(product.created_at).toLocaleDateString()}
                        </div>
                    </div>
                    <div class="product-actions">
                        <button onclick="productManager.editProduct(${product.id})" class="edit-btn">Edit</button>
                        <button onclick="productManager.deleteProduct(${product.id})" class="delete-btn">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Edit product
    async editProduct(productId) {
        try {
            const { data, error } = await supabaseClient
                .from('products')
                .select('*')
                .eq('id', productId)
                .eq('business_id', this.currentBusinessId) // Ensure user can only edit their own products
                .single();

            if (error) {
                throw error;
            }

            // Fill form with existing data
            document.getElementById('productName').value = data.name;
            document.getElementById('price').value = data.price;
            document.getElementById('category').value = data.category;
            document.getElementById('stock').value = data.stock;
            document.getElementById('unit').value = data.unit_type || '';
            
            // Handle unit amount
            const unitAmountDiv = document.getElementById('unit-amount');
            const unitAmountInput = document.getElementById('unit-amounts');
            const weightVolumeUnits = ['kilogram', 'gram', 'litre'];
            
            if (data.unit_type && weightVolumeUnits.includes(data.unit_type)) {
                unitAmountDiv.style.display = 'block';
                unitAmountInput.required = true;
                unitAmountInput.value = data.unit_amount || '';
            } else {
                unitAmountDiv.style.display = 'none';
                unitAmountInput.required = false;
                unitAmountInput.value = '';
            }

            // Change form to edit mode
            this.setEditMode(productId);
            
        } catch (error) {
            console.error('Error loading product for edit:', error);
            this.showError('Failed to load product data.');
        }
    }

    // Set form to edit mode
    setEditMode(productId) {
        const form = document.getElementById('productForm');
        const submitBtn = form.querySelector('.submit-btn');

        // Store the product ID for updating
        form.dataset.editId = productId;
        submitBtn.textContent = 'Update Product';

        // Remove previous listeners before adding
        if (this.handleAddProductBound) {
            form.removeEventListener('submit', this.handleAddProductBound);
        }
        if (this.handleUpdateProductBound) {
            form.removeEventListener('submit', this.handleUpdateProductBound);
        }
        this.handleUpdateProductBound = this.handleUpdateProduct.bind(this);
        form.addEventListener('submit', this.handleUpdateProductBound);
    }

    // Handle product update
    async handleUpdateProduct(event) {
        event.preventDefault();
        
        const form = event.target;
        const productId = form.dataset.editId;
        const formData = this.getFormData();
        
        if (!this.validateFormData(formData)) {
            return;
        }

        try {
            // Prepare update data
            const updateData = {
                name: formData.name,
                price: parseFloat(formData.price),
                category: formData.category,
                stock: parseInt(formData.stock),
                unit_type: formData.unitType,
                updated_at: new Date().toISOString()
            };

            // Add unit amount if applicable, otherwise set to null
            if (formData.unitAmount !== null) {
                updateData.unit_amount = parseFloat(formData.unitAmount);
            } else {
                updateData.unit_amount = null;
            }

            const { data, error } = await supabaseClient
                .from('products')
                .update(updateData)
                .eq('id', productId)
                .eq('business_id', this.currentBusinessId) // Ensure user can only update their own products
                .select();

            if (error) {
                throw error;
            }

            this.showSuccess('Product updated successfully!');
            this.resetForm();
            this.loadProducts();
            
        } catch (error) {
            console.error('Error updating product:', error);
            this.showError('Failed to update product. Please try again.');
        }
    }

    // Delete product
    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('products')
                .delete()
                .eq('id', productId)
                .eq('business_id', this.currentBusinessId); // Ensure user can only delete their own products

            if (error) {
                throw error;
            }

            this.showSuccess('Product deleted successfully!');
            this.loadProducts();
            
        } catch (error) {
            console.error('Error deleting product:', error);
            this.showError('Failed to delete product. Please try again.');
        }
    }

    // Search products (only within current business)
    async searchProducts(query) {
        if (!this.currentBusinessId) {
            this.showError('Business ID not found. Please refresh the page.');
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from('products')
                .select('*')
                .eq('business_id', this.currentBusinessId) // Filter by business_id
                .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            this.displayProducts(data);
            
        } catch (error) {
            console.error('Error searching products:', error);
            this.showError('Failed to search products.');
        }
    }

    // Filter products by category (only within current business)
    async filterByCategory(category) {
        if (!this.currentBusinessId) {
            this.showError('Business ID not found. Please refresh the page.');
            return;
        }

        try {
            let query = supabaseClient
                .from('products')
                .select('*')
                .eq('business_id', this.currentBusinessId) // Filter by business_id
                .order('created_at', { ascending: false });

            if (category && category !== 'all') {
                query = query.eq('category', category);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            this.displayProducts(data);
            
        } catch (error) {
            console.error('Error filtering products:', error);
            this.showError('Failed to filter products.');
        }
    }

    // Reset form to add mode
    resetForm() {
        const form = document.getElementById('productForm');
        const submitBtn = form.querySelector('.submit-btn');
        const unitAmountDiv = document.getElementById('unit-amount');
        const unitAmountInput = document.getElementById('unit-amounts');

        form.reset();
        delete form.dataset.editId;
        submitBtn.textContent = 'Submit Product';

        // Reset unit amount visibility and requirement
        unitAmountDiv.style.display = 'none';
        unitAmountInput.required = false;

        // Remove previous listeners before adding
        if (this.handleUpdateProductBound) {
            form.removeEventListener('submit', this.handleUpdateProductBound);
        }
        if (this.handleAddProductBound) {
            form.removeEventListener('submit', this.handleAddProductBound);
        }
        this.handleAddProductBound = this.handleAddProduct.bind(this);
        form.addEventListener('submit', this.handleAddProductBound);
    }

    // Show success message
    showSuccess(message) {
        // Create or update success message element
        let successMsg = document.getElementById('successMessage');
        if (!successMsg) {
            successMsg = document.createElement('div');
            successMsg.id = 'successMessage';
            successMsg.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 15px 20px;
                border-radius: 5px;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            `;
            document.body.appendChild(successMsg);
        }
        
        successMsg.textContent = message;
        successMsg.style.display = 'block';
        
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 3000);
    }

    // Show error message
    showError(message) {
        // Create or update error message element
        let errorMsg = document.getElementById('errorMessage');
        if (!errorMsg) {
            errorMsg = document.createElement('div');
            errorMsg.id = 'errorMessage';
            errorMsg.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #dc3545;
                color: white;
                padding: 15px 20px;
                border-radius: 5px;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            `;
            document.body.appendChild(errorMsg);
        }
        
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
        
        setTimeout(() => {
            errorMsg.style.display = 'none';
        }, 5000);
    }

    // Get product statistics (only for current business)
    async getStats() {
        if (!this.currentBusinessId) {
            return null;
        }

        try {
            const { data, error } = await supabaseClient
                .from('products')
                .select('category, stock, price')
                .eq('business_id', this.currentBusinessId); // Filter by business_id

            if (error) {
                throw error;
            }

            const stats = {
                total: data.length,
                categories: {},
                totalValue: 0,
                lowStock: 0
            };

            data.forEach(product => {
                // Category count
                stats.categories[product.category] = (stats.categories[product.category] || 0) + 1;
                
                // Total inventory value
                stats.totalValue += product.price * product.stock;
                
                // Low stock items (less than 10)
                if (product.stock < 10) {
                    stats.lowStock++;
                }
            });

            return stats;
            
        } catch (error) {
            console.error('Error getting stats:', error);
            return null;
        }
    }
}

// Initialize the product manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.productManager = new ProductManager();
});

// Additional utility functions for search and filter
function setupSearchAndFilter() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = e.target.value.trim();
                if (query) {
                    productManager.searchProducts(query);
                } else {
                    productManager.loadProducts();
                }
            }, 300);
        });
    }

    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            productManager.filterByCategory(e.target.value);
        });
    }
}

// Call setup function when DOM is ready
document.addEventListener('DOMContentLoaded', setupSearchAndFilter);

// Navigation functionality
const navItems = document.querySelectorAll('.cart[data-target]');
const contentSections = document.querySelectorAll('.content-section');

navItems.forEach(item => {
    item.addEventListener('click', function () {
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');

        contentSections.forEach(section => section.classList.remove('active'));

        const targetId = this.getAttribute('data-target');
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
    });
});

/*
Updated Database Schema for Supabase:

-- Products table with business_id foreign key and unit fields
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    unit_type VARCHAR(50),
    unit_amount DECIMAL(10, 2),
    business_id INTEGER NOT NULL REFERENCES bussiness(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If you need to add the new columns to existing table:
ALTER TABLE products ADD COLUMN unit_type VARCHAR(50);
ALTER TABLE products ADD COLUMN unit_amount DECIMAL(10, 2);

-- Create indexes for better performance
CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_products_unit_type ON products(unit_type);

-- Enable Row Level Security (RLS) - if not already enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products table (if not already created)
CREATE POLICY "Users can view products from their business" 
    ON products FOR SELECT 
    USING (business_id IN (
        SELECT id FROM bussiness WHERE user_id = auth.uid()
        UNION
        SELECT id FROM bussiness WHERE staff_emails @> ARRAY[auth.email()]
    ));

CREATE POLICY "Users can insert products to their business" 
    ON products FOR INSERT 
    WITH CHECK (business_id IN (
        SELECT id FROM bussiness WHERE user_id = auth.uid()
        UNION
        SELECT id FROM bussiness WHERE staff_emails @> ARRAY[auth.email()]
    ));

CREATE POLICY "Users can update products from their business" 
    ON products FOR UPDATE 
    USING (business_id IN (
        SELECT id FROM bussiness WHERE user_id = auth.uid()
        UNION
        SELECT id FROM bussiness WHERE staff_emails @> ARRAY[auth.email()]
    ));

CREATE POLICY "Users can delete products from their business" 
    ON products FOR DELETE 
    USING (business_id IN (
        SELECT id FROM bussiness WHERE user_id = auth.uid()
        UNION
        SELECT id FROM bussiness WHERE staff_emails @> ARRAY[auth.email()]
    ));
*/