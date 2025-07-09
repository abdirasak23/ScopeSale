// Ensure Supabase is available globally
if (!window.supabase) {
    console.error("Supabase SDK not loaded. Check the CDN link.");
}

// Initialize Supabase client
const SUPABASE_URL = 'https://jvcrkjkhmglgrwkadzxw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y3JramtobWdsZ3J3a2Fkenh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTQwOTgsImV4cCI6MjA2NzI3MDA5OH0.4uGTPJg2Nbl8QvGy6UhlBJlJ4lUtMl9f6vTJ_jf8z3o';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Displays a custom alert in the alert container.
 * @param {string} message - The message to display.
 * @param {string} type - The alert type, either "success" or "error".
 */
function showAlert(message, type) {
  const alertContainer = document.querySelector('.alert');
  if (!alertContainer) return;
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
  // You can implement a loader here if needed
  console.log(show ? 'Showing loader...' : 'Hiding loader...');
  // Optional: Add visual loader to the page
  // const loader = document.querySelector('.loader');
  // if (loader) loader.style.display = show ? 'block' : 'none';
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

document.addEventListener("DOMContentLoaded", () => {
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
  registerButton.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

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

    // Password strength validation (optional)
    if (password.length < 6) {
      showAlert("Password must be at least 6 characters long.", "error");
      return;
    }

    try {
      // Register the user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        showAlert(`Error: ${error.message}`, "error");
        return;
      }
      
      // Attempt to get the user ID immediately from signUp response.
      let userId = data && data.user ? data.user.id : null;
      
      // Function to insert user data into the users table
      const insertUserData = async (id) => {
        const { error: insertError } = await supabase
          .from('users')
          .insert([{ 
            id: id, 
            email: email,
            username: username,
            provider: 'email',
            created_at: new Date().toISOString()
          }]);
        
        if (insertError) {
          console.error("Error inserting user into users table:", insertError);
          showAlert(`Error saving user data: ${insertError.message}`, "error");
          return false;
        } else {
          console.log("User data saved successfully in users table");
          return true;
        }
      };
      
      // If user ID isn't immediately available (common when email confirmation is enabled)
      if (!userId) {
        // Listen for auth state changes to retrieve the user info when available.
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session && session.user) {
            const newUserId = session.user.id;
            const success = await insertUserData(newUserId);
            if (success) {
              // Unsubscribe from auth state changes
              authListener?.subscription?.unsubscribe();
            }
          }
        });
      } else {
        // If user ID is immediately available, insert directly into the "users" table
        await insertUserData(userId);
      }
      
      showAlert("Registration successful! Check your email to confirm your account.", "success");
      
      // Clear form fields
      usernameInput.value = '';
      emailInput.value = '';
      passwordInput.value = '';
      
      // Delay redirection to let the user see the success alert
      setTimeout(() => {
        window.location.href = "../Login/"; // Adjust path as needed
      }, 2000);
      
    } catch (err) {
      console.error("Unexpected error:", err);
      showAlert("Something went wrong. Please try again later.", "error");
    }
  });

  // Toggle password visibility on eye icon click
  if (togglePassword && eyeIcon) {
    togglePassword.addEventListener("click", () => {
      if (passwordInput.type === "password") {
        passwordInput.type = "text";
        eyeIcon.classList.remove("fa-eye");
        eyeIcon.classList.add("fa-eye-slash"); // Change icon when visible
      } else {
        passwordInput.type = "password";
        eyeIcon.classList.remove("fa-eye-slash");
        eyeIcon.classList.add("fa-eye"); // Change icon back when hidden
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
      await handleGoogleSignUp();
    });
  }

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
        // Supabase will redirect to auth-callback.html
        redirectTo: window.location.origin + '../Onboarding/'
      }
    });

    if (error) throw error;
    // The redirect happens automatically; no more code needed here.
  } catch (error) {
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
      console.error('Error getting session:', error);
      return;
    }

    // If there's a session and user, handle Google user data
    if (session && session.user) {
      // Check if this is a Google OAuth user
      const provider = session.user.app_metadata?.provider;
      if (provider === 'google') {
        await handleGoogleUserData(session.user);
      }
    }

    // Also listen for auth state changes (for real-time updates)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session && session.user) {
        const provider = session.user.app_metadata?.provider;
        if (provider === 'google') {
          await handleGoogleUserData(session.user);
        }
      }
    });
  } catch (error) {
    console.error('Error checking for Google OAuth return:', error);
  }
}

async function handleGoogleUserData(user) {
  try {
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
      // Create username from full name (remove spaces, convert to lowercase)
      username = fullName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    } else if (email) {
      // Create username from email (part before @)
      username = email.split('@')[0].replace(/[^a-z0-9]/g, '');
    }

    // Ensure username is not empty
    if (!username) {
      username = 'user' + Math.random().toString(36).substr(2, 9);
    }

    console.log('Processing Google user:', { userId, email, username, fullName });

    // Check if user already exists in the users table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new users
      console.error('Error checking existing user:', checkError);
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
          // full_name: fullName,
          // first_name: firstName,
          // last_name: lastName,
          // avatar_url: avatarUrl,
          provider: 'google',
          created_at: new Date().toISOString()
        }]);

      if (insertError) {
        console.error('Error inserting Google user into users table:', insertError);
        showAlert(`Error saving user data: ${insertError.message}`, 'error');
        return;
      } else {
        console.log('Google user data saved successfully in users table');
        showAlert('Google sign-up successful! Welcome!', 'success');
      }
    } else {
      console.log('User already exists in users table');
      showAlert('Google sign-in successful! Welcome back!', 'success');
    }

    // Optional: Redirect after successful Google authentication
    setTimeout(() => {
      const redirectPath = localStorage.getItem('redirectAfterLogin') || '../Login/';
      localStorage.removeItem('redirectAfterLogin');
      // Uncomment the line below if you want to redirect
      // window.location.href = redirectPath;
    }, 2000);

  } catch (error) {
    console.error('Error handling Google user data:', error);
    showAlert('Error processing Google sign-up. Please try again.', 'error');
  } finally {
    showLoader(false);
  }
}

const logoutBtn = document.getElementById('logout-btn');

logoutBtn.addEventListener('click', () => {
                logoutUser();
            });

            async function logoutUser() {
            try {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
                
                // Redirect to login page after logout
                window.location.href = '../Login/';
            } catch (error) {
                console.error('Error logging out:', error);
                showAlert('Failed to logout. Please try again.', 'error');
                modal.style.display = 'none';
            }
        }