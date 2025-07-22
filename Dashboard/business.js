// Ensure Supabase is available globally
if (!window.supabase) {
    console.error("Supabase SDK not loaded. Check the CDN link.");
}

// Initialize Supabase client
const SUPABASE_URL = 'https://jvcrkjkhmglgrwkadzxw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y3JramtobWdsZ3J3a2Fkenh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTQwOTgsImV4cCI6MjA2NzI3MDA5OH0.4uGTPJg2Nbl8QvGy6UhlBJlJ4lUtMl9f6vTJ_jf8z3o';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const businessContent = document.getElementById('business-content');
const businessNameEl = document.querySelector('.business-name');
const businessRoleEl = document.querySelector('.business-role');
const businessAddressEl = document.querySelector('.business-address');
const businessLogoEl = document.querySelector('.image-pro.-business-logo img');
const businessPhoneEl = document.querySelector('.business-num');
const businessEmailEl = document.querySelector('.bus-em');
const navProducts = document.querySelectorAll('.bus-nav')[0];
const navStaff = document.querySelectorAll('.bus-nav')[1];
const staffInfoSection = document.querySelector('.staff-info');
const productsSection = document.querySelector('.business-product');

// Current Business Data
let currentBusiness = null;
let currentUser = null;

// Create popup modal for adding staff
function createStaffModal() {
    // Check if modal already exists
    let existingModal = document.getElementById('staff-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalHTML = `
        <div id="staff-modal" class="modal-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        ">
            <div class="modal-content" style="
                background: white;
                padding: 30px;
                border-radius: 10px;
                width: 400px;
                max-width: 90%;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                position: relative;
            ">
                <button class="close-modal" style="
                    position: absolute;
                    top: 15px;
                    right: 20px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                ">&times;</button>
                
                <h2 style="
                    margin-bottom: 20px;
                    color: #333;
                    font-size: 24px;
                ">Add New Staff Member</h2>
                
                <div class="form-group" style="margin-bottom: 20px;">
                    <label for="staff-email" style="
                        display: block;
                        margin-bottom: 8px;
                        font-weight: bold;
                        color: #333;
                    ">Staff Email:</label>
                    <input type="email" id="staff-email" placeholder="Enter staff member's email" style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #ddd;
                        border-radius: 5px;
                        font-size: 16px;
                        box-sizing: border-box;
                    " />
                </div>
                
                <div class="error-message" id="email-error" style="
                    color: #e74c3c;
                    margin-bottom: 15px;
                    font-size: 14px;
                    display: none;
                "></div>
                
                <div class="modal-buttons" style="
                    display: flex;
                    gap: 15px;
                    justify-content: flex-end;
                ">
                    <button class="cancel-btn" style="
                        background: #95a5a6;
                        color: white;
                        border: none;
                        padding: 12px 25px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 16px;
                    ">Cancel</button>
                    <button class="add-staff-btn" style="
                        background: rgba(33, 48, 123, 1);
                        color: white;
                        border: none;
                        padding: 12px 25px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 16px;
                    ">Add Staff</button>
                </div>
                
                <div class="loading" id="modal-loading" style="
                    display: none;
                    text-align: center;
                    margin-top: 15px;
                ">
                    <p>Adding staff member...</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    return document.getElementById('staff-modal');
}

// Show error in modal
function showModalError(message) {
    const errorDiv = document.getElementById('email-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Hide error in modal
function hideModalError() {
    const errorDiv = document.getElementById('email-error');
    errorDiv.style.display = 'none';
}

// Show loading in modal
function showModalLoading() {
    document.getElementById('modal-loading').style.display = 'block';
    document.querySelector('.add-staff-btn').disabled = true;
}

// Hide loading in modal
function hideModalLoading() {
    document.getElementById('modal-loading').style.display = 'none';
    document.querySelector('.add-staff-btn').disabled = false;
}

// Close modal
function closeModal() {
    const modal = document.getElementById('staff-modal');
    if (modal) {
        modal.remove();
    }
}

// Utility: Get current user
async function getCurrentUser() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session || !session.user) {
        console.error("No user session:", error);
        window.location.href = '../Onboarding/';
        return null;
    }
    return session.user;
}

// Utility: Get business for user
async function getBusinessForUser(user) {
    // Try admin_email first
    let { data: business, error } = await supabase
        .from('bussiness')
        .select('*')
        .eq('admin_email', user.email)
        .maybeSingle();

    // If not admin, check staff_emails
    if (!business) {
        let { data: staffBusinesses, error: staffError } = await supabase
            .from('bussiness')
            .select('*')
            .contains('staff_emails', [user.email]);
        
        if (staffBusinesses && staffBusinesses.length > 0) {
            business = staffBusinesses[0];
        }
    }
    
    if (!business) {
        businessContent.innerHTML = `
            <div class="no-business">
                <p>No business associated with your account</p>
                <button id="create-business-btn">Create Business</button>
            </div>
        `;
        return null;
    }
    
    return business;
}

// Get products for business
async function getBusinessProducts(businessId) {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId);
    
    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }
    return data || [];
}

