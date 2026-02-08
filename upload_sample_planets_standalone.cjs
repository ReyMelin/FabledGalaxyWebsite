// Standalone script to upload sample planets to Supabase (no browser emulation)
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://uyhooadpxmausptmtsdm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5aG9vYWRweG1hdXNwdG10c2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODYyNjIsImV4cCI6MjA4NTk2MjI2Mn0.JNxXmQrFIB4QOem3LoScmWJXg-wNUipgDzhWwusns9s";

const samplePlanets = [
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

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function uploadSamplePlanets() {
  for (const planet of samplePlanets) {
    // Map to Supabase schema (no color field)
    const payload = {
      planet_name: planet.name,
      planet_type: planet.type,
      description: planet.description,
      locked: planet.collaboration !== 'open',
      art_url: null,
      status: 'approved',
      fields: {
        inhabitants: planet.inhabitants,
        civilization: planet.civilization,
        factions: planet.factions,
        techLevel: planet.techLevel,
        technology: planet.technology,
        magicExists: planet.magicExists,
        magicSystem: planet.magicSystem,
        creationMyth: planet.creationMyth,
        legends: planet.legends,
        history: planet.history,
        creator_name: planet.creatorName,
        planetImage: planet.planetImage,
        position: planet.position
      },
      creator_email: 'reymelin2024@gmail.com',
      created_at: planet.createdAt || new Date().toISOString(),
    };
    const { error } = await sb.from("worlds").insert(payload);
    if (error) {
      console.error("Failed to upload", planet.name, error.message);
    } else {
      console.log("Uploaded", planet.name);
    }
  }
}

uploadSamplePlanets();
