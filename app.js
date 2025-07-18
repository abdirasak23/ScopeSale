// Authentication and redirect functionality with Supabase integration
class AuthManager {
    constructor() {
        this.supabase = null;
        this.initSupabase();
        this.init();
    }

    initSupabase() {
        // Initialize Supabase with your existing configuration
        if (window.supabase) {
            const SUPABASE_URL = 'https://jvcrkjkhmglgrwkadzxw.supabase.co';
            const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y3JramtobWdsZ3J3a2Fkenh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTQwOTgsImV4cCI6MjA2NzI3MDA5OH0.4uGTPJg2Nbl8QvGy6UhlBJlJ4lUtMl9f6vTJ_jf8z3o';
            this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
    }

    init() {
        // Wait for DOM to be fully loaded
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEventListeners();
            this.checkAuthStatus();
        });
    }

    setupEventListeners() {
        // Get Started button in hero section
        const getStartedBtn = document.querySelector('.get-started');
        if (getStartedBtn) {
            getStartedBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleGetStartedClick();
            });
        }

        // Get Started button in next-main section
        const startBtn = document.querySelector('.Start');
        if (startBtn) {
            startBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleGetStartedClick();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }

    // Check if user is authenticated using Supabase
    async isAuthenticated() {
        if (!this.supabase) {
            return this.isAuthenticatedFallback();
        }
        
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            return !!(session && session.user);
        } catch (error) {
            console.error('Error checking authentication:', error);
            return this.isAuthenticatedFallback();
        }
    }

    // Fallback authentication check (for when Supabase is not available)
    isAuthenticatedFallback() {
        const token = localStorage.getItem('authToken') || 
                     sessionStorage.getItem('authToken') || 
                     this.getCookie('authToken');
        
        const userId = localStorage.getItem('userId') || 
                      sessionStorage.getItem('userId') || 
                      this.getCookie('userId');
        
        const userSession = localStorage.getItem('userSession') || 
                           sessionStorage.getItem('userSession');

        return !!(token || userId || userSession);
    }

    // Check if user is registered using Supabase
    async isRegistered() {
        if (!this.supabase) {
            return this.isRegisteredFallback();
        }

        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            if (error) {
                console.error('Error checking session:', error);
                return this.isRegisteredFallback();
            }
            
            // If there's a session, user is registered
            if (session && session.user) {
                return true;
            }
            
            // Check if user exists in users table by email (if stored locally)
            const userEmail = localStorage.getItem('userEmail') || 
                             sessionStorage.getItem('userEmail');
            
            if (userEmail) {
                const { data, error: userError } = await this.supabase
                    .from('users')
                    .select('id')
                    .eq('email', userEmail)
                    .single();
                
                return !!(data && !userError);
            }
            
            return false;
        } catch (error) {
            console.error('Error checking registration:', error);
            return this.isRegisteredFallback();
        }
    }

    // Fallback registration check
    isRegisteredFallback() {
        const userEmail = localStorage.getItem('userEmail') || 
                         sessionStorage.getItem('userEmail') || 
                         this.getCookie('userEmail');
        
        const registrationData = localStorage.getItem('registrationData') || 
                                sessionStorage.getItem('registrationData');

        return !!(userEmail || registrationData);
    }

    // Handle Get Started button click
    async handleGetStartedClick() {
        try {
            const isAuth = await this.isAuthenticated();
            
            if (isAuth) {
                // User is authenticated, redirect to dashboard
                this.redirectTo('Dashboard/');
            } else {
                const isReg = await this.isRegistered();
                
                if (isReg) {
                    // User is registered but not authenticated, redirect to login
                    this.redirectTo('Login/');
                } else {
                    // User is not registered, redirect to registration
                    this.redirectTo('Register/');
                }
            }
        } catch (error) {
            console.error('Error in handleGetStartedClick:', error);
            // Fallback to registration page
            this.redirectTo('Register/');
        }
    }

    // Handle logout
    async handleLogout() {
        try {
            // Sign out from Supabase
            if (this.supabase) {
                const { error } = await this.supabase.auth.signOut();
                if (error) {
                    console.error('Error signing out from Supabase:', error);
                }
            }
            
            // Clear all authentication data
            this.clearAuthData();
            
            // Redirect to home page
            this.redirectTo('/');
            
            // Show logout message
            this.showMessage('You have been logged out successfully', 'success');
        } catch (error) {
            console.error('Error during logout:', error);
            // Still clear local data and redirect
            this.clearAuthData();
            this.redirectTo('/');
        }
    }

    // Clear authentication data
    clearAuthData() {
        // Clear localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userSession');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('registrationData');
        localStorage.removeItem('redirectAfterLogin');
        
        // Clear sessionStorage
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('userSession');
        sessionStorage.removeItem('userEmail');
        sessionStorage.removeItem('registrationData');
        sessionStorage.removeItem('redirectAfterLogin');
        
        // Clear cookies
        this.deleteCookie('authToken');
        this.deleteCookie('userId');
        this.deleteCookie('userEmail');
    }

    // Check authentication status and update UI
    async checkAuthStatus() {
        try {
            const logoutBtn = document.getElementById('logout-btn');
            const isAuth = await this.isAuthenticated();
            
            if (isAuth) {
                // User is authenticated, show logout button
                if (logoutBtn) {
                    logoutBtn.style.display = 'block';
                }
            } else {
                // User is not authenticated, hide logout button
                if (logoutBtn) {
                    logoutBtn.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            // Hide logout button on error
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.style.display = 'none';
            }
        }
    }

    // Redirect function
    redirectTo(url) {
        // You can customize this based on your routing system
        window.location.href = url;
    }

    // Cookie helper functions
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    deleteCookie(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }

    // Show message to user (optional)
    showMessage(message, type = 'info') {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 5px;
            color: white;
            z-index: 1000;
            ${type === 'success' ? 'background-color: #28a745;' : 'background-color: #17a2b8;'}
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// For Supabase integration (if you're using Supabase)
class SupabaseAuthManager extends AuthManager {
    constructor(supabaseClient) {
        super();
        this.supabase = supabaseClient;
    }

    async isAuthenticated() {
        if (!this.supabase) return super.isAuthenticated();
        
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            return !!user;
        } catch (error) {
            console.error('Error checking authentication:', error);
            return super.isAuthenticated();
        }
    }

    async handleLogout() {
        if (this.supabase) {
            try {
                await this.supabase.auth.signOut();
            } catch (error) {
                console.error('Error signing out:', error);
            }
        }
        
        // Call parent logout method
        super.handleLogout();
    }
}

// Initialize the authentication manager
// For basic version (without Supabase)
const authManager = new AuthManager();

// For Supabase version (uncomment if you're using Supabase)
/*
// Make sure to initialize Supabase client first
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Use Supabase auth manager
const authManager = new SupabaseAuthManager(supabase);
*/

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, SupabaseAuthManager };
}




