// Ensure Supabase is available globally
if (!window.supabase) {
    console.error("Supabase SDK not loaded. Check the CDN link.");
}

// Initialize Supabase client
const SUPABASE_URL = 'https://jvcrkjkhmglgrwkadzxw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y3JramtobWdsZ3J3a2Fkenh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTQwOTgsImV4cCI6MjA2NzI3MDA5OH0.4uGTPJg2Nbl8QvGy6UhlBJlJ4lUtMl9f6vTJ_jf8z3o';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check authentication state on page load
async function checkAuthState() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Error getting session:', error);
            return null;
        }
        
        if (session && session.user) {
            console.log('User is logged in:', session.user.email);
            return session.user;
        } else {
            console.log('No active session');
            return null;
        }
    } catch (error) {
        console.error('Error checking auth state:', error);
        return null;
    }
}

// FIXED: Function to check if user email exists in business table staff_emails column
async function checkIfUserIsStaff(userEmail) {
    try {
        console.log('🔍 Checking if user email is in staff_emails column:', userEmail);
        
        // Method 1: Use contains operator for arrays
        const { data: containsData, error: containsError } = await supabase
            .from('bussiness')
            .select('*')
            .contains('staff_emails', [userEmail]);
        
        if (containsError) {
            console.error('❌ Error with contains query:', containsError);
            
            // Method 2: Fallback - Get all records and check manually
            console.log('🔄 Trying fallback method...');
            const { data: allData, error: allError } = await supabase
                .from('bussiness')
                .select('*');
            
            if (allError) {
                console.error('❌ Error with fallback query:', allError);
                return { isStaff: false, businessData: null };
            }
            
            // Check manually if email exists in any staff_emails array
            const matchingBusiness = allData.find(business => {
                if (business.staff_emails && Array.isArray(business.staff_emails)) {
                    return business.staff_emails.includes(userEmail);
                }
                return false;
            });
            
            if (matchingBusiness) {
                console.log('✅ User found in business table as staff (fallback method):', matchingBusiness);
                return { isStaff: true, businessData: matchingBusiness };
            } else {
                console.log('❌ User NOT found in business table staff_emails column (fallback method)');
                return { isStaff: false, businessData: null };
            }
        }
        
        console.log('📊 Business table query result (contains method):', containsData);
        
        // If data array has items, user is staff
        if (containsData && containsData.length > 0) {
            console.log('✅ User found in business table as staff:', containsData[0]);
            return { isStaff: true, businessData: containsData[0] };
        } else {
            console.log('❌ User NOT found in business table staff_emails column');
            return { isStaff: false, businessData: null };
        }
        
    } catch (error) {
        console.error('❌ Error in checkIfUserIsStaff function:', error);
        return { isStaff: false, businessData: null };
    }
}

// Function to handle user after successful registration/login
async function handleUserSession(user) {
    try {
        console.log('🔄 Handling user session for:', user.email);
        
        // Check if user is staff member FIRST
        const { isStaff, businessData } = await checkIfUserIsStaff(user.email);
        
        console.log('📊 Staff check result:', { isStaff, businessData });
        
        // Store user info in sessionStorage
        const userSession = {
            id: user.id,
            email: user.email,
            isLoggedIn: true,
            isStaff: isStaff
        };
        
        if (isStaff && businessData) {
            userSession.businessId = businessData.id;
            userSession.businessName = businessData.business_name;
            console.log('✅ User is staff member of:', businessData.business_name);
        } else {
            console.log('❌ User is regular user, not staff');
        }
        
        sessionStorage.setItem('currentUser', JSON.stringify(userSession));
        
        // Update UI to show user is logged in
        updateUIForLoggedInUser(user);
        
        return { success: true, isStaff, businessData };
    } catch (error) {
        console.error('❌ Error handling user session:', error);
        return { success: false, isStaff: false, businessData: null };
    }
}

// Function to update UI when user is logged in
function updateUIForLoggedInUser(user) {
    // Hide login/register forms if they exist
    const loginForm = document.querySelector('.login-form');
    const registerForm = document.querySelector('.register-form');
    
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
    
    // Show user info or dashboard
    const userInfo = document.querySelector('.user-info');
    if (userInfo) {
        userInfo.innerHTML = `
            <p>Welcome, ${user.email}!</p>
            <button id="logout-btn">Logout</button>
        `;
        userInfo.style.display = 'block';
    }
    
    // Add logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }
}

