/**
 * Fabled Galaxy - Galaxy Gallery
 * Handles the interactive galaxy map, filtering, and planet display
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const planetsContainer = document.getElementById('planets-container');
    const planetGrid = document.getElementById('planet-grid');
    const tooltip = document.getElementById('planet-tooltip');
    const galaxyMap = document.getElementById('galaxy-map');
    const galaxyList = document.getElementById('galaxy-list');
    
    // Filters
    const filterType = document.getElementById('filter-type');
    const filterCollab = document.getElementById('filter-collab');
    const filterSearch = document.getElementById('filter-search');
    
    // View toggles
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    
    // Moderator elements
    const modBtn = document.getElementById('mod-btn');
    const modModal = document.getElementById('mod-modal');
    const modalClose = document.getElementById('modal-close');
    const modPassword = document.getElementById('mod-password');
    const modLoginBtn = document.getElementById('mod-login-btn');
    const modLogoutBtn = document.getElementById('mod-logout-btn');
    const modLoginForm = document.getElementById('mod-login-form');
    const modPanel = document.getElementById('mod-panel');
    const modError = document.getElementById('mod-error');
    const exportBtn = document.getElementById('export-btn');
    const importFile = document.getElementById('import-file');
    
    // Stats
    const totalPlanetsEl = document.getElementById('total-planets');
    const totalCreatorsEl = document.getElementById('total-creators');
    const openWorldsEl = document.getElementById('open-worlds');
    
    // State
    let currentView = 'map';
    let allPlanets = [];

    // Initialize
    init();

    function init() {
        loadPlanets();
        setupEventListeners();
        updateModeratorUI();
    }

    /**
     * Load and display planets
     */
    function loadPlanets() {
        allPlanets = FabledGalaxyData.getPlanets();
        renderPlanets(allPlanets);
        updateStats(allPlanets);
    }

    /**
     * Render planets based on current view
     */
    function renderPlanets(planets) {
        if (currentView === 'map') {
            renderMapView(planets);
        } else {
            renderListView(planets);
        }
    }

    /**
     * Render map view with planet nodes
     */
    function renderMapView(planets) {
        planetsContainer.innerHTML = '';
        
        planets.forEach(planet => {
            const node = document.createElement('div');
            node.className = 'planet-node';
            node.dataset.id = planet.id;
            node.style.left = `${planet.position.x}%`;
            node.style.top = `${planet.position.y}%`;
            node.style.setProperty('--planet-color', planet.color);
            
            // Add collaboration indicator
            if (planet.collaboration === 'open') {
                node.classList.add('open-world');
            }
            
            // Moderator delete button
            if (FabledGalaxyData.isModerator()) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'planet-delete';
                deleteBtn.innerHTML = '×';
                deleteBtn.title = 'Delete planet';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deletePlanet(planet.id, planet.name);
                };
                node.appendChild(deleteBtn);
            }
            
            planetsContainer.appendChild(node);
        });
    }

    /**
     * Render list/grid view with planet cards
     */
    function renderListView(planets) {
        planetGrid.innerHTML = '';
        
        planets.forEach(planet => {
            const typeInfo = FabledGalaxyData.getPlanetTypeInfo(planet.type);
            const card = document.createElement('div');
            card.className = 'planet-card';
            card.dataset.id = planet.id;
            
            card.innerHTML = `
                <div class="card-image" style="background-color: ${planet.color}20;">
                    ${planet.imageData 
                        ? `<img src="${planet.imageData}" alt="${planet.name}">` 
                        : `<span class="card-emoji">${typeInfo.emoji}</span>`
                    }
                    ${planet.collaboration === 'open' 
                        ? '<span class="card-collab">🔓 Open</span>' 
                        : ''
                    }
                    ${FabledGalaxyData.isModerator() 
                        ? `<button class="card-delete" onclick="event.stopPropagation(); deletePlanetFromCard('${planet.id}', '${planet.name.replace(/'/g, "\\'")}')">×</button>` 
                        : ''
                    }
                </div>
                <div class="card-content">
                    <h3 class="card-name">${planet.name}</h3>
                    <p class="card-type">${typeInfo.emoji} ${typeInfo.label}</p>
                    <p class="card-creator">by ${planet.creatorName}</p>
                    <p class="card-description">${truncateText(planet.description, 100)}</p>
                </div>
            `;
            
            card.addEventListener('click', () => {
                window.location.href = `planet.html?id=${planet.id}`;
            });
            
            planetGrid.appendChild(card);
        });
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Tooltip for map view
        planetsContainer.addEventListener('mousemove', handlePlanetHover);
        planetsContainer.addEventListener('mouseleave', hideTooltip);
        planetsContainer.addEventListener('click', handlePlanetClick);
        
        // Filters
        filterType.addEventListener('change', applyFilters);
        filterCollab.addEventListener('change', applyFilters);
        filterSearch.addEventListener('input', debounce(applyFilters, 300));
        
        // View toggle
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toggleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentView = btn.dataset.view;
                
                if (currentView === 'map') {
                    galaxyMap.style.display = 'block';
                    galaxyList.style.display = 'none';
                } else {
                    galaxyMap.style.display = 'none';
                    galaxyList.style.display = 'block';
                }
                
                applyFilters();
            });
        });
        
        // Moderator modal
        modBtn.addEventListener('click', () => {
            modModal.style.display = 'flex';
        });
        
        modalClose.addEventListener('click', () => {
            modModal.style.display = 'none';
        });
        
        modModal.addEventListener('click', (e) => {
            if (e.target === modModal) {
                modModal.style.display = 'none';
            }
        });
        
        modLoginBtn.addEventListener('click', handleModLogin);
        modPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleModLogin();
        });
        
        modLogoutBtn.addEventListener('click', () => {
            FabledGalaxyData.logoutModerator();
            updateModeratorUI();
            loadPlanets();
        });
        
        // Export/Import
        exportBtn.addEventListener('click', () => {
            FabledGalaxyData.exportData();
        });
        
        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (FabledGalaxyData.importData(event.target.result)) {
                        alert('Data imported successfully!');
                        loadPlanets();
                    } else {
                        alert('Failed to import data. Please check the file format.');
                    }
                };
                reader.readAsText(file);
            }
        });
    }

    /**
     * Handle planet hover for tooltip
     */
    function handlePlanetHover(e) {
        const node = e.target.closest('.planet-node');
        if (!node) {
            hideTooltip();
            return;
        }
        
        const planet = allPlanets.find(p => p.id === node.dataset.id);
        if (!planet) return;
        
        const typeInfo = FabledGalaxyData.getPlanetTypeInfo(planet.type);
        
        tooltip.querySelector('.tooltip-type-icon').textContent = typeInfo.emoji;
        tooltip.querySelector('.tooltip-name').textContent = planet.name;
        tooltip.querySelector('.tooltip-creator').textContent = `by ${planet.creatorName}`;
        tooltip.querySelector('.tooltip-type').textContent = typeInfo.label;
        tooltip.querySelector('.tooltip-description').textContent = truncateText(planet.description, 150);
        tooltip.querySelector('.tooltip-collab').textContent = planet.collaboration === 'open' ? '🔓 Open for collaboration' : '🔒 Locked';
        
        // Position tooltip
        const rect = galaxyMap.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();
        
        let left = nodeRect.left - rect.left + nodeRect.width / 2;
        let top = nodeRect.top - rect.top - 10;
        
        // Adjust if tooltip would go off screen
        const tooltipWidth = 280;
        if (left + tooltipWidth / 2 > rect.width) {
            left = rect.width - tooltipWidth / 2 - 10;
        }
        if (left - tooltipWidth / 2 < 0) {
            left = tooltipWidth / 2 + 10;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.classList.add('visible');
    }

    /**
     * Hide tooltip
     */
    function hideTooltip() {
        tooltip.classList.remove('visible');
    }

    /**
     * Handle planet click
     */
    function handlePlanetClick(e) {
        const node = e.target.closest('.planet-node');
        if (!node || e.target.classList.contains('planet-delete')) return;
        
        window.location.href = `planet.html?id=${node.dataset.id}`;
    }

    /**
     * Apply filters
     */
    function applyFilters() {
        const typeFilter = filterType.value;
        const collabFilter = filterCollab.value;
        const searchQuery = filterSearch.value.toLowerCase().trim();
        
        let filtered = allPlanets;
        
        if (typeFilter !== 'all') {
            filtered = filtered.filter(p => p.type === typeFilter);
        }
        
        if (collabFilter !== 'all') {
            filtered = filtered.filter(p => p.collaboration === collabFilter);
        }
        
        if (searchQuery) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(searchQuery) ||
                p.description.toLowerCase().includes(searchQuery) ||
                p.creatorName.toLowerCase().includes(searchQuery)
            );
        }
        
        renderPlanets(filtered);
    }

    /**
     * Update statistics
     */
    function updateStats(planets) {
        totalPlanetsEl.textContent = planets.length;
        
        const uniqueCreators = new Set(planets.map(p => p.creatorName));
        totalCreatorsEl.textContent = uniqueCreators.size;
        
        const openCount = planets.filter(p => p.collaboration === 'open').length;
        openWorldsEl.textContent = openCount;
    }

    /**
     * Handle moderator login
     */
    function handleModLogin() {
        const password = modPassword.value;
        if (FabledGalaxyData.loginModerator(password)) {
            modError.style.display = 'none';
            modPassword.value = '';
            updateModeratorUI();
            loadPlanets();
        } else {
            modError.style.display = 'block';
            modPassword.classList.add('error');
            setTimeout(() => modPassword.classList.remove('error'), 500);
        }
    }

    /**
     * Update moderator UI based on login state
     */
    function updateModeratorUI() {
        const isMod = FabledGalaxyData.isModerator();
        
        if (isMod) {
            modLoginForm.style.display = 'none';
            modPanel.style.display = 'block';
            modBtn.classList.add('active');
            modBtn.innerHTML = '🔓';
        } else {
            modLoginForm.style.display = 'block';
            modPanel.style.display = 'none';
            modBtn.classList.remove('active');
            modBtn.innerHTML = '🔐';
        }
    }

    /**
     * Delete a planet (moderator only)
     */
    function deletePlanet(id, name) {
        if (!FabledGalaxyData.isModerator()) return;
        
        if (confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
            FabledGalaxyData.deletePlanet(id);
            loadPlanets();
        }
    }
    
    // Expose deletePlanet for inline onclick
    window.deletePlanetFromCard = deletePlanet;

    /**
     * Utility: Truncate text
     */
    function truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    /**
     * Utility: Debounce function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
});