// Smooth scroll navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get all navigation links
    const navLinks = document.querySelectorAll('.navs ul a');
    // Add click event listeners to navigation links
    navLinks.forEach(link => {
        const linkText = link.querySelector('li') ? link.querySelector('li').textContent.trim().toLowerCase() : '';
        // Only apply smooth scroll for Home, Features, About Us
        if (['home', 'features', 'about us'].includes(linkText)) {
            link.addEventListener('click', function(e) {
                e.preventDefault(); // Prevent default anchor behavior
                let targetSection = null;
                switch(linkText) {
                    case 'home':
                        targetSection = document.querySelector('.main');
                        break;
                    case 'features':
                        targetSection = document.querySelector('.features');
                        break;
                    case 'about us':
                        targetSection = document.querySelector('.about');
                        break;
                }
                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        }
        // Do NOT override Contact Us link, let it work as a normal link
    });

    // Also handle the separate Contact Us <li> if it's not inside <a>
    const contactLi = Array.from(document.querySelectorAll('.navs ul li')).find(li => 
        li.textContent.trim().toLowerCase() === 'contact us'
    );
    if (contactLi && contactLi.querySelector('a')) {
        // Let the <a href="Contacts/">Contact Us</a> work normally, no smooth scroll
        contactLi.querySelector('a').addEventListener('click', function(e) {
            // No preventDefault, allow normal navigation
        });
    }

    // Optional: Add active navigation highlighting based on scroll position
    function updateActiveNavigation() {
        const sections = [
            { element: document.querySelector('.main'), navText: 'home' },
            { element: document.querySelector('.features'), navText: 'features' },
            { element: document.querySelector('.about'), navText: 'about us' },
            // { element: document.querySelector('.footer'), navText: 'contact us' }
        ];
        
        const scrollPosition = window.scrollY + 100; // Offset for better detection
        
        sections.forEach(section => {
            if (section.element) {
                const sectionTop = section.element.offsetTop;
                const sectionHeight = section.element.offsetHeight;
                
                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    // Remove active class from all nav links
                    navLinks.forEach(link => link.classList.remove('active'));
                    
                    // Add active class to current section's nav link
                    const activeLink = Array.from(navLinks).find(link => 
                        link.querySelector('li').textContent.trim().toLowerCase() === section.navText
                    );
                    if (activeLink) {
                        activeLink.classList.add('active');
                    }
                }
            }
        });
    }
    
    // Listen for scroll events to update active navigation
    window.addEventListener('scroll', updateActiveNavigation);
    
    // Initial call to set active navigation on page load
    updateActiveNavigation();
    
    // Also add smooth scroll to the "Get Started" and "Learn More" buttons
    const getStartedBtns = document.querySelectorAll('.Start, .get-started');
    getStartedBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // If it's not already redirecting to Register page
            if (!this.onclick) {
                e.preventDefault();
                // You can customize where these buttons should scroll to
                // For example, scroll to features section
                const featuresSection = document.querySelector('.features');
                if (featuresSection) {
                    featuresSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
    
    // Add smooth scroll to "Learn More" buttons in features
    const learnMoreBtns = document.querySelectorAll('.learn');
    learnMoreBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const aboutSection = document.querySelector('.about');
            if (aboutSection) {
                aboutSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Optional: Add CSS for smooth scrolling fallback
const style = document.createElement('style');
style.textContent = `
    html {
        scroll-behavior: smooth;
    }
    
    .navs ul a.active {
        color: #007bff; /* Change this to your preferred active color */
        font-weight: bold;
    }
    
    .navs ul a.active li {
        color: inherit;
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', async () => {
    // Show/hide Dashboard button based on authentication status
    const dashboardBtn = document.querySelector('.dashboard-sec');
    let isLoggedIn = false;

    // Use Supabase if available
    if (window.supabase) {
        const SUPABASE_URL = 'https://jvcrkjkhmglgrwkadzxw.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y3JramtobWdsZ3J3a2Fkenh3Iiwicm9zZSI6ImFub24iLCJpYXQiOjE3NTE2OTQwOTgsImV4cCI6MjA2NzI3MDA5OH0.4uGTPJg2Nbl8QvGy6UhlBJlJ4lUtMl9f6vTJ_jf8z3o';
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            isLoggedIn = !!(session && session.user);
        } catch (error) {
            isLoggedIn = false;
        }
    } else {
        // Fallback: check local/session storage
        isLoggedIn = !!(
            localStorage.getItem('authToken') ||
            sessionStorage.getItem('authToken') ||
            localStorage.getItem('userId') ||
            sessionStorage.getItem('userId')
        );
    }

    if (dashboardBtn) {
        dashboardBtn.style.display = isLoggedIn ? 'inline-block' : 'none';
    }
});