// ENHANCED: Function to redirect user based on staff status
function redirectUserBasedOnStatus(isStaff, businessData, userEmail) {
    console.log('🔄 Redirecting user based on status:', { isStaff, businessData, userEmail });
    
    if (isStaff && businessData) {
        console.log('🔄 Redirecting STAFF member to dashboard');
        showAlert(`Welcome staff member of ${businessData.business_name}! Redirecting to dashboard...`, "success");
        setTimeout(() => {
            window.location.href = "../dashboard/";
        }, 2000);
    } else {
        console.log('🔄 Redirecting REGULAR user to onboarding');
        showAlert("Registration successful! Redirecting to onboarding...", "success");
        setTimeout(() => {
            window.location.href = "../Onboarding/";
        }, 2000);
    }
}

/**
 * Displays a custom alert in the alert container.
 * @param {string} message - The message to display.
 * @param {string} type - The alert type, either "success" or "error".
 */
function showAlert(message, type) {
    const alertContainer = document.querySelector('.alert');
    if (!alertContainer) {
        console.log('Alert container not found, creating console message:', message);
        return;
    }
    
    const alertMessage = alertContainer.querySelector('p');
    if (alertMessage) alertMessage.textContent = message;
    
    // Set background color based on the alert type
    if (type === 'success') {
        alertContainer.style.backgroundColor = 'green';
    } else if (type === 'error') {
        alertContainer.style.backgroundColor = 'red';
    } else {
        alertContainer.style.backgroundColor = '';
    }
    
    // Display the alert container
    alertContainer.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        alertContainer.style.display = 'none';
    }, 5000);
}

// Helper functions for Google OAuth
function showLoader(show) {
    console.log(show ? 'Showing loader...' : 'Hiding loader...');
    const loader = document.querySelector('.loader');
    if (loader) loader.style.display = show ? 'block' : 'none';
}

function hideError() {
    const alertContainer = document.querySelector('.alert');
    if (alertContainer) {
        alertContainer.style.display = 'none';
    }
}

function hideSuccess() {
    const alertContainer = document.querySelector('.alert');
    if (alertContainer) {
        alertContainer.style.display = 'none';
    }
}

function showError(message) {
    showAlert(message, 'error');
}

