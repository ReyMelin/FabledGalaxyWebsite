/**
 * Fabled Galaxy - Planet Data Service
 * Manages planet storage, retrieval, and moderator functions
 * 
 * For prototype: Uses LocalStorage
 * For production: Replace with API calls to your backend
 */

const FabledGalaxyData = (function() {
    const STORAGE_KEY = 'fabled_galaxy_planets';
    const MOD_KEY = 'fabled_galaxy_moderator';
    const MOD_PASSWORD = 'galaxymod2026'; // Change this in production!

    /**
     * Initialize with sample data if empty
     */
    function init() {
        const planets = getPlanets();
        if (planets.length === 0) {
            // Add sample planets for demo
            const samplePlanets = getSamplePlanets();
            samplePlanets.forEach(planet => savePlanet(planet));
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
            console.error('Error reading planets:', e);
            return [];
        }
    }

    /**
     * Get approved planets (for public display)
     */
    function getPlanets() {
        const planets = getAllPlanetsRaw();
        // Moderators see all approved planets, regular users see only approved
        return planets.filter(p => p.status === 'approved');
    }

    /**
     * Get all planets regardless of status (moderator use)
     */
    function getAllPlanets() {
        return getAllPlanetsRaw();
    }

    /**
     * Get pending planets (moderator use)
     */
    function getPendingPlanets() {
        const planets = getAllPlanetsRaw();
        return planets.filter(p => p.status === 'pending');
    }

    /**
     * Get a single planet by ID (can find any status for direct viewing)
     */
    function getPlanet(id) {
        const planets = getAllPlanetsRaw();
        return planets.find(p => p.id === id);
    }

    /**
     * Save a new planet
     */
    function savePlanet(planetData) {
        const planets = getAllPlanetsRaw();
        
        const planet = {
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
            color: planetData.color || getRandomPlanetColor(),
            
            // Moderation status: pending, approved, rejected
            status: planetData.status || 'pending'
        };
        
        planets.push(planet);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(planets));
        
        return planet;
    }

    /**
     * Add a contribution to an open planet
     */
    function addContribution(planetId, contribution) {
        const planet = getPlanet(planetId);
        
        if (!planet) {
            console.error('Planet not found');
            return null;
        }
        
        if (planet.collaboration !== 'open') {
            console.error('This planet is not open for collaboration');
            return null;
        }
        
        const newContribution = {
            id: 'contrib_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            section: contribution.section, // 'civilization', 'technology', 'magic', 'lore'
            field: contribution.field,     // specific field like 'inhabitants', 'legends', etc.
            content: contribution.content,
            contributorName: contribution.contributorName || 'Anonymous Traveler',
            createdAt: new Date().toISOString()
        };
        
        const contributions = planet.contributions || [];
        contributions.push(newContribution);
        
        return updatePlanet(planetId, { contributions });
    }

    /**
     * Update an existing planet
     */
    function updatePlanet(id, updates) {
        const planets = getPlanets();
        const index = planets.findIndex(p => p.id === id);
        
        if (index === -1) return null;
        
        planets[index] = {
            ...planets[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(planets));
        return planets[index];
    }

    /**
     * Delete a planet (moderator only)
     */
    function deletePlanet(id) {
        if (!isModerator()) {
            console.error('Unauthorized: Only moderators can delete planets');
            return false;
        }
        
        const planets = getPlanets();
        const filtered = planets.filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return true;
    }

    /**
     * Moderator authentication
     */
    function loginModerator(password) {
        if (password === MOD_PASSWORD) {
            localStorage.setItem(MOD_KEY, 'true');
            return true;
        }
        return false;
    }

    function logoutModerator() {
        localStorage.removeItem(MOD_KEY);
    }

    function isModerator() {
        return localStorage.getItem(MOD_KEY) === 'true';
    }

    /**
     * Approve a pending planet (moderator only)
     */
    function approvePlanet(id) {
        if (!isModerator()) {
            console.error('Unauthorized: Only moderators can approve planets');
            return false;
        }
        return updatePlanetStatus(id, 'approved');
    }

    /**
     * Reject a pending planet (moderator only)
     */
    function rejectPlanet(id) {
        if (!isModerator()) {
            console.error('Unauthorized: Only moderators can reject planets');
            return false;
        }
        return updatePlanetStatus(id, 'rejected');
    }

    /**
     * Update planet status (internal)
     */
    function updatePlanetStatus(id, status) {
        const planets = getAllPlanetsRaw();
        const index = planets.findIndex(p => p.id === id);
        
        if (index === -1) return null;
        
        planets[index].status = status;
        planets[index].updatedAt = new Date().toISOString();
        planets[index].moderatedAt = new Date().toISOString();
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(planets));
        return planets[index];
    }

    /**
     * Export all data as JSON
     */
    function exportData() {
        const planets = getPlanets();
        const dataStr = JSON.stringify(planets, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `fabled-galaxy-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * Import data from JSON
     */
    function importData(jsonString) {
        try {
            const planets = JSON.parse(jsonString);
            if (Array.isArray(planets)) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(planets));
                return true;
            }
        } catch (e) {
            console.error('Import error:', e);
        }
        return false;
    }

    /**
     * Generate unique ID
     */
    function generateId() {
        return 'planet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get random planet color for galaxy map
     */
    function getRandomPlanetColor() {
        const colors = [
            '#7c5bf5', // Purple
            '#00d9ff', // Cyan
            '#ff6b9d', // Pink
            '#ffd700', // Gold
            '#4ade80', // Green
            '#f97316', // Orange
            '#06b6d4', // Teal
            '#a855f7', // Violet
        ];
        return colors[Math.floor(Math.random() * colors.length)];
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

    /**
     * Sample planets for demo
     */
    function getSamplePlanets() {
        return [
            {
                name: 'Luminos Prime',
                type: 'crystal',
                description: 'A world of living crystals that sing with the light of three suns. The surface is covered in prismatic formations that channel energy throughout the planet.',
                inhabitants: 'The Luminari - beings of pure light who take crystalline forms to interact with the physical world.',
                civilization: 'A harmonious society organized around the Great Resonance, where collective thoughts create reality.',
                techLevel: 'magitech',
                technology: 'Crystal-based technology that converts light into matter and energy.',
                magicExists: 'yes',
                magicSystem: 'Light-weaving: The ability to bend and shape photons into solid constructs.',
                creationMyth: 'In the beginning, there was only the First Light. It shattered itself into a billion fragments to create the universe.',
                creatorName: 'StarWeaver',
                collaboration: 'open',
                position: { x: 25, y: 30 },
                color: '#00d9ff',
                planetImage: 'Imgs/New Crystal Galaxy.avif',
                status: 'approved'
            },
            {
                name: 'Verdant Deep',
                type: 'ocean',
                description: 'An endless ocean world where massive kelp forests stretch from the seafloor to the surface, creating layered ecosystems.',
                inhabitants: 'The Tidekeepers - amphibious beings who can breathe both water and air.',
                civilization: 'Nomadic tribes that follow the great migration of bioluminescent leviathans.',
                techLevel: 'ancient',
                technology: 'Bio-organic tools grown from living coral and kelp.',
                magicExists: 'yes',
                magicSystem: 'Current-speaking: The ability to communicate with and command ocean currents.',
                legends: 'The legend of the Abyssal Heart - a massive pearl said to control all the waters of the world.',
                creatorName: 'DeepDreamer',
                collaboration: 'locked',
                position: { x: 55, y: 45 },
                color: '#4ade80',
                planetImage: 'Imgs/eyeship rotated.avif',
                status: 'approved'
            },
            {
                name: 'Ashfall',
                type: 'volcanic',
                description: 'A world of eternal fire where volcanoes paint the sky red and rivers of lava carve the landscape.',
                inhabitants: 'The Ember-Born - humanoids with skin like cooling magma and eyes of flame.',
                civilization: 'Forge-cities built inside dormant volcanoes, powered by geothermal energy.',
                factions: 'The Flame Keepers guard the sacred fires. The Ash Walkers explore the cooling wastelands.',
                techLevel: 'industrial',
                technology: 'Steam and magma-powered machinery, heat-resistant alloys.',
                magicExists: 'rare',
                magicSystem: 'Pyrokenesis exists but is considered a dangerous gift, carefully controlled.',
                history: 'The Great Cooling of 1000 years ago nearly ended civilization until the Forge Pact was signed.',
                creatorName: 'CinderScribe',
                collaboration: 'open',
                position: { x: 35, y: 60 },
                color: '#f97316',
                planetImage: 'Imgs/fractalFingersfULL.avif',
                status: 'approved'
            },
            {
                name: 'Whisperwind',
                type: 'sky',
                description: 'A world with no solid ground - only endless layers of clouds and floating islands held aloft by mysterious forces.',
                inhabitants: 'The Skylark people - humans born with feathered wings and hollow bones.',
                civilization: 'Island nations connected by rope bridges and airship trade routes.',
                techLevel: 'renaissance',
                technology: 'Windmills, gliders, and lighter-than-air vessels.',
                magicExists: 'yes',
                magicSystem: 'Wind-binding: The art of capturing winds in jars and releasing them as needed.',
                creationMyth: 'The world was once solid until the Wind Goddess breathed it into the sky.',
                creatorName: 'CloudChaser',
                collaboration: 'locked',
                position: { x: 70, y: 25 },
                color: '#a855f7',
                planetImage: 'Imgs/spacescapeship.avif',
                status: 'approved'
            },
            {
                name: 'Shadowmere',
                type: 'dark',
                description: 'A world shrouded in eternal twilight where bioluminescent life provides the only illumination.',
                inhabitants: 'The Umbral - pale beings with large eyes adapted to the darkness.',
                civilization: 'Underground cities carved into massive mushroom stems.',
                factions: 'The Light Keepers cultivate glowing gardens. The Deep Dwellers explore the absolute dark.',
                techLevel: 'medieval',
                technology: 'Bio-luminescent cultivation, echo-location devices.',
                magicExists: 'yes',
                magicSystem: 'Shadow-stepping: The ability to travel through darkness instantaneously.',
                legends: 'The Last Dawn - a prophecy that light will one day return to the world.',
                creatorName: 'NightWriter',
                collaboration: 'open',
                position: { x: 65, y: 65 },
                color: '#7c5bf5',
                planetImage: 'Imgs/yogg.avif',
                status: 'approved'
            },
            {
                name: 'Florantine',
                type: 'forest',
                description: 'A lush world where forests of pink-blossomed trees cover entire continents, their roots intertwined in a planet-spanning network of life.',
                inhabitants: 'The Bloomkin - small humanoids who photosynthesize and communicate through pollen clouds.',
                civilization: 'Arboreal communities living in harmony with the Great Grove, where the oldest tree is said to be conscious.',
                factions: 'The Petal Guard protects endangered species. The Root Speakers commune with the forest network.',
                techLevel: 'ancient',
                technology: 'Bio-organic architecture, seed-based messaging systems, living tools that grow to fit their purpose.',
                magicExists: 'yes',
                magicSystem: 'Bloom-weaving: Drawing power from flowers to heal, grow, and transform organic matter.',
                creationMyth: 'The First Seed fell from a dying star and took root in cosmic dust, growing the world from its branches.',
                legends: 'The Eternal Bloom - a flower that grants immortality but only blooms once every thousand years.',
                creatorName: 'PetalScribe',
                collaboration: 'open',
                position: { x: 45, y: 35 },
                color: '#ff6b9d',
                planetImage: 'Imgs/Pink Poppy Flowers.avif',
                status: 'approved'
            }
        ];
    }

    // Public API
    return {
        init,
        getPlanets,
        getAllPlanets,
        getPendingPlanets,
        getPlanet,
        savePlanet,
        updatePlanet,
        deletePlanet,
        addContribution,
        loginModerator,
        logoutModerator,
        isModerator,
        approvePlanet,
        rejectPlanet,
        exportData,
        importData,
        getPlanetTypeInfo
    };
})();

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    FabledGalaxyData.init();
});
