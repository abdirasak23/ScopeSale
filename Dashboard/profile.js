// Complete Profile.js - User Profile Management with Supabase Integration

// Ensure Supabase is available globally
if (!window.supabase) {
    console.error("Supabase SDK not loaded. Check the CDN link.");
}

// Initialize Supabase client (use the same configuration as your auth code)
const SUPABASE_URL = 'https://jvcrkjkhmglgrwkadzxw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y3JramtobWdsZ3J3a2Fkenh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTQwOTgsImV4cCI6MjA2NzI3MDA5OH0.4uGTPJg2Nbl8QvGy6UhlBJlJ4lUtMl9f6vTJ_jf8z3o';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let currentUser = null;
let userRole = 'User';
let businessData = null;
let isEditMode = false;
let originalValues = {};

// Check authentication state and get user data
async function checkAuthState() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Error getting session:', error);
            redirectToLogin();
            return null;
        }
        
        if (session && session.user) {
            console.log('User is logged in:', session.user.email);
            return session.user;
        } else {
            console.log('No active session');
            redirectToLogin();
            return null;
        }
    } catch (error) {
        console.error('Error checking auth state:', error);
        redirectToLogin();
        return null;
    }
}

// Get user data from users table
async function getUserData(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Error in getUserData:', error);
        return null;
    }
}

// Check if user is admin or staff in business table
async function checkUserRole(userEmail) {
    try {
        console.log('🔍 Checking user role for email:', userEmail);
        
        // Check if user is admin
        const { data: adminData, error: adminError } = await supabase
            .from('bussiness')
            .select('*')
            .eq('admin_email', userEmail);
        
        if (adminError) {
            console.error('Error checking admin role:', adminError);
        }
        
        if (adminData && adminData.length > 0) {
            console.log('✅ User is ADMIN of business:', adminData[0].business_name);
            return { 
                role: 'Admin', 
                businessData: adminData[0],
                isBusinessUser: true 
            };
        }
        
        // Check if user is staff
        const { data: staffData, error: staffError } = await supabase
            .from('bussiness')
            .select('*')
            .contains('staff_emails', [userEmail]);
        
        if (staffError) {
            console.error('Error checking staff role:', staffError);
            
            // Fallback method for staff check
            const { data: allBusinessData, error: allError } = await supabase
                .from('bussiness')
                .select('*');
            
            if (!allError && allBusinessData) {
                const staffBusiness = allBusinessData.find(business => {
                    if (business.staff_emails && Array.isArray(business.staff_emails)) {
                        return business.staff_emails.includes(userEmail);
                    }
                    return false;
                });
                
                if (staffBusiness) {
                    console.log('✅ User is STAFF of business:', staffBusiness.business_name);
                    return { 
                        role: 'Staff', 
                        businessData: staffBusiness,
                        isBusinessUser: true 
                    };
                }
            }
        }
        
        if (staffData && staffData.length > 0) {
            console.log('✅ User is STAFF of business:', staffData[0].business_name);
            return { 
                role: 'Staff', 
                businessData: staffData[0],
                isBusinessUser: true 
            };
        }
        
        console.log('❌ User is regular user (not admin or staff)');
        return { 
            role: 'User', 
            businessData: null,
            isBusinessUser: false 
        };
        
    } catch (error) {
        console.error('Error in checkUserRole:', error);
        return { 
            role: 'User', 
            businessData: null,
            isBusinessUser: false 
        };
    }
}

// Update user data in database
async function updateUserData(userId, userData) {
    try {
        const { data, error } = await supabase
            .from('users')
            .update(userData)
            .eq('id', userId)
            .select();
        
        if (error) {
            console.error('Error updating user data:', error);
            return { success: false, error: error.message };
        }
        
        console.log('✅ User data updated successfully');
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error in updateUserData:', error);
        return { success: false, error: error.message };
    }
}

