/**
 * Fabled Galaxy - Create Your Fable Form Wizard
 * Handles multi-step form navigation, validation, and submission
 */

document.addEventListener('DOMContentLoaded', () => {
        // Auto-fill creator name and email if user is logged in (Discord)
        (async function autoFillCreatorFields() {
            if (window.sb && window.sb.auth && window.sb.auth.getUser) {
                try {
                    const { data: { user } } = await window.sb.auth.getUser();
                    if (user) {
                        // Prefer Discord global_name, then full_name, then name, then fallback
                        const autoName =
                            user.user_metadata?.custom_claims?.global_name ||
                            user.user_metadata?.full_name ||
                            user.user_metadata?.name ||
                            "Creator";
                        const creatorNameInput = document.getElementById("creator-name");
                        if (creatorNameInput) {
                            creatorNameInput.value = autoName;
                            creatorNameInput.readOnly = true;
                        }
                        const emailInput = document.getElementById("creator-email");
                        if (emailInput) {
                            if (user.email) {
                                emailInput.value = user.email;
                                emailInput.required = false;
                                // Hide the email field visually
                                const fieldGroup = emailInput.closest(".form-group") || emailInput.closest(".field");
                                if (fieldGroup) fieldGroup.style.display = "none";
                            } else {
                                emailInput.required = false;
                            }
                        }
                    }
                } catch (e) {
                    // Fail silently if auth not available
                }
            }
        })();
    const form = document.getElementById('fable-form');
    if (!form) return; // Only run on form page

    // Elements
    const steps = document.querySelectorAll('.form-step');
    const progressSteps = document.querySelectorAll('.progress-step');
    const progressFill = document.getElementById('progress-fill');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    
    // State
    let currentStep = 1;
    const totalSteps = steps.length;

    // Initialize
    updateProgress();
    setupCharacterCount();
    setupAllLiveCounters();
    setupFileUpload();
    setupProgressStepClicks();

    // Navigation button handlers
    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            goToStep(currentStep - 1);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (validateCurrentStep()) {
            if (currentStep < totalSteps) {
                goToStep(currentStep + 1);
            }
        }
    });

    // Form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validateCurrentStep()) return;
        // Collect form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Enforce max length in JS (defensive)
        if (data.planetName && data.planetName.length > 60) {
            showErrorMessage('Planet name is too long.');
            return;
        }
        if (data.planetDescription && data.planetDescription.length > 240) {
            showErrorMessage('Planet description is too long.');
            return;
        }
        if (data.inhabitants && data.inhabitants.length > 2000) {
            showErrorMessage('Inhabitants field is too long.');
            return;
        }
        if (data.civilization && data.civilization.length > 2000) {
            showErrorMessage('Civilization field is too long.');
            return;
        }
        if (data.factions && data.factions.length > 2000) {
            showErrorMessage('Factions field is too long.');
            return;
        }
        if (data.technology && data.technology.length > 2000) {
            showErrorMessage('Technology field is too long.');
            return;
        }
        if (data.magicSystem && data.magicSystem.length > 2000) {
            showErrorMessage('Magic system field is too long.');
            return;
        }
        if (data.creationMyth && data.creationMyth.length > 2000) {
            showErrorMessage('Creation myth field is too long.');
            return;
        }
        if (data.legends && data.legends.length > 2000) {
            showErrorMessage('Legends field is too long.');
            return;
        }
        if (data.history && data.history.length > 2000) {
            showErrorMessage('History field is too long.');
            return;
        }

        // Handle image data if present
        const fileInput = document.getElementById('planet-art');
        if (fileInput && fileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (event) => {
                data.imageData = event.target.result;
                savePlanetAndShowSuccess(data);
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            savePlanetAndShowSuccess(data);
        }
    });
/**
 * Setup live character counters for all relevant fields
 */
