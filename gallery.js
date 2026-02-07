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
    const mapViewport = document.getElementById('map-viewport');
    
    // Zoom Controls
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');
    const zoomLevelEl = document.getElementById('zoom-level');
    const miniMap = document.getElementById('mini-map');
    const miniViewport = document.getElementById('mini-viewport');
    
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
    
    // Map zoom/pan state
    let zoom = 1;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let panStartX = 0;
    let panStartY = 0;
    const MIN_ZOOM = 1;
    const MAX_ZOOM = 4;
    const ZOOM_STEP = 0.5;
    const CLUSTER_RADIUS = 8; // % distance to cluster planets

    // Initialize
    init();

    function init() {
        loadPlanets();
        setupEventListeners();
        setupMapControls();
        updateModeratorUI();
    }

    /**
     * Load and display planets from Supabase (with localStorage fallback)
     */
    async function loadPlanets() {
        try {
            // Try loading from Supabase first
            if (window.loadApprovedWorlds) {
                const worlds = await window.loadApprovedWorlds();
                if (worlds && worlds.length > 0) {
                    // Map Supabase fields to expected format
                    allPlanets = worlds.map(w => ({
                        id: w.id,
                        name: w.planet_name,
                        creator: w.creator_name,
                        type: w.planet_type,
                        description: w.description,
                        locked: w.locked,
                        createdAt: w.created_at,
                        ...(w.fields || {})
                    }));
                    renderPlanets(allPlanets);
                    updateStats(allPlanets);
                    return;
                }
            }
        } catch (error) {
            console.warn('Failed to load from Supabase, falling back to localStorage:', error);
        }
        
        // Fallback to localStorage
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
     * Render map view with planet nodes and clustering
     */
    function renderMapView(planets) {
        planetsContainer.innerHTML = '';
        
        // Cluster nearby planets based on current zoom
        const clusters = clusterPlanets(planets);
        
        clusters.forEach(cluster => {
            if (cluster.planets.length === 1) {
                // Single planet
                const planet = cluster.planets[0];
                const node = createPlanetNode(planet);
                planetsContainer.appendChild(node);
            } else {
                // Cluster of multiple planets
                const clusterNode = createClusterNode(cluster);
                planetsContainer.appendChild(clusterNode);
            }
        });
        
        updateMiniMap();
    }
    
    /**
     * Cluster nearby planets based on zoom level
     */
    function clusterPlanets(planets) {
        const effectiveRadius = CLUSTER_RADIUS / zoom;
        const clusters = [];
        const used = new Set();
        
        planets.forEach(planet => {
            if (used.has(planet.id)) return;
            
            const cluster = {
                planets: [planet],
                x: planet.position.x,
                y: planet.position.y
            };
            used.add(planet.id);
            
            // Find nearby planets
            planets.forEach(other => {
                if (used.has(other.id)) return;
                
                const dx = planet.position.x - other.position.x;
                const dy = planet.position.y - other.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < effectiveRadius) {
                    cluster.planets.push(other);
                    used.add(other.id);
                }
            });
            
            // Recalculate center if cluster has multiple planets
            if (cluster.planets.length > 1) {
                cluster.x = cluster.planets.reduce((sum, p) => sum + p.position.x, 0) / cluster.planets.length;
                cluster.y = cluster.planets.reduce((sum, p) => sum + p.position.y, 0) / cluster.planets.length;
            }
            
            clusters.push(cluster);
        });
        
        return clusters;
    }
    
    /**
     * Create a single planet node
     */
    function createPlanetNode(planet) {
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
        
        return node;
    }
    
    /**
     * Create a cluster node representing multiple planets
     */
    function createClusterNode(cluster) {
        const node = document.createElement('div');
        node.className = 'planet-cluster';
        node.style.left = `${cluster.x}%`;
        node.style.top = `${cluster.y}%`;
        
        // Store cluster data for tooltip/expansion
        node.dataset.count = cluster.planets.length;
        node.dataset.planetIds = cluster.planets.map(p => p.id).join(',');
        
        // Mix colors from cluster planets
        const avgColor = mixColors(cluster.planets.map(p => p.color));
        node.style.setProperty('--cluster-color', avgColor);
        
        node.innerHTML = `<span class="cluster-count">${cluster.planets.length}</span>`;
        
        // Click to zoom in on cluster
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            zoomToPoint(cluster.x, cluster.y, Math.min(zoom + 1, MAX_ZOOM));
        });
        
        return node;
    }
    
    /**
     * Mix multiple colors
     */
    function mixColors(colors) {
        let r = 0, g = 0, b = 0;
        colors.forEach(color => {
            const hex = color.replace('#', '');
            r += parseInt(hex.substr(0, 2), 16);
            g += parseInt(hex.substr(2, 2), 16);
            b += parseInt(hex.substr(4, 2), 16);
        });
        r = Math.round(r / colors.length);
        g = Math.round(g / colors.length);
        b = Math.round(b / colors.length);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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
                        ? `<img src="${planet.imageData}" alt="${planet.name}" width="280" height="180" loading="lazy" decoding="async">` 
                        : planet.planetImage
                            ? `<img src="${planet.planetImage}" alt="${planet.name}" width="280" height="180" loading="lazy" decoding="async">`
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
     * Setup map zoom/pan controls
     */
    function setupMapControls() {
        // Zoom buttons
        zoomInBtn.addEventListener('click', () => setZoom(zoom + ZOOM_STEP));
        zoomOutBtn.addEventListener('click', () => setZoom(zoom - ZOOM_STEP));
        zoomResetBtn.addEventListener('click', resetView);
        
        // Mouse wheel zoom
        galaxyMap.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
            
            // Zoom toward mouse position
            const rect = galaxyMap.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
            const mouseY = ((e.clientY - rect.top) / rect.height) * 100;
            
            zoomToPoint(mouseX, mouseY, zoom + delta);
        }, { passive: false });
        
        // Pan with mouse drag
        galaxyMap.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', endDrag);
        
        // Touch support
        galaxyMap.addEventListener('touchstart', handleTouchStart, { passive: false });
        galaxyMap.addEventListener('touchmove', handleTouchMove, { passive: false });
        galaxyMap.addEventListener('touchend', handleTouchEnd);
        
        // Mini-map click to navigate
        miniMap.addEventListener('click', (e) => {
            const rect = miniMap.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            panTo(x, y);
        });
    }
    
    /**
     * Set zoom level
     */
    function setZoom(newZoom) {
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
        
        // Constrain pan when zoomed out
        constrainPan();
        
        applyTransform();
        updateZoomUI();
        applyFilters(); // Re-render to update clusters
    }
    
    /**
     * Zoom to a specific point
     */
    function zoomToPoint(x, y, newZoom) {
        const oldZoom = zoom;
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
        
        if (zoom !== oldZoom) {
            // Adjust pan to keep the point centered
            const zoomRatio = zoom / oldZoom;
            panX = x - (x - panX) * zoomRatio;
            panY = y - (y - panY) * zoomRatio;
            
            constrainPan();
            applyTransform();
            updateZoomUI();
            applyFilters();
        }
    }
    
    /**
     * Pan to a specific point (center it)
     */
    function panTo(x, y) {
        panX = 50 - (x - 50) * (zoom - 1) / zoom;
        panY = 50 - (y - 50) * (zoom - 1) / zoom;
        constrainPan();
        applyTransform();
        updateMiniMap();
    }
    
    /**
     * Constrain pan within bounds
     */
    function constrainPan() {
        const maxPan = (zoom - 1) * 50 / zoom * 100 / zoom;
        panX = Math.max(-maxPan, Math.min(maxPan, panX));
        panY = Math.max(-maxPan, Math.min(maxPan, panY));
    }
    
    /**
     * Apply CSS transform
     */
    function applyTransform() {
        if (!mapViewport) return;
        mapViewport.style.transform = `scale(${zoom}) translate(${panX / zoom}%, ${panY / zoom}%)`;
    }
    
    /**
     * Reset view to default
     */
    function resetView() {
        zoom = 1;
        panX = 0;
        panY = 0;
        applyTransform();
        updateZoomUI();
        applyFilters();
    }
    
    /**
     * Update zoom UI elements
     */
    function updateZoomUI() {
        zoomLevelEl.textContent = `${zoom}x`;
        zoomInBtn.disabled = zoom >= MAX_ZOOM;
        zoomOutBtn.disabled = zoom <= MIN_ZOOM;
        updateMiniMap();
    }
    
    /**
     * Update mini-map viewport indicator
     */
    function updateMiniMap() {
        if (!miniViewport) return;
        const viewWidth = 100 / zoom;
        const viewHeight = 100 / zoom;
        const left = 50 - viewWidth / 2 - panX / zoom;
        const top = 50 - viewHeight / 2 - panY / zoom;
        
        miniViewport.style.width = `${viewWidth}%`;
        miniViewport.style.height = `${viewHeight}%`;
        miniViewport.style.left = `${left}%`;
        miniViewport.style.top = `${top}%`;
        
        // Hide mini-map when fully zoomed out
        miniMap.style.opacity = zoom > 1 ? '1' : '0';
        miniMap.style.pointerEvents = zoom > 1 ? 'auto' : 'none';
    }
    
    /**
     * Start drag (pan)
     */
    function startDrag(e) {
        if (zoom <= 1) return;
        if (e.target.closest('.planet-node, .planet-cluster')) return;
        
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        panStartX = panX;
        panStartY = panY;
        galaxyMap.style.cursor = 'grabbing';
    }
    
    /**
     * Handle drag movement
     */
    function onDrag(e) {
        if (!isDragging) return;
        
        const rect = galaxyMap.getBoundingClientRect();
        const dx = ((e.clientX - dragStartX) / rect.width) * 100;
        const dy = ((e.clientY - dragStartY) / rect.height) * 100;
        
        panX = panStartX + dx;
        panY = panStartY + dy;
        constrainPan();
        applyTransform();
        updateMiniMap();
        
        hideTooltip();
    }
    
    /**
     * End drag
     */
    function endDrag() {
        if (isDragging) {
            isDragging = false;
            galaxyMap.style.cursor = zoom > 1 ? 'grab' : 'default';
        }
    }
    
    // Touch handling variables
    let lastTouchDistance = 0;
    
    /**
     * Handle touch start
     */
    function handleTouchStart(e) {
        if (e.touches.length === 2) {
            // Pinch zoom
            lastTouchDistance = getTouchDistance(e.touches);
        } else if (e.touches.length === 1 && zoom > 1) {
            // Pan
            if (!e.target.closest('.planet-node, .planet-cluster')) {
                isDragging = true;
                dragStartX = e.touches[0].clientX;
                dragStartY = e.touches[0].clientY;
                panStartX = panX;
                panStartY = panY;
            }
        }
    }
    
    /**
     * Handle touch move
     */
    function handleTouchMove(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const distance = getTouchDistance(e.touches);
            const delta = (distance - lastTouchDistance) / 100;
            setZoom(zoom + delta);
            lastTouchDistance = distance;
        } else if (isDragging && e.touches.length === 1) {
            e.preventDefault();
            const rect = galaxyMap.getBoundingClientRect();
            const dx = ((e.touches[0].clientX - dragStartX) / rect.width) * 100;
            const dy = ((e.touches[0].clientY - dragStartY) / rect.height) * 100;
            
            panX = panStartX + dx;
            panY = panStartY + dy;
            constrainPan();
            applyTransform();
            updateMiniMap();
        }
    }
    
    /**
     * Handle touch end
     */
    function handleTouchEnd() {
        isDragging = false;
        lastTouchDistance = 0;
    }
    
    /**
     * Get distance between two touch points
     */
    function getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Handle planet hover for tooltip
     */
    function handlePlanetHover(e) {
        const node = e.target.closest('.planet-node');
        const cluster = e.target.closest('.planet-cluster');
        
        if (cluster) {
            // Show cluster tooltip
            const count = cluster.dataset.count;
            const planetIds = cluster.dataset.planetIds.split(',');
            const clusterPlanets = planetIds.map(id => allPlanets.find(p => p.id === id)).filter(Boolean);
            
            tooltip.querySelector('.tooltip-type-icon').textContent = '🌌';
            tooltip.querySelector('.tooltip-name').textContent = `${count} Planets`;
            tooltip.querySelector('.tooltip-creator').textContent = 'Click to zoom in';
            tooltip.querySelector('.tooltip-type').textContent = '';
            tooltip.querySelector('.tooltip-description').textContent = clusterPlanets.slice(0, 3).map(p => p.name).join(', ') + (count > 3 ? '...' : '');
            tooltip.querySelector('.tooltip-collab').textContent = '';
            tooltip.querySelector('.tooltip-hint').textContent = 'Click to zoom →';
            
            positionTooltip(cluster);
            tooltip.classList.add('visible');
            return;
        }
        
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
        tooltip.querySelector('.tooltip-hint').textContent = 'Click to explore →';
        
        positionTooltip(node);
        tooltip.classList.add('visible');
    }
    
    /**
     * Position tooltip relative to element
     */
    function positionTooltip(element) {
        const rect = galaxyMap.getBoundingClientRect();
        const nodeRect = element.getBoundingClientRect();
        
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
        // Ignore clicks on clusters (they have their own handler)
        if (e.target.closest('.planet-cluster')) return;
        
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
            renderPendingPlanets();
        } else {
            modLoginForm.style.display = 'block';
            modPanel.style.display = 'none';
            modBtn.classList.remove('active');
            modBtn.innerHTML = '🔐';
        }
    }

    /**
     * Render pending planets for moderator review
     */
    function renderPendingPlanets() {
        const pendingContainer = document.getElementById('pending-planets');
        const pendingCount = document.getElementById('pending-count');
        
        if (!pendingContainer) return;
        
        const pendingPlanets = FabledGalaxyData.getPendingPlanets();
        pendingCount.textContent = pendingPlanets.length;
        
        if (pendingPlanets.length === 0) {
            pendingContainer.innerHTML = '<p class="pending-empty">No planets pending review</p>';
            return;
        }
        
        pendingContainer.innerHTML = pendingPlanets.map(planet => {
            const typeInfo = FabledGalaxyData.getPlanetTypeInfo(planet.type);
            const createdDate = new Date(planet.createdAt).toLocaleDateString();
            
            return `
                <div class="pending-item" data-id="${planet.id}">
                    <div class="pending-item-header">
                        <span class="pending-item-name">${planet.name}</span>
                        <span class="pending-item-type">${typeInfo.emoji} ${typeInfo.label}</span>
                    </div>
                    <div class="pending-item-meta">
                        By ${planet.creatorName || 'Anonymous'} • ${createdDate}
                    </div>
                    <div class="pending-item-actions">
                        <button class="btn btn-approve" onclick="window.approvePlanetFromMod('${planet.id}', '${planet.name.replace(/'/g, "\\'")}')">
                            ✓ Approve
                        </button>
                        <button class="btn btn-reject" onclick="window.rejectPlanetFromMod('${planet.id}', '${planet.name.replace(/'/g, "\\'")}')">
                            ✗ Reject
                        </button>
                        <a href="planet.html?id=${planet.id}" class="btn btn-secondary" target="_blank">
                            👁 View
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Approve a planet (moderator only)
     */
    function approvePlanet(id, name) {
        if (!FabledGalaxyData.isModerator()) return;
        
        if (confirm(`Approve "${name}" to be visible in the galaxy?`)) {
            FabledGalaxyData.approvePlanet(id);
            renderPendingPlanets();
            loadPlanets();
        }
    }

    /**
     * Reject a planet (moderator only)
     */
    function rejectPlanet(id, name) {
        if (!FabledGalaxyData.isModerator()) return;
        
        if (confirm(`Reject "${name}"? It will be hidden from the galaxy.`)) {
            FabledGalaxyData.rejectPlanet(id);
            renderPendingPlanets();
        }
    }

    // Expose for inline onclick
    window.approvePlanetFromMod = approvePlanet;
    window.rejectPlanetFromMod = rejectPlanet;

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
