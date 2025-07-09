// Supabase configuration
const SUPABASE_URL = 'https://jvcrkjkhmglgrwkadzxw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y3JramtobWdsZ3J3a2Fkenh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTQwOTgsImV4cCI6MjA2NzI3MDA5OH0.4uGTPJg2Nbl8QvGy6UhlBJlJ4lUtMl9f6vTJ_jf8z3o';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to get current user ID
async function getCurrentUserId() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user ? user.id : null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

// Function to fetch user data from users table
async function fetchUserData(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('username, email')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching user data:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error in fetchUserData:', error);
        return null;
    }
}

// Function to populate form fields with user data
function populateUserFields(userData) {
    if (!userData) return;

    // Split username into first and last name (if username contains space)
    const nameParts = userData.username.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Populate administrator details fields
    const firstNameField = document.getElementById('firstName');
    const lastNameField = document.getElementById('lastName');
    const emailField = document.getElementById('email');

    if (firstNameField) {
        firstNameField.value = firstName;
        firstNameField.style.backgroundColor = '#f0f9ff';
    }

    if (lastNameField) {
        lastNameField.value = lastName;
        lastNameField.style.backgroundColor = '#f0f9ff';
    }

    if (emailField) {
        emailField.value = userData.email;
        emailField.style.backgroundColor = '#f0f9ff';
    }

    // Also populate business email with the same email as default
    const businessEmailField = document.getElementById('businessEmail');
    if (businessEmailField && !businessEmailField.value) {
        businessEmailField.value = userData.email;
    }
}

// Function to show loading state
function showLoadingState() {
    const firstNameField = document.getElementById('firstName');
    const lastNameField = document.getElementById('lastName');
    const emailField = document.getElementById('email');

    [firstNameField, lastNameField, emailField].forEach(field => {
        if (field) {
            field.placeholder = 'Loading...';
            field.disabled = true;
        }
    });
}

// Function to hide loading state
function hideLoadingState() {
    const firstNameField = document.getElementById('firstName');
    const lastNameField = document.getElementById('lastName');
    const emailField = document.getElementById('email');

    const placeholders = ['John', 'Doe', 'john@company.com'];
    
    [firstNameField, lastNameField, emailField].forEach((field, index) => {
        if (field) {
            field.placeholder = placeholders[index];
            field.disabled = false;
        }
    });
}