document.addEventListener("DOMContentLoaded", async () => {
    console.log('🚀 DOM Content Loaded - Registration page initialized');
    
    // Check if user is already logged in
    const currentUser = await checkAuthState();
    if (currentUser) {
        console.log('User already logged in, handling session...');
        const sessionResult = await handleUserSession(currentUser);
        if (sessionResult.success) {
            console.log('Session handled successfully for existing user');
        }
    }
    
    // Registration elements
    const registerButton = document.getElementById("register-btn");
    const usernameInput = document.getElementById("username");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const googleButton = document.querySelector('.btn-google');
    
    // Toggle password elements
    const togglePassword = document.getElementById("toggle-password");
    const eyeIcon = togglePassword ? togglePassword.querySelector("i") : null;
    
    // Close alert button functionality
    const alertCloseButton = document.querySelector('.alert button');
    if (alertCloseButton) {
        alertCloseButton.addEventListener('click', () => {
            const alertContainer = document.querySelector('.alert');
            if (alertContainer) {
                alertContainer.style.display = 'none';
            }
        });
    }
    
    // Register user on button click
    if (registerButton) {
        registerButton.addEventListener("click", async () => {
            console.log('🔄 Registration button clicked');
            
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            console.log('Registration data:', { username, email, password: '***' });

            // Validation
            if (!username || !email || !password) {
                showAlert("Please fill in all fields (username, email, and password).", "error");
                return;
            }

            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showAlert("Please enter a valid email address.", "error");
                return;
            }

            // Password strength validation
            if (password.length < 6) {
                showAlert("Password must be at least 6 characters long.", "error");
                return;
            }

            try {
                console.log('🔄 Attempting to register user with Supabase...');
                
                // CRITICAL: Check staff status BEFORE registration
                console.log('🔍 Pre-registration staff check for email:', email);
                const preStaffCheck = await checkIfUserIsStaff(email);
                console.log('📊 Pre-registration staff check result:', preStaffCheck);
                
                // Register the user with Supabase Auth
                const { data, error } = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: {
                        data: {
                            username: username
                        }
                    }
                });
                
                if (error) {
                    console.error('❌ Registration error:', error);
                    showAlert(`Error: ${error.message}`, "error");
                    return;
                }
                
                console.log('📊 Registration response:', data);
                
                // Check if email confirmation is required
                if (data.user && !data.session) {
                    console.log('📧 Email confirmation required');
                    showAlert("Registration successful! Please check your email to confirm your account before logging in.", "success");
                    
                    // Clear form fields
                    usernameInput.value = '';
                    emailInput.value = '';
                    passwordInput.value = '';
                    
                    // For email confirmation, we still need to check staff status and redirect accordingly
                    setTimeout(() => {
                        if (preStaffCheck.isStaff && preStaffCheck.businessData) {
                            console.log('🔄 Email confirmation required but user is staff - redirecting to dashboard');
                            window.location.href = "../dashboard/";
                        } else {
                            console.log('🔄 Email confirmation required for regular user - redirecting to onboarding');
                            window.location.href = "../Onboarding/";
                        }
                    }, 3000);
                    return;
                }
                
                // If user is immediately logged in (no email confirmation required)
                if (data.user && data.session) {
                    console.log('✅ User registered and logged in immediately');
                    
                    // Insert user data into the users table
                    const { error: insertError } = await supabase
                        .from('users')
                        .insert([{ 
                            id: data.user.id, 
                            email: email,
                            username: username,
                            provider: 'email',
                            created_at: new Date().toISOString()
                        }]);
                    
                    if (insertError && insertError.code !== '23505') {
                        console.error("❌ Error inserting user into users table:", insertError);
                        showAlert(`Error saving user data: ${insertError.message}`, "error");
                        return;
                    }
                    
                    console.log("✅ User data inserted into users table");
                    
                    // Clear form fields
                    usernameInput.value = '';
                    emailInput.value = '';
                    passwordInput.value = '';
                    
                    // CRITICAL: Check staff status AGAIN after successful registration
                    console.log('🔍 Post-registration staff check for email:', email);
                    const postStaffCheck = await checkIfUserIsStaff(email);
                    console.log('📊 Post-registration staff check result:', postStaffCheck);
                    
                    // Handle the user session
                    const sessionResult = await handleUserSession(data.user);
                    console.log('📊 Session result:', sessionResult);
                    
                    if (sessionResult.success) {
                        // Redirect based on staff status
                        redirectUserBasedOnStatus(postStaffCheck.isStaff, postStaffCheck.businessData, email);
                    } else {
                        showAlert("Registration successful but there was an issue with session handling.", "error");
                    }
                }
                
            } catch (err) {
                console.error("❌ Unexpected registration error:", err);
                showAlert("Something went wrong. Please try again later.", "error");
            }
        });
    }

    // Toggle password visibility on eye icon click
    if (togglePassword && eyeIcon) {
        togglePassword.addEventListener("click", () => {
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                eyeIcon.classList.remove("fa-eye");
                eyeIcon.classList.add("fa-eye-slash");
            } else {
                passwordInput.type = "password";
                eyeIcon.classList.remove("fa-eye-slash");
                eyeIcon.classList.add("fa-eye");
            }
        });
    }

    // Allow Enter key to trigger registration
    [usernameInput, emailInput, passwordInput].forEach(input => {
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    registerButton.click();
                }
            });
        }
    });

    // Google Sign-Up button functionality
    if (googleButton) {
        googleButton.addEventListener('click', async () => {
            console.log('🔄 Google sign-up button clicked');
            await handleGoogleSignUp();
        });
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session && session.user) {
            console.log('✅ User signed in via auth state change');
            
            // Handle Google OAuth users
            const provider = session.user.app_metadata?.provider;
            if (provider === 'google') {
                console.log('📱 Handling Google OAuth user');
                await handleGoogleUserData(session.user);
            }
        } else if (event === 'SIGNED_OUT') {
            console.log('👋 User signed out');
            // Clear user session
            sessionStorage.removeItem('currentUser');
            
            // Redirect to login page
            window.location.href = '../Onboarding/';
        }
    });

    // Check for returning Google OAuth users on page load
    checkForGoogleOAuthReturn();
});

