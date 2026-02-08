/**
* Fabled Galaxy - World Data Service
* Manages world storage, retrieval, and moderator functions
 * 
 * For prototype: Uses LocalStorage
 * For production: Replace with API calls to your backend
 */

const FabledGalaxyData = (function() {
    const STORAGE_KEY = 'fabled_galaxy_worlds';
    const MOD_KEY = 'fabled_galaxy_moderator';
    const MOD_PASSWORD = 'galaxymod2026'; // Change this in production!

    /**
     * Initialize with sample data if empty
     */
    function init() {
        const worlds = getWorlds();
        if (worlds.length === 0) {
            // Add sample worlds for demo
            const sampleWorlds = getSampleWorlds();
            sampleWorlds.forEach(world => saveWorld(world));
        }
    }

    /**
     * Get all planets (internal use)
     */
    function getAllPlanetsRaw() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading worlds:', e);
            return [];
        }
    }

    /**
     * Get approved planets (for public display)
     */
    function getPlanets() {
        const worlds = getAllWorldsRaw();
        // Moderators see all approved worlds, regular users see only approved
        return worlds.filter(w => w.status === 'approved');
    }

    /**
     * Get all planets regardless of status (moderator use)
     */
    function getAllPlanets() {
        return getAllWorldsRaw();
    }

    /**
     * Get pending planets (moderator use)
     */
    function getPendingPlanets() {
        const worlds = getAllWorldsRaw();
        return worlds.filter(w => w.status === 'pending');
    }

    /**
     * Get a single planet by ID (can find any status for direct viewing)
     */
    function getPlanet(id) {
        const worlds = getAllWorldsRaw();
        return worlds.find(w => w.id === id);
    }

    /**
     * Save a new planet
     */
    function savePlanet(planetData) {
        const worlds = getAllWorldsRaw();
        
        const world = {
            id: planetData.id || generateId(),
            createdAt: planetData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            
            // Basic info
            name: planetData.planetName || planetData.name,
            type: planetData.planetType || planetData.type || 'unknown',
            description: planetData.planetDescription || planetData.description || '',
            
            // Civilization
            inhabitants: planetData.inhabitants || '',
            civilization: planetData.civilization || '',
            factions: planetData.factions || '',
            
            // Technology
            techLevel: planetData.techLevel || '',
            technology: planetData.technology || '',
            
            // Magic
            magicExists: planetData.magicExists || 'ambiguous',
            magicSystem: planetData.magicSystem || '',
            
            // Lore
            creationMyth: planetData.creationMyth || '',
            legends: planetData.legends || '',
            history: planetData.history || '',
            
            // Meta
            creatorName: planetData.creatorName || 'Anonymous',
            creatorEmail: planetData.creatorEmail || '',
            collaboration: planetData.collaboration || 'locked',
            
            // Visuals
            imageData: planetData.imageData || null,
            planetImage: planetData.planetImage || null,
            
            // Contributions from collaborators
            contributions: planetData.contributions || [],
            
            // Galaxy position (random if not specified)
            position: planetData.position || {
                x: 10 + Math.random() * 80,
                y: 10 + Math.random() * 80
            },
            
            // Display
            color: planetData.color || getRandomWorldColor(),
            
            // Moderation status: pending, approved, rejected
            status: planetData.status || 'pending'
        };
        
        worlds.push(world);

        const FabledGalaxyData = (function() {
            /**
             * Get approved planets (for public display) from Supabase
             */
            async function getPlanets() {
                return await window.loadApprovedWorlds();
            }

            /**
             * Get all planets regardless of status (moderator use)
             */
            async function getAllPlanets() {
                const { data, error } = await window.sb
                    .from("worlds")
                    .select("id, planet_name, planet_type, description, locked, created_at, fields, status")
                    .order("created_at", { ascending: false });
                if (error) throw error;
                return data;
            }

            /**
             * Get pending planets (moderator use)
             */
            async function getPendingPlanets() {
                const { data, error } = await window.sb
                    .from("worlds")
                    .select("id, planet_name, planet_type, description, locked, created_at, fields, status")
                    .eq("status", "pending")
                    .order("created_at", { ascending: false });
                if (error) throw error;
                return data;
            }

            /**
             * Get a single planet by ID
             */
            async function getPlanet(id) {
                return await window.loadWorldById(id);
            }

            /**
             * Save a new planet to Supabase
             */
            async function savePlanet(planetData) {
                const { data, error } = await window.sb
                    .from("worlds")
                    .insert([planetData])
                    .select();
                if (error) throw error;
                return data[0];
            }

            /**
             * Update an existing planet
             */
            async function updatePlanet(id, updates) {
                const { data, error } = await window.sb
                    .from("worlds")
                    .update(updates)
                    .eq("id", id)
                    .select();
                if (error) throw error;
                return data[0];
            }

            /**
             * Delete a planet (moderator only)
             */
            async function deletePlanet(id) {
                const { error } = await window.sb
                    .from("worlds")
                    .delete()
                    .eq("id", id);
                if (error) throw error;
                return true;
            }

            /**
             * Add a contribution to an open planet
             */
            async function addContribution(planetId, contribution) {
                // Fetch planet
                const planet = await getPlanet(planetId);
                if (!planet) throw new Error('World not found');
                if (!planet.fields || planet.fields.collaboration !== 'open') throw new Error('This world is not open for collaboration');
                // Add to contributions array
                const contributions = planet.fields.contributions || [];
                contributions.push({
                    ...contribution,
                    id: 'contrib_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    createdAt: new Date().toISOString()
                });
                // Update planet
                return await updatePlanet(planetId, { fields: { ...planet.fields, contributions } });
            }

            /**
             * Approve a pending planet (moderator only)
             */
            async function approvePlanet(id) {
                return await updatePlanet(id, { status: 'approved' });
            }

            /**
             * Reject a pending planet (moderator only)
             */
            async function rejectPlanet(id) {
                return await updatePlanet(id, { status: 'rejected' });
            }

            /**
             * Get planet type display info
             */
            function getPlanetTypeInfo(type) {
                const types = {
                    'terrestrial': { emoji: '🌍', label: 'Terrestrial World' },
                    'ocean': { emoji: '🌊', label: 'Ocean World' },
                    'desert': { emoji: '🏜️', label: 'Desert World' },
                    'ice': { emoji: '❄️', label: 'Ice World' },
                    'volcanic': { emoji: '🌋', label: 'Volcanic World' },
                    'forest': { emoji: '🌲', label: 'Forest World' },
                    'sky': { emoji: '☁️', label: 'Sky World' },
                    'crystal': { emoji: '💎', label: 'Crystal World' },
                    'dark': { emoji: '🌑', label: 'Dark World' },
                    'arcane': { emoji: '🔮', label: 'Arcane World' },
                    'city': { emoji: '🏙️', label: 'City World' },
                    'other': { emoji: '✦', label: 'Unique World' },
                    'unknown': { emoji: '❓', label: 'Unknown World' }
                };
                return types[type] || types['unknown'];
            }

            // Export/import utilities can be added as needed

            return {
                getPlanets,
                getAllPlanets,
                getPendingPlanets,
                getPlanet,
                savePlanet,
                updatePlanet,
                deletePlanet,
                addContribution,
                approvePlanet,
                rejectPlanet,
                getPlanetTypeInfo
            };
        })();
        try {