// Display user information in the profile
function displayUserProfile(user, userData, roleInfo) {
    try {
        // Extract names from userData or user metadata
        let firstName = userData?.username || '';
        let lastName = userData?.last_name || '';
        let username = userData?.username || '';
        let email = user.email || '';
        let phone = userData?.phone || '';
        let dateOfBirth = userData?.date_of_birth || '';
        let address = userData?.address || '';
        
        // If no separate first/last names, try to extract from username or full name
        if (!firstName && !lastName) {
            const fullName = user.user_metadata?.full_name || username;
            if (fullName) {
                const nameParts = fullName.split(' ');
                firstName = nameParts[0] || '';
                lastName = nameParts.slice(1).join(' ') || '';
            }
        }
        
        // Get address from userData or businessData
        if (roleInfo.isBusinessUser && roleInfo.businessData && roleInfo.businessData.business_address) {
            address = roleInfo.businessData.business_address;
        }

        // Update profile header
        const nameElement = document.querySelector('.profile-sect .person .name');
        const roleElement = document.querySelector('.profile-sect .person .role');
        const addressElement = document.querySelector('.profile-sect .person .address');

        if (nameElement) {
            nameElement.textContent = firstName && lastName ? `${firstName} ${lastName}` : username || 'User';
        }

        if (roleElement) {
            roleElement.textContent = roleInfo.role;
            // Add business name if user is admin or staff
            if (roleInfo.isBusinessUser && roleInfo.businessData) {
                roleElement.textContent += ` - ${roleInfo.businessData.company_name}`;
            }
        }

        if (addressElement) {
            addressElement.textContent = address || 'No address provided';
        }
        
        // Update personal information fields
        const personalInfoFields = [
            { selector: '.personal .p-side:nth-child(1) .the-name', value: firstName || 'Not provided' },
            { selector: '.personal .p-side:nth-child(2) .the-name', value: lastName || 'Not provided' },
            { selector: '.personal .p-side:nth-child(3) .the-name', value: dateOfBirth || 'Not provided' },
            { selector: '.personal.details .p-side:nth-child(1) .the-name', value: email },
            { selector: '.personal.details .p-side:nth-child(2) .the-name', value: phone || 'Not provided' },
            { selector: '.personal.details .p-side:nth-child(3) .the-name', value: roleInfo.role }
        ];
        
        personalInfoFields.forEach(field => {
            const element = document.querySelector(field.selector);
            if (element) {
                element.textContent = field.value;
            }
        });
        
        // Set profile image if available
        const imageSection = document.querySelector('.image-pro');
        if (imageSection && userData?.avatar_url) {
            imageSection.style.backgroundImage = `url(${userData.avatar_url})`;
            imageSection.style.backgroundSize = 'cover';
            imageSection.style.backgroundPosition = 'center';
            imageSection.style.backgroundRepeat = 'no-repeat';
        } else if (imageSection && user.user_metadata?.avatar_url) {
            imageSection.style.backgroundImage = `url(${user.user_metadata.avatar_url})`;
            imageSection.style.backgroundSize = 'cover';
            imageSection.style.backgroundPosition = 'center';
            imageSection.style.backgroundRepeat = 'no-repeat';
        }
        
    } catch (error) {
        console.error('Error displaying user profile:', error);
    }
}

// Store original values for cancel functionality
function storeOriginalValues() {
    const nameElements = document.querySelectorAll('.the-name');
    nameElements.forEach((element, index) => {
        originalValues[index] = element.textContent;
    });
    
    // Store profile header values
    const nameElement = document.querySelector('.profile-sect .person .name');
    const addressElement = document.querySelector('.profile-sect .person .address');
    
    if (nameElement) originalValues['profileName'] = nameElement.textContent;
    if (addressElement) originalValues['profileAddress'] = addressElement.textContent;
}

// Restore original values on cancel
function restoreOriginalValues() {
    const nameElements = document.querySelectorAll('.the-name');
    nameElements.forEach((element, index) => {
        if (originalValues[index]) {
            element.textContent = originalValues[index];
        }
    });
    
    // Restore profile header values
    const nameElement = document.querySelector('.profile-sect .person .name');
    const addressElement = document.querySelector('.profile-sect .person .address');
    
    if (nameElement && originalValues['profileName']) {
        nameElement.textContent = originalValues['profileName'];
    }
    if (addressElement && originalValues['profileAddress']) {
        addressElement.textContent = originalValues['profileAddress'];
    }
}