function setupAllLiveCounters() {
    const counters = [
        { id: 'planet-name', max: 60 },
        { id: 'planet-description', max: 240 },
        { id: 'inhabitants', max: 2000 },
        { id: 'civilization', max: 2000 },
        { id: 'factions', max: 2000 },
        { id: 'technology', max: 2000 },
        { id: 'magic-system', max: 2000 },
        { id: 'creation-myth', max: 2000 },
        { id: 'legends', max: 2000 },
        { id: 'history', max: 2000 },
    ];
    counters.forEach(({ id, max }) => {
        const field = document.getElementById(id);
        const countSpan = document.getElementById(id + '-count');
        if (field && countSpan) {
            field.addEventListener('input', () => {
                countSpan.textContent = field.value.length;
                if (field.value.length > max * 0.9) {
                    countSpan.style.color = '#ff6b9d';
                } else {
                    countSpan.style.color = '';
                }
            });
            // Initialize on load
            countSpan.textContent = field.value.length;
        }
    });
}

    /**
     * Save planet to Supabase and show success
     */
    async function savePlanetAndShowSuccess(data) {
        // Validate email is provided (required for non-logged-in users)
        const user = window.getCurrentUser ? await window.getCurrentUser() : null;
        if (!user && !data.creatorEmail) {
            showEmailRequiredMessage();
            return;
        }

        // Map form fields to Supabase schema
        const payload = {
            planet_name: data.planetName,
            creator_name: data.creatorName,
            creator_email: data.creatorEmail || '',
            planet_type: data.planetType,
            description: data.planetDescription,
            locked: false,
            fields: {
                inhabitants: data.inhabitants || '',
                civilization: data.civilization || '',
                factions: data.factions || '',
                techLevel: data.techLevel || '',
                technology: data.technology || '',
                magicExists: data.magicExists || '',
                magicSystem: data.magicSystem || '',
                creationMyth: data.creationMyth || '',
                legends: data.legends || '',
                history: data.history || '',
                imageData: data.imageData || null
            }
        };

        try {
            await window.submitWorld(payload);
            console.log('World submitted to Supabase as pending');
            showSuccessMessage({ name: data.planetName });
        } catch (error) {
            console.error('Error submitting world:', error);
            showErrorMessage(error.message);
        }
    }

    /**
     * Show email required message
     */
    function showEmailRequiredMessage() {
        const formContainer = document.querySelector('.form-container');
        formContainer.innerHTML = `
            <div class="success-message" style="border-color: rgba(255, 107, 157, 0.3); box-shadow: 0 0 60px rgba(255, 107, 157, 0.2);">
                <div class="success-icon">📧</div>
                <h2>Email Required</h2>
                <p>Please provide your email address so we can notify you when your world is approved.</p>
                <div class="success-actions">
                    <a href="create-fable.html" class="btn btn-primary">
                        <span class="btn-icon">←</span>
                        Back to Form
                    </a>
                </div>
            </div>
        `;
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /**
     * Show error message
     */
    function showErrorMessage(message) {
        const formContainer = document.querySelector('.form-container');
        formContainer.innerHTML = `
            <div class="success-message" style="border-color: rgba(255, 107, 157, 0.3); box-shadow: 0 0 60px rgba(255, 107, 157, 0.2);">
                <div class="success-icon">⚠️</div>
                <h2>Submission Failed</h2>
                <p>${message || 'Something went wrong. Please try again.'}</p>
                <div class="success-actions">
                    <a href="create-fable.html" class="btn btn-primary">
                        <span class="btn-icon">↻</span>
                        Try Again
                    </a>
                </div>
            </div>
        `;
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /**
     * Navigate to a specific step
     */
    function goToStep(step) {
        // Validate we can go to this step (can always go back, forward requires validation)
        if (step > currentStep) {
            for (let i = currentStep; i < step; i++) {
                if (!validateStep(i)) {
                    goToStep(i);
                    return;
                }
            }
        }

        // Update current step
        currentStep = step;
        
        // Update step visibility
        steps.forEach((s, index) => {
            s.classList.toggle('active', index + 1 === currentStep);
        });
        
        // Update progress
        updateProgress();
        
        // Update buttons
        updateButtons();
        
        // Scroll to top of form
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * Update progress bar and step indicators
     */
    function updateProgress() {
        // Update progress bar fill
        const progressPercent = (currentStep / totalSteps) * 100;
        progressFill.style.width = `${progressPercent}%`;
        
        // Update step indicators
        progressSteps.forEach((step, index) => {
            const stepNum = index + 1;
            step.classList.toggle('active', stepNum === currentStep);
            step.classList.toggle('completed', stepNum < currentStep);
        });
    }

    /**
     * Update navigation buttons based on current step
     */
    function updateButtons() {
        prevBtn.disabled = currentStep === 1;
        
        if (currentStep === totalSteps) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'inline-flex';
        } else {
            nextBtn.style.display = 'inline-flex';
            submitBtn.style.display = 'none';
        }
    }

    /**
     * Validate the current step
     */
    function validateCurrentStep() {
        return validateStep(currentStep);
    }

    /**
     * Validate a specific step
     */
    function validateStep(stepNum) {
        const step = document.querySelector(`.form-step[data-step="${stepNum}"]`);
        const requiredFields = step.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            // Remove previous error styling
            field.classList.remove('error');
            
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('error');
                
                // Add shake animation
                field.style.animation = 'shake 0.5s ease';
                setTimeout(() => {
                    field.style.animation = '';
                }, 500);
            }
            
            // Special validation for checkbox
            if (field.type === 'checkbox' && !field.checked) {
                isValid = false;
                field.closest('.checkbox-option').classList.add('error');
            }
        });
        
        return isValid;
    }

    /**
     * Setup progress step click navigation
     */
    function setupProgressStepClicks() {
        progressSteps.forEach((step, index) => {
            step.addEventListener('click', () => {
                const targetStep = index + 1;
                // Only allow clicking on completed steps or the next step
                if (targetStep <= currentStep || targetStep === currentStep + 1) {
                    if (targetStep > currentStep) {
                        // Validate current step before moving forward
                        if (validateCurrentStep()) {
                            goToStep(targetStep);
                        }
                    } else {
                        goToStep(targetStep);
                    }
                }
            });
        });
    }

    /**
     * Setup character count for textareas
     */
    function setupCharacterCount() {
        const descTextarea = document.getElementById('planet-description');
        const descCount = document.getElementById('desc-count');
        
        if (descTextarea && descCount) {
            descTextarea.addEventListener('input', () => {
                descCount.textContent = descTextarea.value.length;
                
                // Visual feedback if approaching limit
                if (descTextarea.value.length > 1800) {
                    descCount.style.color = '#ff6b9d';
                } else {
                    descCount.style.color = '';
                }
            });
        }
    }

    /**
     * Setup file upload with preview and drag & drop
     */
    function setupFileUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('planet-art');
        const uploadPreview = document.getElementById('upload-preview');
        const uploadContent = uploadArea?.querySelector('.upload-content');
        
        if (!uploadArea || !fileInput) return;

        // Drag and drop events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover');
            });
        });

        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length) {
                fileInput.files = files;
                handleFile(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleFile(e.target.files[0]);
            }
        });

        function handleFile(file) {
            // Validate file type
            const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/avif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                alert('Please upload an image file (PNG, JPG, AVIF, or WEBP)');
                return;
            }

            // Validate file size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('File size must be less than 10MB');
                return;
            }

            // Show preview
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadPreview.innerHTML = `
                    <img src="${e.target.result}" alt="Planet art preview" width="200" height="200">
                    <button type="button" class="remove-image" onclick="removeImage()">✕ Remove</button>
                `;
                uploadPreview.classList.add('has-image');
                uploadContent.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    }

    /**
     * Show success message after submission
     */
    function showSuccessMessage(planet) {
        const formContainer = document.querySelector('.form-container');
        const planetName = planet ? planet.name : 'Your world';
        
        formContainer.innerHTML = `
            <div class="success-message">
                <div class="success-icon">✅</div>
                <h2>${planetName} Has Been Submitted!</h2>
                <p>Your world has been submitted for review. Once approved by a moderator, it will appear in the galaxy for all travelers to discover.</p>
                <p style="color: var(--color-text-dim); font-size: 0.9rem; margin-top: 0.5rem;">Review typically takes 1-2 days.</p>
                <div class="success-actions">
                    <a href="gallery.html" class="btn btn-primary">
                        <span class="btn-icon">🌌</span>
                        Explore Galaxy
                    </a>
                    <a href="create-fable.html" class="btn btn-secondary">
                        <span class="btn-icon">✦</span>
                        Create Another
                    </a>
                </div>
            </div>
        `;
        
        // Scroll to success message
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});