// Get user details by email
async function getUserByEmail(email) {
    const { data, error } = await supabase
        .from('users')
        .select('username, email')
        .eq('email', email)
        .single();
    
    if (error) {
        console.error('Error fetching user:', error);
        return null;
    }
    
    return data;
}

// Get all staff and admin details
async function getAllTeamMembers(business) {
    const teamMembers = [];
    
    // Get admin details
    const adminUser = await getUserByEmail(business.admin_email);
    if (adminUser) {
        teamMembers.push({
            ...adminUser,
            role: 'Admin',
            isAdmin: true
        });
    } else {
        // If admin not found in users table, show email only
        teamMembers.push({
            email: business.admin_email,
            username: business.admin_email.split('@')[0],
            role: 'Admin',
            isAdmin: true
        });
    }
    
    // Get staff details
    if (business.staff_emails && Array.isArray(business.staff_emails) && business.staff_emails.length > 0) {
        for (const staffEmail of business.staff_emails) {
            const staffUser = await getUserByEmail(staffEmail);
            if (staffUser) {
                teamMembers.push({
                    ...staffUser,
                    role: 'Staff',
                    isAdmin: false
                });
            } else {
                // If staff not found in users table, show email only
                teamMembers.push({
                    email: staffEmail,
                    username: staffEmail.split('@')[0],
                    role: 'Staff',
                    isAdmin: false
                });
            }
        }
    }
    
    return teamMembers;
}

// Display business info
function displayBusinessInfo(business) {
    currentBusiness = business;
    
    // Business logo
    if (businessLogoEl && business.logo_url) {
        businessLogoEl.src = business.logo_url;
    }
    
    // Basic business info
    businessNameEl.textContent = business.company_name || business.business_name || 'Business Name';
    
    // Determine user role
    const userRole = (currentUser && business.admin_email === currentUser.email) ? 'Admin' : 'Staff';
    businessRoleEl.textContent = userRole;
    
    // Business address
    businessAddressEl.textContent = business.business_address || 'Address not specified';
    
    // Business contact details
    if (businessPhoneEl) {
        businessPhoneEl.textContent = business.business_phone || business.phone || '+000000000000';
    }
    
    if (businessEmailEl) {
        businessEmailEl.textContent = business.business_email || business.email || business.admin_email || 'business-email.com';
    }
    
    // Additional business details if they exist
    const additionalDetailsEl = document.querySelector('.much-details p:nth-child(3)');
    if (additionalDetailsEl && business.website) {
        additionalDetailsEl.textContent = business.website;
    } else if (additionalDetailsEl && business.business_type) {
        additionalDetailsEl.textContent = business.business_type;
    }
}

// Display products
function displayBusinessProducts(products) {
    productsSection.innerHTML = '';
    
    if (!products || products.length === 0) {
        productsSection.innerHTML = `
            <div class="no-products" style="
                text-align: center;
                padding: 40px 20px;
                color: #666;
            ">
                <p style="margin-bottom: 20px; font-size: 18px;">No products found</p>
                <button id="add-product-btn" style="
                    background: rgba(33, 48, 123, 1);
                    color: white;
                    border: none;
                    padding: 12px 25px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                ">Add Product</button>
            </div>
        `;
        return;
    }
    
    products.forEach(product => {
        const productDiv = document.createElement('div');
        productDiv.className = 'business-product-cont';
        productDiv.innerHTML = `
            <div class="product-details-bus">
                <p class="bus-pro-name">${product.name}</p>
                <p class="bus-pro-category">${product.category || 'Uncategorized'}</p>
            </div>
            <div class="stock-product-bus">
                <p class="stock-info">${product.stock} In Stock</p>
            </div>
            <div class="inc-dec">
                <div class="inc" data-id="${product.id}">
                    <i class='bx bx-plus'></i>
                </div>
                <div class="inc dec" data-id="${product.id}">
                    <i class='bx bx-minus'></i>
                </div>
            </div>
        `;
        productsSection.appendChild(productDiv);
    });
}