// Function to collect all form data
function collectFormData() {
    // Administrator data
    const administratorData = {
        first_name: document.getElementById('firstName').value.trim(),
        last_name: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    // Business data
    const businessData = {
        company_name: document.getElementById('companyName').value.trim(),
        address: document.getElementById('address').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        business_email: document.getElementById('businessEmail').value.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    // Staff data
    const staffEmails = [];
    const staffInputs = document.querySelectorAll('#staffInvites input[type="email"]');
    staffInputs.forEach(input => {
        const email = input.value.trim();
        if (email) {
            staffEmails.push({
                email: email,
                status: 'pending',
                invited_at: new Date().toISOString()
            });
        }
    });

    // Terms and privacy acceptance
    const termsData = {
        terms_accepted: document.getElementById('termsAccept').checked,
        privacy_accepted: document.getElementById('privacyAccept').checked,
        marketing_accepted: document.getElementById('marketingAccept').checked,
        accepted_at: new Date().toISOString()
    };

    return {
        administrator: administratorData,
        business: businessData,
        staff: staffEmails,
        terms: termsData
    };
}

// Function to save administrator data
async function saveAdministratorData(adminData, userId) {
    try {
        // Add user_id to the administrator data
        const administratorRecord = {
            ...adminData,
            user_id: userId
        };

        // Don't save password in administrator table - it should be handled by Supabase Auth
        delete administratorRecord.password;

        const { data, error } = await supabase
            .from('administrator')
            .insert([administratorRecord])
            .select();

        if (error) {
            console.error('Error saving administrator data:', error);
            throw error;
        }

        console.log('Administrator data saved successfully:', data);
        return data[0];
    } catch (error) {
        console.error('Error in saveAdministratorData:', error);
        throw error;
    }
}

// Function to save business data
async function saveBusinessData(businessData, administratorId) {
    try {
        // Add administrator_id to the business data
        const businessRecord = {
            ...businessData,
            administrator_id: administratorId
        };

        const { data, error } = await supabase
            .from('business')
            .insert([businessRecord])
            .select();

        if (error) {
            console.error('Error saving business data:', error);
            throw error;
        }

        console.log('Business data saved successfully:', data);
        return data[0];
    } catch (error) {
        console.error('Error in saveBusinessData:', error);
        throw error;
    }
}

// Function to save staff data
async function saveStaffData(staffEmails, businessId) {
    try {
        if (staffEmails.length === 0) {
            console.log('No staff emails to save');
            return [];
        }

        // Add business_id to each staff record
        const staffRecords = staffEmails.map(staff => ({
            ...staff,
            business_id: businessId
        }));

        const { data, error } = await supabase
            .from('staff')
            .insert(staffRecords)
            .select();

        if (error) {
            console.error('Error saving staff data:', error);
            throw error;
        }

        console.log('Staff data saved successfully:', data);
        return data;
    } catch (error) {
        console.error('Error in saveStaffData:', error);
        throw error;
    }
}

// Function to save terms and privacy acceptance
async function saveTermsAcceptance(termsData, administratorId) {
    try {
        const termsRecord = {
            ...termsData,
            administrator_id: administratorId
        };

        const { data, error } = await supabase
            .from('terms_acceptance')
            .insert([termsRecord])
            .select();

        if (error) {
            console.error('Error saving terms acceptance:', error);
            throw error;
        }

        console.log('Terms acceptance saved successfully:', data);
        return data[0];
    } catch (error) {
        console.error('Error in saveTermsAcceptance:', error);
        throw error;
    }
}

// Function to show success message
function showSuccessMessage(message) {
    // Create or update success message
    const existingMessage = document.getElementById('saveSuccessMessage');
    if (existingMessage) {
        existingMessage.remove();
    }

    const successDiv = document.createElement('div');
    successDiv.id = 'saveSuccessMessage';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    successDiv.textContent = message;

    document.body.appendChild(successDiv);

    // Remove after 3 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Function to show error message
function showErrorMessage(message) {
    // Create or update error message
    const existingMessage = document.getElementById('saveErrorMessage');
    if (existingMessage) {
        existingMessage.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.id = 'saveErrorMessage';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    errorDiv.textContent = message;

    document.body.appendChild(errorDiv);

    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Function to show loading spinner
function showLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.id = 'loadingSpinner';
    spinner.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 1001;
        text-align: center;
    `;
    spinner.innerHTML = `
        <div style="margin-bottom: 10px;">
            <div style="border: 3px solid #f3f3f3; border-top: 3px solid #3b82f6; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        </div>
        <div>Saving registration data...</div>
    `;

    // Add CSS for spinner animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(spinner);
}

// Function to hide loading spinner
function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.remove();
    }
}

// Main function to save all registration data
async function saveRegistrationData() {
    try {
        // Show loading spinner
        showLoadingSpinner();

        // Get current user ID
        const userId = await getCurrentUserId();
        if (!userId) {
            throw new Error('No authenticated user found');
        }

        // Collect all form data
        const formData = collectFormData();

        // Validate required fields
        if (!formData.administrator.first_name || !formData.administrator.last_name || 
            !formData.administrator.email || !formData.business.company_name) {
            throw new Error('Please fill in all required fields');
        }

        // Validate terms acceptance
        if (!formData.terms.terms_accepted || !formData.terms.privacy_accepted) {
            throw new Error('Please accept the terms and privacy policy');
        }

        console.log('Starting registration save process...');

        // Save administrator data first
        const administratorRecord = await saveAdministratorData(formData.administrator, userId);
        
        // Save business data
        const businessRecord = await saveBusinessData(formData.business, administratorRecord.id);
        
        // Save staff data (if any)
        const staffRecords = await saveStaffData(formData.staff, businessRecord.id);
        
        // Save terms acceptance
        const termsRecord = await saveTermsAcceptance(formData.terms, administratorRecord.id);

        // Hide loading spinner
        hideLoadingSpinner();

        // Show success message
        showSuccessMessage('Registration completed successfully!');

        console.log('Registration saved successfully:', {
            administrator: administratorRecord,
            business: businessRecord,
            staff: staffRecords,
            terms: termsRecord
        });

        // Return success data
        return {
            success: true,
            data: {
                administrator: administratorRecord,
                business: businessRecord,
                staff: staffRecords,
                terms: termsRecord
            }
        };

    } catch (error) {
        console.error('Error saving registration data:', error);
        
        // Hide loading spinner
        hideLoadingSpinner();
        
        // Show error message
        showErrorMessage(`Error saving registration: ${error.message}`);
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Modified completeRegistration function to save data
async function completeRegistration() {
    try {
        // Save all registration data
        const result = await saveRegistrationData();
        
        if (result.success) {
            // Hide form and show success message
            document.getElementById('buttonGroup').style.display = 'none';
            document.querySelector('.step-indicator').style.display = 'none';
            document.querySelector('.progress-bar').style.display = 'none';
            document.querySelectorAll('.step').forEach(s => s.style.display = 'none');
            document.getElementById('success').style.display = 'block';
            
            console.log('Registration completed successfully!');
        } else {
            // Handle error - don't proceed to success screen
            console.error('Registration failed:', result.error);
        }
    } catch (error) {
        console.error('Error in completeRegistration:', error);
        showErrorMessage('An unexpected error occurred. Please try again.');
    }
}

// Function to save data at each step (optional - for progressive saving)
async function saveStepData(step) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            console.log('No authenticated user found');
            return;
        }

        // Only save administrator data after step 1
        if (step === 1) {
            const adminData = {
                first_name: document.getElementById('firstName').value.trim(),
                last_name: document.getElementById('lastName').value.trim(),
                email: document.getElementById('email').value.trim(),
                updated_at: new Date().toISOString()
            };

            // Check if administrator record exists
            const { data: existingAdmin } = await supabase
                .from('administrator')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (existingAdmin) {
                // Update existing record
                await supabase
                    .from('administrator')
                    .update(adminData)
                    .eq('user_id', userId);
            } else {
                // Create new record
                await saveAdministratorData({...adminData, user_id: userId}, userId);
            }
        }
    } catch (error) {
        console.error('Error saving step data:', error);
    }
}

// Main function to initialize user data loading
async function initializeUserData() {
    try {
        showLoadingState();
        const userId = await getCurrentUserId();
        
        if (!userId) {
            console.log('No authenticated user found');
            hideLoadingState();
            return;
        }

        const userData = await fetchUserData(userId);
        
        if (userData) {
            populateUserFields(userData);
            console.log('User data loaded successfully:', userData);
        } else {
            console.log('No user data found');
        }

    } catch (error) {
        console.error('Error initializing user data:', error);
    } finally {
        hideLoadingState();
    }
}

// Handle authentication state changes
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        console.log('User signed in, loading data...');
        initializeUserData();
    } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        // Clear form fields
        ['firstName', 'lastName', 'email'].forEach(id => {
            const field = document.getElementById(id);
            if (field) {
                field.value = '';
                field.style.backgroundColor = '';
            }
        });
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeUserData();
    }, 1000);
});

// Export functions for global access
window.registrationHandler = {
    saveRegistrationData,
    completeRegistration,
    saveStepData,
    initializeUserData,
    collectFormData
};

// Override the original completeRegistration function
window.completeRegistration = completeRegistration;