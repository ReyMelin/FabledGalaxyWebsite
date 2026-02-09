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
        // LocalStorage fallback removed for production
        return [];
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
        // LocalStorage save disabled for production
        return null;
    }
        
            // Utility functions for localStorage
            function getAllWorldsRaw() {
                // LocalStorage fallback removed for production
                return [];
            }

            function setWorlds(worlds) {
                // LocalStorage save disabled for production
            }
        
            function generateId() {
                return 'planet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            }
        
            function getSampleWorlds() {
                return [
                    {
                        id: generateId(),
                        name: 'Terra Prime',
                        type: 'terrestrial',
                        description: 'A lush, Earth-like world.',
                        status: 'approved',
                        creatorName: 'DemoUser',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        color: getRandomWorldColor(),
                        position: { x: 20, y: 30 }
                    },
                    {
                        id: generateId(),
                        name: 'Aqua Sphere',
                        type: 'ocean',
                        description: 'A water world with floating cities.',
                        status: 'approved',
                        creatorName: 'DemoUser',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        color: getRandomWorldColor(),
                        position: { x: 50, y: 60 }
                    }
                ];
            }
        
            function getRandomWorldColor() {
                const colors = ['#6ec1e4', '#e4b96e', '#6ee4a1', '#e46e9c', '#b96ee4', '#e46e6e', '#6ee4e4'];
                return colors[Math.floor(Math.random() * colors.length)];
            }
        
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
        
            // Exported API
            return {
                init,
                getPlanets,
                getAllPlanets,
                getPendingPlanets,
                getPlanet,
                savePlanet,
                getPlanetTypeInfo
            };
        })();
