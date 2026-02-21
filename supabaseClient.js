// supabaseClient.js
(function () {
  // --- Config ---
  const SUPABASE_URL = "https://uyhooadpxmausptmtsdm.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5aG9vYWRweG1hdXNwdG10c2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODYyNjIsImV4cCI6MjA4NTk2MjI2Mn0.JNxXmQrFIB4QOem3LoScmWJXg-wNUipgDzhWwusns9s";

  // Detect base path (works for both /FabledGalaxyWebsite/* and root domain)
  function getBasePath() {
    // If you deploy on GitHub Pages under /FabledGalaxyWebsite, keep that.
    // If you're on fabledgalaxy.com root, basePath becomes "".
    return window.location.pathname.startsWith("/FabledGalaxyWebsite/")
      ? "/FabledGalaxyWebsite"
      : "";
  }

  // --- 1) Create the Supabase client ONCE ---
  if (!window.sb) {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.error("Supabase SDK not loaded. Make sure the CDN script is before supabaseClient.js");
      return;
    }

    window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // important for OAuth callback parsing
      },
    });
  }

  // --- Utility: wait until sb exists ---
  window.waitForSb = function waitForSb(timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      if (window.sb) return resolve(window.sb);
      const start = Date.now();
      const t = setInterval(() => {
        if (window.sb) {
          clearInterval(t);
          resolve(window.sb);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(t);
          reject(new Error("Supabase client not ready (timeout)."));
        }
      }, 50);
    });
  };

  // --- 2) Data helpers ---
  window.submitWorld = async function (payload) {
    const { data: { user } } = await window.sb.auth.getUser();

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
      art_url: payload.art_url || null, // keep null for MVP; can pass later
      locked: !!payload.locked,
      fields: { ...(payload.fields || {}), creator_name: payload.creator_name || null },
      status: "pending",
    });

    if (res.error) throw res.error;
    return res.data;
  };

  window.loadApprovedWorlds = async function () {
    const res = await window.sb
      .from("worlds")
      .select("id, planet_name, planet_type, description, locked, created_at, fields, art_url, map_x, map_y")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (res.error) throw res.error;
    return res.data;
  };

  window.loadWorldById = async function (id) {
    const res = await window.sb
      .from("worlds")
      .select("id, planet_name, planet_type, description, locked, created_at, fields, art_url")
      .eq("id", id)
      .eq("status", "approved")
      .single();

    if (res.error) return null;
    return res.data;
  };

  // --- 3) Auth helpers ---
  window.loginWithDiscord = async function () {
    // Return to the current page (path + query only; avoids tokens/hash)
    localStorage.setItem("fg_next", window.location.pathname + window.location.search);

    // Always callback on SAME origin (works for localhost, github.io, and fabledgalaxy.com)
    const basePath = getBasePath();
    const redirectTo = `${window.location.origin}${basePath}/auth-callback.html`;

    const { error } = await window.sb.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo },
    });

    if (error) throw error;
  };

  window.logout = async function () {
    const { error } = await window.sb.auth.signOut();
    if (error) throw error;
    window.location.reload();
  };

  window.getCurrentUser = async function () {
    const { data: { user } } = await window.sb.auth.getUser();
    return user;
  };

  // --- 4) Admin helpers (for approve/reject/art_url) ---
  window.isAdmin = async function () {
    const user = await window.getCurrentUser();
    if (!user) return false;

    const res = await window.sb
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    // If RLS blocks reading admins, this will error.
    // In that case, you should use the SQL policy I gave earlier (“Admins can read admins”),
    // OR switch to an RPC function check.
    if (res.error) {
      console.warn("isAdmin check failed:", res.error.message);
      return false;
    }
    return !!res.data;
  };

  window.setWorldStatus = async function (worldId, status) {
    if (!["approved", "rejected", "pending"].includes(status)) {
      throw new Error("Invalid status: " + status);
    }

    const res = await window.sb
      .from("worlds")
      .update({ status })
      .eq("id", worldId);

    if (res.error) throw res.error;
    return true;
  };

  window.setWorldCoords = async function (worldId, map_x, map_y) {
    const res = await window.sb
      .from("worlds")
      .update({ map_x, map_y })
      .eq("id", worldId);

    if (res.error) throw res.error;
    return true;
  };

  window.setWorldArtUrl = async function (worldId, art_url) {
    // allow clearing art_url by passing null/empty
    const normalized = art_url && String(art_url).trim() ? String(art_url).trim() : null;

    const res = await window.sb
      .from("worlds")
      .update({ art_url: normalized })
      .eq("id", worldId);

    if (res.error) throw res.error;
    return true;
  };

  // --- 5) Auth UI (more reliable) ---
  window.updateAuthUI = async function () {
    const authContainer = document.getElementById("auth-container");
    if (!authContainer) return;

    const user = await window.getCurrentUser();

    if (user) {
      const username =
        user.user_metadata?.custom_claims?.global_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User";

      const avatar = user.user_metadata?.avatar_url;

      authContainer.innerHTML = `
        <div class="auth-user">
          ${avatar ? `<img src="${avatar}" alt="" class="auth-avatar">` : ""}
          <span class="auth-username">${username}</span>
          <button onclick="window.logout()" class="btn-auth btn-logout">Logout</button>
        </div>
      `;
    } else {
      authContainer.innerHTML = `
        <button onclick="window.loginWithDiscord()" class="btn-auth btn-discord-login">
          Login with Discord
        </button>
      `;
    }
  };

  // Hydrate + auto-update UI on auth state changes
  (async () => {
    try {
      // Loads session from storage (important on first page load)
      await window.sb.auth.getSession();
    } catch (e) {
      // non-fatal
    }
    window.updateAuthUI();

    window.sb.auth.onAuthStateChange(() => {
      window.updateAuthUI();
    });
  })();
})();