async function handleGoogleSignUp() {
    try {
        showLoader(true);
        hideError();
        hideSuccess();

        // Save the current page (so we can return here after OAuth)
        const lastPage = window.location.pathname + window.location.search;
        localStorage.setItem('redirectAfterLogin', lastPage);

        // Kick off Supabase Google OAuth
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/auth-callback.html'
            }
        });

        if (error) throw error;
        // The redirect happens automatically; no more code needed here.
    } catch (error) {
        console.error('❌ Google sign-up error:', error);
        showError(error.message || 'Google sign-up failed. Please try again.');
        showLoader(false);
    }
}

// Check for Google OAuth return and handle user data
async function checkForGoogleOAuthReturn() {
    try {
        // Get the current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('❌ Error getting session:', error);
            return;
        }

        // If there's a session and user, handle Google user data
        if (session && session.user) {
            const provider = session.user.app_metadata?.provider;
            if (provider === 'google') {
                console.log('🔄 Detected Google OAuth return');
                await handleGoogleUserData(session.user);
            }
        }
    } catch (error) {
        console.error('❌ Error checking for Google OAuth return:', error);
    }
}

async function handleGoogleUserData(user) {
    try {
        console.log('🔄 Handling Google user data:', user.email);
        
        // Extract user information from Google OAuth
        const userId = user.id;
        const email = user.email;
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        const firstName = user.user_metadata?.given_name || '';
        const lastName = user.user_metadata?.family_name || '';
        const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
        
        // Generate username from email or full name
        let username = '';
        if (fullName) {
            username = fullName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        } else if (email) {
            username = email.split('@')[0].replace(/[^a-z0-9]/g, '');
        }

        // Ensure username is not empty
        if (!username) {
            username = 'user' + Math.random().toString(36).substr(2, 9);
        }

        console.log('📊 Processing Google user:', { userId, email, username, fullName });

        // Check if user already exists in the users table
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('❌ Error checking existing user:', checkError);
            return;
        }

        // If user doesn't exist, insert new user data
        if (!existingUser) {
            const { error: insertError } = await supabase
                .from('users')
                .insert([{
                    id: userId,
                    email: email,
                    username: username,
                    provider: 'google',
                    created_at: new Date().toISOString()
                }]);

            if (insertError) {
                console.error('❌ Error inserting Google user into users table:', insertError);
                showAlert(`Error saving user data: ${insertError.message}`, 'error');
                return;
            } else {
                console.log('✅ Google user data saved successfully in users table');
            }
        } else {
            console.log('✅ Google user already exists in users table');
        }

        // CRITICAL: Check staff status for Google user
        console.log('🔍 Checking staff status for Google user:', email);
        const staffCheck = await checkIfUserIsStaff(email);
        console.log('📊 Google user staff check result:', staffCheck);

        // Handle the user session
        const sessionResult = await handleUserSession(user);
        console.log('📊 Google user session result:', sessionResult);

        if (sessionResult.success) {
            // Redirect based on staff status
            redirectUserBasedOnStatus(staffCheck.isStaff, staffCheck.businessData, email);
        } else {
            showAlert('Google sign-up completed but there was an issue with session handling.', 'error');
        }

    } catch (error) {
        console.error('❌ Error handling Google user data:', error);
        showAlert('Error processing Google sign-up. Please try again.', 'error');
    } finally {
        showLoader(false);
    }
}

async function logoutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Clear session storage
        sessionStorage.removeItem('currentUser');
        
        // Redirect to login page after logout
        window.location.href = '../Onboarding/';
    } catch (error) {
        console.error('❌ Error logging out:', error);
        showAlert('Failed to logout. Please try again.', 'error');
    }
}

// Utility function to check if user is logged in (can be used on any page)
function isUserLoggedIn() {
    const userSession = sessionStorage.getItem('currentUser');
    return userSession ? JSON.parse(userSession) : null;
}

// Export functions for use in other files
window.authUtils = {
    checkAuthState,
    handleUserSession,
    isUserLoggedIn,
    logoutUser,
    checkIfUserIsStaff
};