// Convert paragraphs to editable inputs
function makeEditable() {
    const nameElements = document.querySelectorAll('.the-name');
    
    nameElements.forEach((element, index) => {
        // Skip email and role fields (they shouldn't be editable)
        const isEmailField = element.textContent.includes('@');
        const isRoleField = element.closest('.p-side')?.querySelector('.name')?.textContent === 'User Role';
        
        if (isEmailField || isRoleField) {
            return;
        }
        
        const currentText = element.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText === 'Not provided' ? '' : currentText;
        input.className = 'edit-input';
        input.style.cssText = `
            background: transparent;
            border: 1px solid #ccc;
            padding: 5px;
            font-size: inherit;
            font-family: inherit;
            color: inherit;
            width: 100%;
            box-sizing: border-box;
            border-radius: 4px;
        `;
        
        // Special handling for date of birth
        const isDateField = element.closest('.p-side')?.querySelector('.name')?.textContent === 'Date of Birth';
        if (isDateField) {
            input.type = 'date';
        }
        
        // Replace paragraph with input
        element.parentNode.replaceChild(input, element);
    });
    
    // Make profile header name editable
    const profileNameElement = document.querySelector('.profile-sect .person .name');
    if (profileNameElement) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = profileNameElement.textContent;
        input.className = 'edit-input profile-name-input';
        input.style.cssText = `
            background: transparent;
            border: 1px solid #ccc;
            padding: 5px;
            font-size: inherit;
            font-family: inherit;
           
            width: 100%;
            box-sizing: border-box;
            border-radius: 4px;
            font-weight: bold;
        `;
        profileNameElement.parentNode.replaceChild(input, profileNameElement);
    }
    
    // Make address editable
    const addressElement = document.querySelector('.profile-sect .person .address');
    if (addressElement) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = addressElement.textContent;
        input.className = 'edit-input address-input';
        input.style.cssText = `
            background: transparent;
            border: 1px solid #ccc;
            padding: 5px;
            font-size: inherit;
            font-family: inherit;
            color: inherit;
            width: 100%;
            box-sizing: border-box;
            border-radius: 4px;
        `;
        addressElement.parentNode.replaceChild(input, addressElement);
    }
}

// Convert inputs back to paragraphs
function makeNonEditable() {
    const inputElements = document.querySelectorAll('.edit-input');
    
    inputElements.forEach((input, index) => {
        const paragraph = document.createElement('p');
        paragraph.className = input.classList.contains('profile-name-input') ? 'name' : 
                              input.classList.contains('address-input') ? 'address' : 'the-name';
        paragraph.textContent = input.value || 'Not provided';
        
        // Replace input with paragraph
        input.parentNode.replaceChild(paragraph, input);
    });
}

// Handle image upload
function handleImageUpload() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imageSection = document.querySelector('.image-pro');
                imageSection.style.backgroundImage = `url(${e.target.result})`;
                imageSection.style.backgroundSize = 'cover';
                imageSection.style.backgroundPosition = 'center';
                imageSection.style.backgroundRepeat = 'no-repeat';
            };
            reader.readAsDataURL(file);
        }
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

// Save profile changes
async function saveProfileChanges() {
    try {
        if (!currentUser) {
            console.error('No current user found');
            return;
        }
        
        // Get updated values from inputs
        const inputs = document.querySelectorAll('.edit-input');
        const updatedData = {};
        
        inputs.forEach(input => {
            const parentSide = input.closest('.p-side');
            if (parentSide) {
                const labelElement = parentSide.querySelector('.name');
                if (labelElement) {
                    const label = labelElement.textContent;
                    
                    switch (label) {
                        case 'First Name':
                            updatedData.username = input.value;
                            break;
                        case 'Last Name':
                            updatedData.last_name = input.value;
                            break;
                        case 'Date of Birth':
                            updatedData.date_of_birth = input.value;
                            break;
                        case 'Phone Number':
                            updatedData.phone = input.value;
                            break;
                    }
                }
            }
            
            // Handle profile header fields
            if (input.classList.contains('address-input')) {
                updatedData.address = input.value;
            }
        });
        
        // Update username if profile name was changed
        const profileNameInput = document.querySelector('.profile-name-input');
        if (profileNameInput) {
            updatedData.username = profileNameInput.value;
        }
        
        // Add updated timestamp
        updatedData.created_at = new Date().toISOString();
        
        console.log('Updating user data:', updatedData);
        
        // Update user data in database
        const result = await updateUserData(currentUser.id, updatedData);
        
        if (result.success) {
            console.log('✅ Profile updated successfully');
            
            // Show success message
            showAlert('Profile updated successfully!', 'success');
            
            // Exit edit mode
            makeNonEditable();
            document.querySelector('.edit').textContent = 'edit';
            document.querySelector('.submit').style.display = 'none';
            isEditMode = false;
            
            // Remove cursor styles
            const imageSection = document.querySelector('.image-pro');
            const cameraIcon = document.querySelector('.camera');
            imageSection.style.cursor = 'default';
            cameraIcon.style.cursor = 'default';
            
        } else {
            console.error('❌ Error updating profile:', result.error);
            showAlert(`Error updating profile: ${result.error}`, 'error');
        }
        
    } catch (error) {
        console.error('Error saving profile changes:', error);
        showAlert('Error saving profile changes. Please try again.', 'error');
    }
}