/**
 * Remove uploaded image (global function for onclick)
 */
function removeImage() {
    const fileInput = document.getElementById('planet-art');
    const uploadPreview = document.getElementById('upload-preview');
    const uploadContent = document.querySelector('.upload-content');
    
    fileInput.value = '';
    uploadPreview.innerHTML = '';
    uploadPreview.classList.remove('has-image');
    uploadContent.style.display = 'flex';
}

// Add error and success styling to CSS dynamically
const dynamicStyles = document.createElement('style');
dynamicStyles.textContent = `
    .form-group input.error,
    .form-group textarea.error,
    .form-group select.error,
    .checkbox-option.error {
        border-color: var(--color-accent) !important;
        box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.2) !important;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-5px); }
        40%, 80% { transform: translateX(5px); }
    }
    
    .success-message {
        text-align: center;
        padding: 4rem 2rem;
        background: linear-gradient(135deg, rgba(18, 18, 26, 0.95), rgba(10, 10, 15, 0.98));
        border: 1px solid rgba(124, 91, 245, 0.3);
        border-radius: 20px;
        box-shadow: 0 0 60px rgba(124, 91, 245, 0.3);
    }
    
    .success-icon {
        font-size: 5rem;
        margin-bottom: 1.5rem;
        animation: pulse 2s ease-in-out infinite;
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
    
    .success-message h2 {
        font-family: var(--font-display);
        font-size: 2rem;
        background: linear-gradient(135deg, var(--color-gold), var(--color-accent));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 1rem;
    }
    
    .success-message p {
        color: var(--color-text-dim);
        font-size: 1.1rem;
        max-width: 500px;
        margin: 0 auto 2rem;
    }
    
    .success-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
    }
    
    .remove-image {
        display: block;
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: rgba(255, 107, 157, 0.2);
        border: 1px solid var(--color-accent);
        border-radius: 8px;
        color: var(--color-accent);
        cursor: pointer;
        font-family: var(--font-body);
        transition: all 0.3s ease;
    }
    
    .remove-image:hover {
        background: rgba(255, 107, 157, 0.3);
    }
`;
document.head.appendChild(dynamicStyles);