// Display all team members (admin + staff)
async function displayAllTeamMembers() {
    if (!currentBusiness) return;
    
    const teamMembers = await getAllTeamMembers(currentBusiness);
    
    staffInfoSection.innerHTML = `
        <div class="staffs">
            <div class="staff-head">
                <p class="staff-name">Name</p>
                <p class="staff-name email-staff">Email</p>
                <p class="staff-name role-staff">Role</p>
                <button class="add-new" style="
                    height: 40px;
                    width: 100px;
                    position: absolute;
                    right: 20px;
                    top: 5px;
                    font-size: 16px;
                    background-color: rgba(33, 48, 123, 1);
                    color: white;
                    border: none;
                    outline: none;
                    transition: background 0.2s, box-shadow 0.2s;
                    cursor: pointer;
                    border-radius: 5px;
                ">Add Staff</button>
            </div>
        </div>
    `;
    
    const staffsContainer = staffInfoSection.querySelector('.staffs');
    
    if (teamMembers.length === 0) {
        staffsContainer.innerHTML += `
            <div class="no-staff" style="
                text-align: center;
                padding: 40px 20px;
                color: #666;
            ">
                <p>No team members found</p>
            </div>
        `;
        return;
    }
    
    teamMembers.forEach(member => {
        const memberDiv = document.createElement('div');
        memberDiv.className = 'staff-full';
        memberDiv.setAttribute('data-member-email', member.email);
        
        // Only show remove button for staff members (not admin) and only if current user is admin
        const isCurrentUserAdmin = currentUser && currentBusiness.admin_email === currentUser.email;
        const actionButton = (member.isAdmin || !isCurrentUserAdmin) 
            ? '' 
            : `<button class="action remove-staff-btn" data-email="${member.email}" style="
                background: #e74c3c;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            ">Remove</button>`;
        
        memberDiv.innerHTML = `
            <div class="the-staff-name">
                <p class="the-staff-name">${member.username || member.email.split('@')[0]}</p>
            </div>
            <div class="the-staff-name the-staff-email">
                <p class="the-staff-name the-email-staff">${member.email}</p>
            </div>
            <div class="the-staff-role">
                <p class="the-staff-role">${member.role}</p>
            </div>
            <div class="staff-actions">
                ${actionButton}
            </div>
        `;
        staffsContainer.appendChild(memberDiv);
    });
}

// Handle navigation
function setupNavigation() {
    // Hide both sections initially
    productsSection.style.display = 'none';
    staffInfoSection.style.display = 'none';
    
    // Products navigation
    navProducts.addEventListener('click', async () => {
        navProducts.classList.add('active');
        navStaff.classList.remove('active');
        productsSection.style.display = 'block';
        staffInfoSection.style.display = 'none';
        
        if (currentBusiness) {
            const products = await getBusinessProducts(currentBusiness.id);
            displayBusinessProducts(products);
        }
    });
    
    // Staff navigation
    navStaff.addEventListener('click', async () => {
        navStaff.classList.add('active');
        navProducts.classList.remove('active');
        staffInfoSection.style.display = 'block';
        productsSection.style.display = 'none';
        await displayAllTeamMembers();
    });
    
    // Activate products by default
    navProducts.click();
}

// Remove staff member (only staff, not admin)
async function removeStaff(email) {
    if (!currentBusiness || !email) return;
    
    // Check if current user is admin
    if (!currentUser || currentBusiness.admin_email !== currentUser.email) {
        alert('Only admin can remove staff members');
        return;
    }
    
    // Prevent removing admin
    if (email === currentBusiness.admin_email) {
        alert('Cannot remove admin from business');
        return;
    }
    
    // Show confirmation
    if (!confirm(`Are you sure you want to remove ${email} from staff?`)) {
        return;
    }
    
    // Ensure staff_emails is an array
    const currentStaff = Array.isArray(currentBusiness.staff_emails) 
        ? currentBusiness.staff_emails 
        : [];
    
    const updatedStaff = currentStaff.filter(e => e !== email);
    
    try {
        // Update database
        const { error } = await supabase
            .from('bussiness')
            .update({ staff_emails: updatedStaff })
            .eq('id', currentBusiness.id);
        
        if (error) {
            console.error('Error removing staff:', error);
            alert('Failed to remove staff member from database');
            return;
        }
        
        // Update local business data
        currentBusiness.staff_emails = updatedStaff;
        
        // Remove from UI immediately
        const memberElement = document.querySelector(`[data-member-email="${email}"]`);
        if (memberElement) {
            memberElement.remove();
        }
        
        // Show success message
        console.log(`Successfully removed ${email} from staff`);
        
    } catch (error) {
        console.error('Error in removeStaff:', error);
        alert('An error occurred while removing staff member');
    }
}

