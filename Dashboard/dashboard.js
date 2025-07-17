// Business Dashboard Manager - Simplified for Business Name Display
class BusinessDashboardManager {
    constructor() {
        this.currentUser = null;
        this.currentBusiness = null;
        this.businessId = null;
        this.isInitialized = false;
        
        // Configuration
        this.config = {
            redirectOnNoUser: true,
            redirectOnNoBusiness: true,
            loginUrl: '../Login/',
            businessSetupUrl: 'index.html',
            retryAttempts: 3,
            retryDelay: 1000
        };
        
        this.init();
    }

    // Initialize the dashboard manager
    async init() {
        try {
            console.log('Initializing Business Dashboard Manager...');
            
            // Check if supabaseClient is available
            if (typeof supabaseClient === 'undefined') {
                throw new Error('Supabase client not found. Make sure it is loaded before this script.');
            }

            // Load user and business data
            await this.loadUserAndBusiness();
            
            this.isInitialized = true;
            console.log('Business Dashboard Manager initialized successfully');
            
        } catch (error) {
            console.error('Error initializing dashboard manager:', error);
            this.handleInitializationError(error);
        }
    }

    // Load current user and associated business
    async loadUserAndBusiness() {
        try {
            console.log('Loading user and business data...');
            
            // Get current user session
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
            
            if (userError) {
                throw new Error(`Failed to get user: ${userError.message}`);
            }

            if (!user) {
                console.log('No authenticated user found');
                if (this.config.redirectOnNoUser) {
                    this.redirectToLogin();
                    return;
                }
                throw new Error('No authenticated user');
            }

            this.currentUser = user;
            console.log('User loaded successfully:', user.id);

            // Get user's business
            await this.loadBusinessData(user.id);
            
        } catch (error) {
            console.error('Error loading user and business:', error);
            throw error;
        }
    }

    // Load business data for the current user
    async loadBusinessData(userId) {
        try {
            console.log('Loading business data for user:', userId);

            // 1. Try to find business where user is the owner
            let { data: business, error: businessError } = await supabaseClient
                .from('bussiness')
                .select('id, company_name, user_id, staff_emails')
                .eq('user_id', userId)
                .maybeSingle();

            // 2. If not found, try to find business where user is staff (staff_emails contains userEmail)
            if (!business) {
                // Get user email (from this.currentUser)
                const userEmail = this.currentUser?.email;
                let { data: staffBusinesses, error: staffError } = await supabaseClient
                    .from('bussiness')
                    .select('id, company_name, user_id, staff_emails')
                    .contains('staff_emails', [userEmail]);

                // Fallback: If contains fails, check manually
                if (staffError) {
                    const { data: allBusinesses, error: allError } = await supabaseClient
                        .from('bussiness')
                        .select('id, company_name, user_id, staff_emails');
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
                if (this.config.redirectOnNoBusiness) {
                    this.redirectToBusinessSetup();
                    return;
                }
                throw new Error('No business found for user');
            }

            this.currentBusiness = business;
            this.businessId = business.id;

            // Store business_id in memory (global variable)
            window.currentBusinessId = this.businessId;

            console.log('Business loaded successfully:', {
                id: this.businessId,
                name: this.currentBusiness.company_name || 'Unknown Business'
            });

            // Update UI with business info
            this.updateBusinessUI();

        } catch (error) {
            console.error('Error loading business data:', error);
            throw error;
        }
    }

    // Update UI with business information
    updateBusinessUI() {
        try {
            // Update business name in the specific div
            const businessNameDiv = document.querySelector('.bussiness-name p');
            if (businessNameDiv) {
                businessNameDiv.textContent = this.currentBusiness.company_name || 'My Business';
            }

            // Also update any other business name elements
            const businessNameElements = document.querySelectorAll('.business-name, .company-name');
            businessNameElements.forEach(element => {
                element.textContent = this.currentBusiness.company_name || 'My Business';
            });

            // Update user info if elements exist
            const userInfoElements = document.querySelectorAll('.user-name, .username');
            userInfoElements.forEach(element => {
                element.textContent = this.currentUser.user_metadata?.full_name || 
                                    this.currentUser.email || 
                                    'User';
            });

            console.log('Business UI updated successfully with company name:', this.currentBusiness.company_name);
            
        } catch (error) {
            console.error('Error updating business UI:', error);
        }
    }

    // Get current business details
    getCurrentBusiness() {
        return {
            id: this.businessId,
            data: this.currentBusiness,
            user: this.currentUser
        };
    }

    // Get business-specific data with proper filtering
    async getBusinessData(table, columns = '*', additionalFilters = {}) {
        try {
            if (!this.businessId) {
                throw new Error('Business ID not available');
            }

            let query = supabaseClient
                .from(table)
                .select(columns)
                .eq('business_id', this.businessId);

            // Apply additional filters
            Object.entries(additionalFilters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });

            const { data, error } = await query;

            if (error) {
                throw new Error(`Failed to fetch ${table}: ${error.message}`);
            }

            return data;
            
        } catch (error) {
            console.error(`Error fetching business data from ${table}:`, error);
            throw error;
        }
    }

