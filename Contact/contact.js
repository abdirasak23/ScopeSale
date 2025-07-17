// Method 1: Using EmailJS (Recommended for client-side)
// First, include EmailJS in your HTML: <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>

// Initialize EmailJS (replace with your actual keys)
const EMAILJS_SERVICE_ID = 'service_fhwyoqa';
const EMAILJS_TEMPLATE_ID = 'template_sw66ckp';
const EMAILJS_PUBLIC_KEY = 'p3eepkuYgR6Be8w8v';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

// --- Checkbox functionality for reasons ---
const checkboxItems = document.querySelectorAll('.checkbox-item');
const selectedValues = new Set();

checkboxItems.forEach(item => {
    item.addEventListener('click', function() {
        const checkbox = this.querySelector('.checkbox');
        const value = this.dataset.value;

        if (selectedValues.has(value)) {
            selectedValues.delete(value);
            checkbox.classList.remove('checked');
            this.classList.remove('selected');
        } else {
            selectedValues.add(value);
            checkbox.classList.add('checked');
            this.classList.add('selected');
        }
    });
});

// --- Enhanced form submission handler ---
document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Check if at least one checkbox is selected
    if (selectedValues.size === 0) {
        alert('Please select at least one reason for contacting us.');
        return;
    }
    
    const button = document.querySelector('.submit-button');
    const originalText = button.textContent;
    
    // Show loading state
    button.textContent = 'Sending...';
    button.disabled = true;
    
    // Collect form data
    const formData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        // Get selected labels for reasons
        reasons: Array.from(selectedValues).map(val => {
            const label = document.querySelector(`.checkbox-item[data-value="${val}"] .checkbox-label`);
            return label ? label.textContent.trim() : val;
        }).join(', '),
        message: document.getElementById('message').value,
        timestamp: new Date().toLocaleString()
    };
    
    // Send email using EmailJS
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: 'info@horeye.me',
        from_name: formData.fullName,
        from_email: formData.email,
        subject: `New Contact Form Submission - ${formData.reasons}`,
        message: `
Name: ${formData.fullName}
Email: ${formData.email}
Reason(s): ${formData.reasons}
Message: ${formData.message}
Submitted: ${formData.timestamp}
        `,
        reply_to: formData.email
    })
    .then(function(response) {
        console.log('Email sent successfully!', response);
        alert('Thank you for your message! We\'ll get back to you within 24 hours.');
        
        // Reset form
        document.getElementById('contactForm').reset();
        selectedValues.clear();
        checkboxItems.forEach(item => {
            item.classList.remove('selected');
            item.querySelector('.checkbox').classList.remove('checked');
        });
    })
    .catch(function(error) {
        console.error('Failed to send email:', error);
        alert('Sorry, there was an error sending your message. Please try again or contact us directly at info@horeye.me');
    })
    .finally(function() {
        // Reset button state
        button.textContent = originalText;
        button.disabled = false;
    });
});

// Method 2: Using Fetch API with a backend service (like Formspree)
// Replace the above emailjs.send() with this approach:

/*
async function sendEmailViaFormspree(formData) {
    try {
        const response = await fetch('https://formspree.io/f/your_form_id', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: formData.fullName,
                email: formData.email,
                subject: `New Contact Form Submission - ${formData.reasons}`,
                message: `
Name: ${formData.fullName}
Email: ${formData.email}
Reason(s): ${formData.reasons}
Message: ${formData.message}
Submitted: ${formData.timestamp}
                `
            })
        });
        
        if (response.ok) {
            return { success: true };
        } else {
            throw new Error('Failed to send email');
        }
    } catch (error) {
        throw error;
    }
}
*/

// Method 3: Using Web3Forms (Another alternative)
/*
async function sendEmailViaWeb3Forms(formData) {
    try {
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                access_key: 'your_access_key_here',
                name: formData.fullName,
                email: formData.email,
                subject: `New Contact Form Submission - ${formData.reasons}`,
                message: `
Name: ${formData.fullName}
Email: ${formData.email}
Reason(s): ${formData.reasons}
Message: ${formData.message}
Submitted: ${formData.timestamp}
                `
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            return { success: true };
        } else {
            throw new Error(result.message || 'Failed to send email');
        }
    } catch (error) {
        throw error;
    }
}
*/
