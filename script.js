/* ============================================
   Fabled Galaxy - Landing Page Scripts
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    initStarfield();
    initParticles();
    initTypewriter();
    initPlanetNodes();
    initScrollReveal();
    initSmoothScroll();
});

/* ============================================
   Starfield Background
   ============================================ */
function initStarfield() {
    const starfield = document.getElementById('starfield');
    const starCount = 200;
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        // Random position
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        
        // Random size
        const size = Math.random() * 3 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        // Random animation properties - all stars twinkle at different rates
        star.style.setProperty('--opacity', Math.random() * 0.7 + 0.3);
        star.style.setProperty('--duration', `${Math.random() * 3 + 2}s`);
        star.style.animationDelay = `${Math.random() * 3}s`;
        
        starfield.appendChild(star);
    }
}

/* ============================================
   Galaxy Spinning Particles with Differential Rotation
   ============================================ */
function initParticles() {
    const particles = document.getElementById('particles');
    const particleCount = 180; // More particles for denser galaxy
    
    // Get center of viewport
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    for (let i = 0; i < particleCount; i++) {
        createGalaxyParticle(particles, centerX, centerY, i, particleCount);
    }
    
    // Update center on resize
    window.addEventListener('resize', () => {
        const newCenterX = window.innerWidth / 2;
        const newCenterY = window.innerHeight / 2;
        particles.querySelectorAll('.particle').forEach(p => {
            p.style.left = `${newCenterX}px`;
            p.style.top = `${newCenterY}px`;
        });
    });
}

function createGalaxyParticle(container, centerX, centerY, index, total) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Position at center (will be offset by orbit radius in animation)
    particle.style.left = `${centerX}px`;
    particle.style.top = `${centerY}px`;
    
    // Random angle for scattered distribution
    const angle = Math.random() * Math.PI * 2;
    
    // Distance from center - random distribution with more clustering toward center
    const normalizedIndex = index / total;
    const maxRadius = Math.max(window.innerWidth, window.innerHeight) * 0.8;
    const minRadius = 20;
    
    // Random radius with bias toward center (galaxy core density)
    const randomFactor = Math.random();
    const radiusNormalized = Math.pow(randomFactor, 0.7); // Cluster toward center
    const radius = minRadius + radiusNormalized * (maxRadius - minRadius) + (Math.random() - 0.5) * 80;
    
    // Set orbit radius as CSS variable
    particle.style.setProperty('--orbit-radius', `${Math.max(minRadius, radius)}px`);
    
    // DIFFERENTIAL ROTATION: Inner particles orbit faster
    const minDuration = 60;  // Fastest orbit (inner particles)
    const maxDuration = 400; // Slowest orbit (outer particles)
    const orbitDuration = minDuration + Math.pow(radiusNormalized, 1.5) * (maxDuration - minDuration);
    particle.style.setProperty('--orbit-duration', `${orbitDuration}s`);
    
    // Random starting angle
    const startAngle = Math.random() * 360;
    particle.style.transform = `rotate(${startAngle}deg) translateX(${radius}px) rotate(-${startAngle}deg)`;
    
    // Negative delay to start at different positions around orbit
    const delay = -(startAngle / 360) * orbitDuration;
    particle.style.animationDelay = `${delay}s`;
    
    // Size - larger near core, smaller at edges, with randomness
    const coreProximity = 1 - radiusNormalized;
    const size = Math.random() * 3 + 1 + coreProximity * 4;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // All white particles with varying opacity for shimmer effect
    const opacity = 0.2 + Math.random() * 0.6 + coreProximity * 0.2;
    particle.style.background = `rgba(255, 255, 255, ${opacity})`;
    
    // Add subtle glow to brighter/larger particles
    if (opacity > 0.5 || size > 4) {
        particle.style.boxShadow = `0 0 ${size * 2}px rgba(255, 255, 255, ${opacity * 0.6})`;
    }
    
    container.appendChild(particle);
}

/* ============================================
   Line-by-Line Text Reveal
   ============================================ */
function initTypewriter() {
    const storyText = document.querySelector('.story-text');
    if (!storyText) return; // Not on homepage
    
    const lines = [
        "In the vast expanse of imagination, countless worlds await discovery.",
        "Each star holds a story, each planet a fable.",
        "Here, creators weave civilizations from dreams and forge mythologies from wonder.",
        "Your universe is waiting to be born."
    ];
    
    // Create line elements with text already in place (reserves space)
    lines.forEach((line, index) => {
        const lineEl = document.createElement('span');
        lineEl.className = 'story-line';
        lineEl.textContent = line;
        storyText.appendChild(lineEl);
    });
    
    // Reveal lines one by one with scroll-up animation
    const lineElements = storyText.querySelectorAll('.story-line');
    let currentLine = 0;
    const delayBetweenLines = 800;
    
    function revealNextLine() {
        if (currentLine < lineElements.length) {
            lineElements[currentLine].classList.add('visible');
            currentLine++;
            setTimeout(revealNextLine, delayBetweenLines);
        }
    }
    
    // Start reveal after initial delay
    setTimeout(revealNextLine, 600);
}

/* ============================================
   Planet Node Interactions
   ============================================ */
