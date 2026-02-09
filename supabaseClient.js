
// Prevent double initialization if the script is loaded twice
if (!window.sb) {
  const SUPABASE_URL = "https://uyhooadpxmausptmtsdm.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5aG9vYWRweG1hdXNwdG10c2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODYyNjIsImV4cCI6MjA4NTk2MjI2Mn0.JNxXmQrFIB4QOem3LoScmWJXg-wNUipgDzhWwusns9s";
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.error('Supabase library not loaded: window.supabase is undefined.');
  }
}

window.submitWorld = async function(payload) {
  // Check if user is logged in (optional - email can be used instead)
  const { data: { user } } = await window.sb.auth.getUser();

  // Require either a logged-in user OR an email address
  if (!user && !payload.creator_email) {
    throw new Error("Please provide an email address for your submission.");
  }

  const res = await window.sb.from("worlds").insert({
    created_by: user ? user.id : null,
    creator_email: payload.creator_email || (user ? user.email : null),
    planet_name: payload.planet_name,
    planet_type: payload.planet_type,
    description: payload.description,
    quadrant: payload.quadrant || null,
    weather: payload.weather || null,
    art_url: null,
    locked: !!payload.locked,
    fields: { ...(payload.fields || {}), creator_name: payload.creator_name || null },
    status: "pending"
  });

  if (res.error) throw res.error;
};

window.loadApprovedWorlds = async function() {
  const res = await window.sb
    .from("worlds")
    .select("id, planet_name, planet_type, description, locked, created_at, fields")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (res.error) throw res.error;
  return res.data;
};

window.loadWorldById = async function(id) {
  const res = await window.sb
    .from("worlds")
    .select("id, planet_name, planet_type, description, locked, created_at, fields")
    .eq("id", id)
    .eq("status", "approved")
    .single();

  if (res.error) return null;
  return res.data;
};

// Auth functions
window.loginWithDiscord = async function() {
  const next = encodeURIComponent(window.location.href);
  const redirectTo = `${window.location.origin}/FabledGalaxyWebsite/auth-callback.html?next=${next}`;
  const { error } = await window.sb.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo
    }
  });
  if (error) throw error;
};

window.logout = async function() {
  const { error } = await window.sb.auth.signOut();
  if (error) throw error;
  window.location.reload();
};

window.getCurrentUser = async function() {
  const { data: { user } } = await window.sb.auth.getUser();
  return user;
};

// Update auth UI on page load
window.updateAuthUI = async function() {
  const authContainer = document.getElementById('auth-container');
  if (!authContainer) return;
  
  const user = await window.getCurrentUser();
  
  if (user) {
    const username = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    const avatar = user.user_metadata?.avatar_url;
    authContainer.innerHTML = `
      <div class="auth-user">
        ${avatar ? `<img src="${avatar}" alt="" class="auth-avatar">` : ''}
        <span class="auth-username">${username}</span>
        <button onclick="window.logout()" class="btn-auth btn-logout">Logout</button>
      </div>
    `;
  } else {
    authContainer.innerHTML = `
      <button onclick="window.loginWithDiscord()" class="btn-auth btn-discord-login">
        <svg class="discord-icon-small" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        Login with Discord
      </button>
    `;
  }
};

// Auto-update UI when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.updateAuthUI());
} else {
  window.updateAuthUI();
}