// Show alert message
function showAlert(message, type) {
    // Create alert if it doesn't exist
    let alertContainer = document.querySelector('.alert');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.className = 'alert';
        alertContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            display: none;
        `;
        document.body.appendChild(alertContainer);
    }
    
    // Set message and color
    alertContainer.textContent = message;
    alertContainer.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';
    alertContainer.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        alertContainer.style.display = 'none';
    }, 5000);
}

// Redirect to login page
function redirectToLogin() {
    console.log('Redirecting to login page...');
    window.location.href = '../Onboarding/';
}

// Initialize profile page
async function initializeProfile() {
    try {
        console.log('🚀 Initializing profile page...');
        
        // Check authentication
        currentUser = await checkAuthState();
        if (!currentUser) {
            return;
        }
        
        // Get user data from database
        const userData = await getUserData(currentUser.id);
        console.log('📊 User data from database:', userData);
        
        // Check user role
        const roleInfo = await checkUserRole(currentUser.email);
        console.log('📊 User role info:', roleInfo);
        
        // Store global variables
        userRole = roleInfo.role;
        businessData = roleInfo.businessData;
        
        // Display user profile
        displayUserProfile(currentUser, userData, roleInfo);
        
        console.log('✅ Profile initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing profile:', error);
        showAlert('Error loading profile. Please refresh the page.', 'error');
    }
}

// Profile edit functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize profile
    initializeProfile();
    
    const editButton = document.querySelector('.edit');
    const submitButton = document.querySelector('.submit');
    const imageSection = document.querySelector('.image-pro');
    const cameraIcon = document.querySelector('.camera');
    
    // Initially hide submit button
    if (submitButton) {
        submitButton.style.display = 'none';
    }
    
    // Edit button click handler
    if (editButton) {
        editButton.addEventListener('click', function() {
            if (!isEditMode) {
                // Enter edit mode
                storeOriginalValues();
                makeEditable();
                editButton.textContent = 'Cancel';
                if (submitButton) submitButton.style.display = 'block';
                isEditMode = true;
                
                // Add click handler to image section
                if (imageSection) imageSection.style.cursor = 'pointer';
                if (cameraIcon) cameraIcon.style.cursor = 'pointer';
                
            } else {
                // Cancel edit mode
                restoreOriginalValues();
                makeNonEditable();
                editButton.textContent = 'edit';
                if (submitButton) submitButton.style.display = 'none';
                isEditMode = false;
                
                // Remove cursor styles
                if (imageSection) imageSection.style.cursor = 'default';
                if (cameraIcon) cameraIcon.style.cursor = 'default';
            }
        });
    }
    
    // Image click handler
    if (imageSection) {
        imageSection.addEventListener('click', function() {
            if (isEditMode) {
                handleImageUpload();
            }
        });
    }
    
    // Camera icon click handler
    if (cameraIcon) {
        cameraIcon.addEventListener('click', function() {
            if (isEditMode) {
                handleImageUpload();
            }
        });
    }
    
    // Submit button click handler
    if (submitButton) {
        submitButton.addEventListener('click', async function() {
            await saveProfileChanges();
        });
    }
    
    // Add Enter key support for inputs
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && event.target.classList.contains('edit-input')) {
            if (submitButton) submitButton.click();
        }
    });
    
    // Add Escape key support to cancel editing
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && isEditMode) {
            if (editButton) editButton.click();
        }
    });
});

// Export functions for use in other files
window.profileUtils = {
    initializeProfile,
    checkAuthState,
    getUserData,
    checkUserRole,
    updateUserData
};