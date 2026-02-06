/**
 * Fabled Galaxy - Create Your Fable Form Wizard
 * Handles multi-step form navigation, validation, and submission
 */

document.addEventListener('DOMContentLoaded', () => {
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
     * Save planet to data service and show success
     */
    function savePlanetAndShowSuccess(data) {
        // Save to data service
        const planet = FabledGalaxyData.savePlanet(data);
        console.log('Planet saved:', planet);
        
        // Show success message with link to view
        showSuccessMessage(planet);
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
        const planetId = planet ? planet.id : '';
        
        formContainer.innerHTML = `
            <div class="success-message">
                <div class="success-icon">🌟</div>
                <h2>${planetName} Has Been Created!</h2>
                <p>Your world has been added to the galaxy. Travelers from across the universe can now discover your creation.</p>
                <div class="success-actions">
                    ${planet ? `
                    <a href="planet.html?id=${planetId}" class="btn btn-primary">
                        <span class="btn-icon">🔭</span>
                        View Your Planet
                    </a>
                    ` : ''}
                    <a href="gallery.html" class="btn btn-secondary">
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
