// Utility to upload sample planets from data.js to Supabase
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { getSamplePlanets } from "./data.js";

const SUPABASE_URL = "https://uyhooadpxmausptmtsdm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5aG9vYWRweG1hdXNwdG10c2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODYyNjIsImV4cCI6MjA4NTk2MjI2Mn0.JNxXmQrFIB4QOem3LoScmWJXg-wNUipgDzhWwusns9s";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function uploadSamplePlanets() {
  const planets = getSamplePlanets();
  for (const planet of planets) {
    // Map to Supabase schema
    const payload = {
      planet_name: planet.name,
      planet_type: planet.type,
      description: planet.description,
      locked: planet.collaboration !== 'open',
      color: planet.color,
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
      creator_email: planet.creatorEmail || null,
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