// Handle stock updates
async function updateStock(productId, change) {
    if (!currentBusiness) return;
    
    // Get current product
    const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();
    
    if (fetchError || !product) {
        console.error('Error fetching product:', fetchError);
        return;
    }
    
    // Calculate new stock
    const newStock = Math.max(0, product.stock + change);
    
    // Update in database
    const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId);
    
    if (updateError) {
        console.error('Error updating stock:', updateError);
        return;
    }
    
    // Refresh products display
    const products = await getBusinessProducts(currentBusiness.id);
    displayBusinessProducts(products);
}

// Add new staff member
async function addStaffMember(email) {
    if (!currentBusiness || !email) return;
    
    // Check if current user is admin
    if (!currentUser || currentBusiness.admin_email !== currentUser.email) {
        showModalError('Only admin can add staff members');
        return;
    }
    
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showModalError('Please enter a valid email address');
        return;
    }
    
    // Check if email is admin email
    if (email === currentBusiness.admin_email) {
        showModalError('This email is already the admin of this business');
        return;
    }
    
    // Ensure staff_emails is an array
    const currentStaff = Array.isArray(currentBusiness.staff_emails) 
        ? currentBusiness.staff_emails 
        : [];
    
    // Check if already exists in staff
    if (currentStaff.includes(email)) {
        showModalError('This email is already in staff list');
        return;
    }
    
    showModalLoading();
    hideModalError();
    
    const updatedStaff = [...currentStaff, email];
    
    try {
        const { error } = await supabase
            .from('bussiness')
            .update({ staff_emails: updatedStaff })
            .eq('id', currentBusiness.id);
        
        if (error) {
            console.error('Error adding staff:', error);
            showModalError('Failed to add staff member');
            return;
        }
        
        // Update local business data
        currentBusiness.staff_emails = updatedStaff;
        
        // Close modal and refresh display
        closeModal();
        await displayAllTeamMembers();
        
        console.log(`Successfully added ${email} to staff`);
        
    } catch (error) {
        console.error('Error in addStaffMember:', error);
        showModalError('An error occurred while adding staff member');
    } finally {
        hideModalLoading();
    }
}

// Event delegation for dynamic elements
document.addEventListener('click', async (e) => {
    // Staff removal
    if (e.target.classList.contains('remove-staff-btn')) {
        const email = e.target.dataset.email;
        await removeStaff(email);
    }
    
    // Stock increment
     if (e.target.closest('.inc-btn') || 
        (e.target.classList.contains('bx-plus') && e.target.closest('button.inc-btn'))) {
        const btn = e.target.closest('.inc-btn');
        const productId = btn.dataset.id;
        if (productId) await updateStock(productId, 1);
    }
    
    // Stock decrement
    if (e.target.closest('.dec-btn') || 
        (e.target.classList.contains('bx-minus') && e.target.closest('button.dec-btn'))) {
        const btn = e.target.closest('.dec-btn');
        const productId = btn.dataset.id;
        if (productId) await updateStock(productId, -1);
    }
    
    // Add product button
    if (e.target.id === 'add-product-btn') {
        // Implement your product creation flow
        alert('Redirect to product creation page');
    }
    
    // Create business button
    if (e.target.id === 'create-business-btn') {
        // Redirect to business creation
        window.location.href = '../business-setup/';
    }
    
    // Add staff button - show modal (only for admins)
    if (e.target.classList.contains('add-new')) {
        // Check if current user is admin
        if (!currentUser || currentBusiness.admin_email !== currentUser.email) {
            alert('Only admin can add staff members');
            return;
        }
        
        const modal = createStaffModal();
        
        // Modal event listeners
        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.querySelector('.cancel-btn').addEventListener('click', closeModal);
        
        // Add staff button in modal
        modal.querySelector('.add-staff-btn').addEventListener('click', async () => {
            const email = modal.querySelector('#staff-email').value.trim();
            if (email) {
                await addStaffMember(email);
            } else {
                showModalError('Please enter an email address');
            }
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Handle Enter key in email input
        modal.querySelector('#staff-email').addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const email = e.target.value.trim();
                if (email) {
                    await addStaffMember(email);
                } else {
                    showModalError('Please enter an email address');
                }
            }
        });
        
        // Focus on email input
        setTimeout(() => {
            modal.querySelector('#staff-email').focus();
        }, 100);
    }
});

// Handle ESC key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Initialize business page
async function initializeBusinessPage() {
    currentUser = await getCurrentUser();
    if (!currentUser) return;
    
    const business = await getBusinessForUser(currentUser);
    if (!business) return;
    
    displayBusinessInfo(business);
    setupNavigation();
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initializeBusinessPage);