    // Update business settings
    async updateBusinessSettings(updates) {
        try {
            if (!this.businessId) {
                throw new Error('Business ID not available');
            }

            const { data, error } = await supabaseClient
                .from('businesses')
                .update(updates)
                .eq('id', this.businessId)
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to update business: ${error.message}`);
            }

            this.currentBusiness = data;
            this.updateBusinessUI();
            
            this.showSuccess('Business settings updated successfully');
            return data;
            
        } catch (error) {
            console.error('Error updating business settings:', error);
            this.showError('Failed to update business settings');
            throw error;
        }
    }

    // Refresh dashboard data
    async refreshDashboard() {
        try {
            console.log('Refreshing dashboard data...');
            
            // Reload user and business data
            await this.loadUserAndBusiness();
            
            this.showSuccess('Dashboard refreshed successfully');
            
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            this.showError('Failed to refresh dashboard');
        }
    }

    // Handle initialization errors
    handleInitializationError(error) {
        console.error('Dashboard initialization failed:', error);
        
        // Show error message to user
        this.showError('Failed to initialize dashboard. Please refresh the page.');
        
        // Try to redirect to appropriate page based on error
        if (error.message.includes('No authenticated user')) {
            this.redirectToLogin();
        } else if (error.message.includes('No business found')) {
            this.redirectToBusinessSetup();
        }
    }

    // Redirect to login page
    redirectToLogin() {
        console.log('Redirecting to login...');
        setTimeout(() => {
            window.location.href = this.config.loginUrl;
        }, 2000);
    }

    // Redirect to business setup page
    redirectToBusinessSetup() {
        console.log('Redirecting to business setup...');
        setTimeout(() => {
            window.location.href = this.config.businessSetupUrl;
        }, 2000);
    }

    // Logout user
    async logout() {
        try {
            console.log('Logging out user...');
            
            const { error } = await supabaseClient.auth.signOut();
            
            if (error) {
                throw new Error(`Logout failed: ${error.message}`);
            }

            // Clear stored data
            this.currentUser = null;
            this.currentBusiness = null;
            this.businessId = null;
            window.currentBusinessId = null;

            this.showSuccess('Logged out successfully');
            
            // Redirect to login
            setTimeout(() => {
                window.location.href = this.config.loginUrl;
            }, 1000);
            
        } catch (error) {
            console.error('Error during logout:', error);
            this.showError('Logout failed');
        }
    }

    // Show success message
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    // Show error message
    showError(message) {
        this.showMessage(message, 'error');
    }

    // Show message utility
    showMessage(message, type = 'info') {
        const existingMsg = document.getElementById('dashboard-message');
        if (existingMsg) existingMsg.remove();
        
        const msgElement = document.createElement('div');
        msgElement.id = 'dashboard-message';
        msgElement.textContent = message;
        msgElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 350px;
            word-wrap: break-word;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            animation: slideInFadeOut 5s forwards;
        `;
        
        document.body.appendChild(msgElement);
        
        setTimeout(() => {
            if (msgElement.parentNode) {
                msgElement.parentNode.removeChild(msgElement);
            }
        }, 5000);
    }

    // Get dashboard health status
    getHealthStatus() {
        return {
            isInitialized: this.isInitialized,
            hasUser: !!this.currentUser,
            hasBusiness: !!this.currentBusiness,
            businessId: this.businessId,
            companyName: this.currentBusiness?.company_name || 'Not loaded'
        };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Initializing Business Dashboard...');
        
        // Initialize the business dashboard manager
        const businessDashboard = new BusinessDashboardManager();
        
        // Wait for initialization to complete
        let attempts = 0;
        const maxAttempts = 10;
        
        const waitForInitialization = () => {
            return new Promise((resolve) => {
                const checkInitialization = () => {
                    if (businessDashboard.isInitialized && window.currentBusinessId) {
                        resolve();
                    } else if (attempts < maxAttempts) {
                        attempts++;
                        setTimeout(checkInitialization, 500);
                    } else {
                        console.error('Dashboard initialization timeout');
                        resolve();
                    }
                };
                checkInitialization();
            });
        };
        
        await waitForInitialization();
        
        // Add message animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInFadeOut {
                0% { 
                    opacity: 0; 
                    transform: translateX(100%); 
                }
                10% { 
                    opacity: 1; 
                    transform: translateX(0); 
                }
                90% { 
                    opacity: 1; 
                    transform: translateX(0); 
                }
                100% { 
                    opacity: 0; 
                    transform: translateX(100%); 
                }
            }
            
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                font-family: Arial, sans-serif;
            }
            
            .loading-spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 2s linear infinite;
                margin-right: 20px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        console.log('Business Dashboard initialized successfully');
        
    } catch (error) {
        console.error('Error initializing business dashboard:', error);
    }
});

// Global utility functions
window.getDashboardHealth = () => window.businessDashboard?.getHealthStatus();
window.refreshDashboard = () => window.businessDashboard?.refreshDashboard();
window.getCurrentBusiness = () => window.businessDashboard?.getCurrentBusiness();
window.getBusinessData = (table, columns, filters) => window.businessDashboard?.getBusinessData(table, columns, filters);
window.updateBusinessSettings = (updates) => window.businessDashboard?.updateBusinessSettings(updates);
window.logout = () => window.businessDashboard?.logout();

// Console helpers for debugging
window.logDashboardStatus = () => {
    const health = window.getDashboardHealth();
    console.log('Dashboard Health Status:', health);
};

window.logBusinessInfo = () => {
    const business = window.getCurrentBusiness();
    console.log('Current Business Info:', business);
};

console.log('Business Dashboard Manager loaded successfully');

// Add this at the end of your file or inside DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Find the logout button by its class and id
    const logoutBtn = document.querySelector('.home.logout#below');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            // Optional: Confirm logout
            if (confirm('Are you sure you want to logout?')) {
                try {
                    // Use your dashboard manager's logout if available
                    if (window.businessDashboard && typeof window.businessDashboard.logout === 'function') {
                        await window.businessDashboard.logout();
                    } else if (typeof supabaseClient !== 'undefined') {
                        await supabaseClient.auth.signOut();
                        window.location.href = '../Login/';
                    } else {
                        window.location.href = '../Login/';
                    }
                } catch (error) {
                    alert('Logout failed. Please try again.');
                }
            }
        });
    }
});