// Business Registration Handler for Supabase
// This file handles saving business registration data to the 'business' table

// Supabase configuration
const SUPABASE_URL = 'https://jvcrkjkhmglgrwkadzxw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y3JramtobWdsZ3J3a2Fkenh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTQwOTgsImV4cCI6MjA2NzI3MDA5OH0.4uGTPJg2Nbl8QvGy6UhlBJlJ4lUtMl9f6vTJ_jf8z3o';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Business Registration Class
class BusinessRegistration {
    constructor() {
        this.currentUser = null;
        this.initializeAuth();
    }

    // Initialize authentication and get current user
    async initializeAuth() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            this.currentUser = user;
            
            if (user) {
                console.log('User authenticated:', user.id);
                await this.loadUserData();
            } else {
                console.log('No authenticated user found');
            }
        } catch (error) {
            console.error('Error initializing auth:', error);
        }
    }

    // Load existing user data and populate form fields
    async loadUserData() {
        try {
            if (!this.currentUser) return;

            const { data: userData, error } = await supabase
                .from('users')
                .select('username, email')
                .eq('id', this.currentUser.id)
                .single();

            if (error) {
                console.error('Error fetching user data:', error);
                return;
            }

            if (userData) {
                this.populateUserFields(userData);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    // Populate form fields with existing user data
    populateUserFields(userData) {
        // Split username into first and last name
        const nameParts = userData.username ? userData.username.split(' ') : ['', ''];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Populate administrator fields
        this.setFieldValue('firstName', firstName);
        this.setFieldValue('lastName', lastName);
        this.setFieldValue('email', userData.email);
        this.setFieldValue('businessEmail', userData.email);

        // Style populated fields
        ['firstName', 'lastName', 'email'].forEach(id => {
            const field = document.getElementById(id);
            if (field && field.value) {
                field.style.backgroundColor = '#f0f9ff';
                field.style.borderColor = '#3b82f6';
            }
        });
    }

    // Helper method to set field value safely
    setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field && value) {
            field.value = value;
        }
    }

    // Collect all form data
    collectFormData() {
        const formData = {
            // Administrator information
            admin_first_name: this.getFieldValue('firstName'),
            admin_last_name: this.getFieldValue('lastName'),
            admin_email: this.getFieldValue('email'),
            admin_password: this.getFieldValue('password'),
            
            // Business information
            company_name: this.getFieldValue('companyName'),
            business_address: this.getFieldValue('address'),
            business_phone: this.getFieldValue('phone'),
            business_email: this.getFieldValue('businessEmail'),
            
            // Staff invitations
            staff_emails: this.collectStaffEmails(),
            
            // Terms and privacy
            terms_accepted: this.getCheckboxValue('termsAccept'),
            privacy_accepted: this.getCheckboxValue('privacyAccept'),
            marketing_accepted: this.getCheckboxValue('marketingAccept'),
            
            // Metadata
            user_id: this.currentUser?.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        return formData;
    }

    // Helper method to get field value safely
    getFieldValue(fieldId) {
        const field = document.getElementById(fieldId);
        return field ? field.value.trim() : '';
    }

    // Helper method to get checkbox value
    getCheckboxValue(fieldId) {
        const field = document.getElementById(fieldId);
        return field ? field.checked : false;
    }

    // Collect staff email addresses
    collectStaffEmails() {
        const staffEmails = [];
        const staffInputs = document.querySelectorAll('#staffInvites input[type="email"]');
        
        staffInputs.forEach(input => {
            const email = input.value.trim();
            if (email && this.isValidEmail(email)) {
                staffEmails.push(email);
            }
        });

        return staffEmails;
    }

    // Email validation helper
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate form data
    validateFormData(formData) {
        const errors = [];

        // Required administrator fields
        if (!formData.admin_first_name) errors.push('First name is required');
        if (!formData.admin_last_name) errors.push('Last name is required');
        if (!formData.admin_email) errors.push('Email is required');
        if (!formData.admin_password) errors.push('Password is required');

        // Required business fields
        if (!formData.company_name) errors.push('Company name is required');
        if (!formData.business_address) errors.push('Business address is required');
        if (!formData.business_phone) errors.push('Business phone is required');
        if (!formData.business_email) errors.push('Business email is required');

        // Email validation
        if (formData.admin_email && !this.isValidEmail(formData.admin_email)) {
            errors.push('Invalid admin email format');
        }
        if (formData.business_email && !this.isValidEmail(formData.business_email)) {
            errors.push('Invalid business email format');
        }

        // Password confirmation
        const password = this.getFieldValue('password');
        const confirmPassword = this.getFieldValue('confirmPassword');
        if (password !== confirmPassword) {
            errors.push('Passwords do not match');
        }

        // Terms acceptance
        if (!formData.terms_accepted) errors.push('Please accept the terms of service');
        if (!formData.privacy_accepted) errors.push('Please accept the privacy policy');

        // User authentication
        if (!formData.user_id) errors.push('User must be authenticated');

        return errors;
    }

    // Save business registration data to Supabase
    async saveBusinessData(formData) {
        try {
            // Prepare data for business table
            const businessData = {
                user_id: formData.user_id,
                company_name: formData.company_name,
                admin_first_name: formData.admin_first_name,
                admin_last_name: formData.admin_last_name,
                admin_email: formData.admin_email,
                business_address: formData.business_address,
                business_phone: formData.business_phone,
                business_email: formData.business_email,
                staff_emails: formData.staff_emails,
                terms_accepted: formData.terms_accepted,
                privacy_accepted: formData.privacy_accepted,
                marketing_accepted: formData.marketing_accepted,
                registration_status: 'completed',
                created_at: formData.created_at,
                updated_at: formData.updated_at
            };

            console.log('Saving business data:', businessData);

            // Insert data into business table
            const { data, error } = await supabase
                .from('bussiness')
                .insert([businessData])
                .select()
                .single();

            if (error) {
                console.error('Supabase error:', error);
                throw new Error(`Database error: ${error.message}`);
            }

            console.log('Business data saved successfully:', data);
            return { success: true, data: data };

        } catch (error) {
            console.error('Error saving business data:', error);
            throw error;
        }
    }

    // Update existing business record
    async updateBusinessData(businessId, formData) {
        try {
            const updateData = {
                company_name: formData.company_name,
                admin_first_name: formData.admin_first_name,
                admin_last_name: formData.admin_last_name,
                admin_email: formData.admin_email,
                business_address: formData.business_address,
                business_phone: formData.business_phone,
                business_email: formData.business_email,
                staff_emails: formData.staff_emails,
                terms_accepted: formData.terms_accepted,
                privacy_accepted: formData.privacy_accepted,
                marketing_accepted: formData.marketing_accepted,
                updated_at: formData.updated_at
            };

            const { data, error } = await supabase
                .from('bussiness')
                .update(updateData)
                .eq('id', businessId)
                .select()
                .single();

            if (error) {
                throw new Error(`Update error: ${error.message}`);
            }

            console.log('Business data updated successfully:', data);
            return { success: true, data: data };

        } catch (error) {
            console.error('Error updating business data:', error);
            throw error;
        }
    }

    // Check if business already exists for user
    async checkExistingBusiness() {
        try {
            if (!this.currentUser) return null;

            const { data, error } = await supabase
                .from('business')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                console.error('Error checking existing business:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error in checkExistingBusiness:', error);
            return null;
        }
    }

    // Show loading spinner
    showLoadingSpinner() {
        const existingSpinner = document.getElementById('businessLoadingSpinner');
        if (existingSpinner) existingSpinner.remove();

        const spinner = document.createElement('div');
        spinner.id = 'businessLoadingSpinner';
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
            <div>Saving business registration...</div>
        `;

        document.body.appendChild(spinner);
    }

    // Hide loading spinner
    hideLoadingSpinner() {
        const spinner = document.getElementById('businessLoadingSpinner');
        if (spinner) spinner.remove();
    }

    // Show success message
    showSuccessMessage(message) {
        const existingMessage = document.getElementById('businessSuccessMessage');
        if (existingMessage) existingMessage.remove();

        const successDiv = document.createElement('div');
        successDiv.id = 'businessSuccessMessage';
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

        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    // Show error message
    showErrorMessage(message) {
        const existingMessage = document.getElementById('businessErrorMessage');
        if (existingMessage) existingMessage.remove();

        const errorDiv = document.createElement('div');
        errorDiv.id = 'businessErrorMessage';
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

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    // Main registration handler
    async handleBusinessRegistration() {
        try {
            this.showLoadingSpinner();

            // Check if user is authenticated
            if (!this.currentUser) {
                throw new Error('User must be authenticated to register business');
            }

            // Collect form data
            const formData = this.collectFormData();

            // Validate form data
            const validationErrors = this.validateFormData(formData);
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join(', '));
            }

            // Check if business already exists
            const existingBusiness = await this.checkExistingBusiness();

            let result;
            if (existingBusiness) {
                // Update existing business
                result = await this.updateBusinessData(existingBusiness.id, formData);
                this.showSuccessMessage('Business information updated successfully!');
            } else {
                // Create new business
                result = await this.saveBusinessData(formData);
                this.showSuccessMessage('Business registered successfully!');
            }

            this.hideLoadingSpinner();
            return result;

        } catch (error) {
            console.error('Error in business registration:', error);
            this.hideLoadingSpinner();
            this.showErrorMessage(error.message);
            throw error;
        }
    }

    // Progressive save during form completion
    async saveProgressiveData(stepNumber) {
        try {
            if (!this.currentUser) return;

            const formData = this.collectFormData();
            
            // Save what we have so far
            const existingBusiness = await this.checkExistingBusiness();
            
            if (existingBusiness) {
                // Update existing record with current data
                await this.updateBusinessData(existingBusiness.id, formData);
            }

            console.log(`Step ${stepNumber} data saved progressively`);
        } catch (error) {
            console.error('Error saving progressive data:', error);
        }
    }
}

// Initialize business registration handler
const businessRegistration = new BusinessRegistration();

// Override the original completeRegistration function
window.completeRegistration = async function() {
    try {
        const result = await businessRegistration.handleBusinessRegistration();
        
        if (result.success) {
            // Show success screen
            document.getElementById('buttonGroup').style.display = 'none';
            document.querySelector('.step-indicator').style.display = 'none';
            document.querySelector('.progress-bar').style.display = 'none';
            document.querySelectorAll('.step').forEach(s => s.style.display = 'none');
            document.getElementById('success').style.display = 'block';
            
            console.log('Business registration completed successfully!');
        }
    } catch (error) {
        console.error('Registration failed:', error);
        // Form stays on current step for user to correct errors
    }
};

// Optional: Save data at each step
window.saveStepData = async function(stepNumber) {
    await businessRegistration.saveProgressiveData(stepNumber);
};

// Export for global access
window.businessRegistration = businessRegistration;

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

console.log('Business registration handler loaded successfully');