function initPlanetNodes() {
    const galaxyOverlay = document.getElementById('home-galaxy-overlay');
    const tooltip = document.getElementById('planet-tooltip');
    
    if (!galaxyOverlay || !tooltip) return;
    
    const tooltipName = tooltip.querySelector('.tooltip-name');
    const tooltipCreator = tooltip.querySelector('.tooltip-creator');
    const tooltipType = tooltip.querySelector('.tooltip-type');
    
    // Load planets from Supabase
    (async () => {
        const worlds = typeof FabledGalaxyData !== 'undefined' ? await FabledGalaxyData.getAllPlanets() : [];
        galaxyOverlay.innerHTML = '';
        worlds.forEach(world => {
            // Supabase schema: planet_name, planet_type, fields, etc.
            const typeInfo = typeof FabledGalaxyData !== 'undefined'
                ? FabledGalaxyData.getPlanetTypeInfo(world.planet_type)
                : { emoji: '🌍', label: 'World' };
            const position = world.fields?.position || { x: 10, y: 10 };
            const color = world.fields?.color || '#ffd700';
            const creatorName = world.fields?.creator_name || 'Unknown';
            const node = document.createElement('div');
            node.className = 'planet-node';
            node.style.top = `${position.y}%`;
            node.style.left = `${position.x}%`;
            node.style.setProperty('--planet-color', color);
            node.dataset.id = world.id;
            node.dataset.name = world.planet_name;
            node.dataset.creator = creatorName;
            node.dataset.type = typeInfo.label;
            node.dataset.emoji = typeInfo.emoji;
            galaxyOverlay.appendChild(node);
        });
        // Setup interactions for all planet nodes
        const planetNodes = document.querySelectorAll('.planet-node');
        planetNodes.forEach(node => {
            node.addEventListener('mouseenter', (e) => {
                const name = node.dataset.name;
                const creator = node.dataset.creator;
                const type = node.dataset.type;
                const emoji = node.dataset.emoji || '';
                tooltipName.textContent = name;
                if (tooltipCreator) tooltipCreator.textContent = `by ${creator}`;
                tooltipType.textContent = `${emoji} ${type}`;
                tooltip.classList.add('visible');
                updateTooltipPosition(e);
            });
            node.addEventListener('mousemove', (e) => {
                updateTooltipPosition(e);
            });
            node.addEventListener('mouseleave', () => {
                tooltip.classList.remove('visible');
            });
            node.addEventListener('click', () => {
                // Navigate to planet page
                const planetId = node.dataset.id;
                if (planetId) {
                    window.location.href = `planet.html?id=${planetId}`;
                }
            });
        });
    })();
    
    // Setup interactions for all planet nodes
    const planetNodes = document.querySelectorAll('.planet-node');
    
    planetNodes.forEach(node => {
        node.addEventListener('mouseenter', (e) => {
            const name = node.dataset.name;
            const creator = node.dataset.creator;
            const type = node.dataset.type;
            const emoji = node.dataset.emoji || '';
            
            tooltipName.textContent = name;
            if (tooltipCreator) tooltipCreator.textContent = `by ${creator}`;
            tooltipType.textContent = `${emoji} ${type}`;
            
            tooltip.classList.add('visible');
            updateTooltipPosition(e);
        });
        
        node.addEventListener('mousemove', (e) => {
            updateTooltipPosition(e);
        });
        
        node.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
        });
        
        node.addEventListener('click', () => {
            // Navigate to planet page
            const planetId = node.dataset.id;
            if (planetId) {
                window.location.href = `planet.html?id=${planetId}`;
            }
        });
    });
    
    function updateTooltipPosition(e) {
        const offset = 15;
        let x = e.clientX + offset;
        let y = e.clientY + offset;
        
        // Keep tooltip in viewport
        const tooltipRect = tooltip.getBoundingClientRect();
        if (x + tooltipRect.width > window.innerWidth) {
            x = e.clientX - tooltipRect.width - offset;
        }
        if (y + tooltipRect.height > window.innerHeight) {
            y = e.clientY - tooltipRect.height - offset;
        }
        
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }
}

/* ============================================
   Scroll Reveal Animation
   ============================================ */
function initScrollReveal() {
    const revealElements = document.querySelectorAll(
        '.feature-card, .create-step, .section-title, .section-subtitle'
    );
    
    revealElements.forEach(el => {
        el.classList.add('reveal');
    });
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    revealElements.forEach(el => {
        observer.observe(el);
    });
}

/* ============================================
   Smooth Scroll for Anchor Links
   ============================================ */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/* ============================================
   Notification System
   ============================================ */
function showNotification(message) {
    // Remove existing notification if any
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #7c5bf5, #9d85f7);
        color: white;
        padding: 1rem 2rem;
        border-radius: 50px;
        font-weight: 600;
        z-index: 1001;
        animation: slideUp 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
        box-shadow: 0 0 30px rgba(124, 91, 245, 0.5);
    `;
    
    document.body.appendChild(notification);
    
    // Add animation styles if not already present
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideUp {
                from { 
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
            @keyframes fadeOut {
                to {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-10px);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Remove after animation
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

/* ============================================
   Button Ripple Effect
   ============================================ */
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function(e) {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ripple = document.createElement('span');
        ripple.style.cssText = `
            position: absolute;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            left: ${x}px;
            top: ${y}px;
            width: 100px;
            height: 100px;
            margin-left: -50px;
            margin-top: -50px;
            pointer-events: none;
        `;
        
        button.style.position = 'relative';
        button.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });
});

// Add ripple animation
if (!document.getElementById('ripple-styles')) {
    const style = document.createElement('style');
    style.id = 'ripple-styles';
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}
