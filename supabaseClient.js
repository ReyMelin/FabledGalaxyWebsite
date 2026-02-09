// supabaseClient.js
(function () {
  // ✅ 1) Create the Supabase client ONCE
  if (!window.sb) {
    const SUPABASE_URL = "https://uyhooadpxmausptmtsdm.supabase.co";
    const SUPABASE_ANON_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5aG9vYWRweG1hdXNwdG10c2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODYyNjIsImV4cCI6MjA4NTk2MjI2Mn0.JNxXmQrFIB4QOem3LoScmWJXg-wNUipgDzhWwusns9s";

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.error("Supabase SDK not loaded. Make sure the CDN script is before supabaseClient.js");
      return;
    }

    window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  // ✅ 2) Data helpers (your existing ones)
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
      art_url: null,
      locked: !!payload.locked,
      fields: { ...(payload.fields || {}), creator_name: payload.creator_name || null },
      status: "pending",
    });

    if (res.error) throw res.error;
  };

  window.loadApprovedWorlds = async function () {
    const res = await window.sb
      .from("worlds")
      .select("id, planet_name, planet_type, description, locked, created_at, fields")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (res.error) throw res.error;
    return res.data;
  };

  window.loadWorldById = async function (id) {
    const res = await window.sb
      .from("worlds")
      .select("id, planet_name, planet_type, description, locked, created_at, fields")
      .eq("id", id)
      .eq("status", "approved")
      .single();

    if (res.error) return null;
    return res.data;
  };

  // ✅ 3) Auth helpers
  window.loginWithDiscord = async function () {
    // Store where we came from so callback can return there
    localStorage.setItem("fg_next", window.location.href);

    const redirectTo = `${window.location.origin}/FabledGalaxyWebsite/auth-callback.html`;

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

  // ✅ 4) Auth UI
  window.updateAuthUI = async function () {
    const authContainer = document.getElementById("auth-container");
    if (!authContainer) return;

    const user = await window.getCurrentUser();

    if (user) {
      const username =
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

  // Run UI update on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.updateAuthUI());
  } else {
    window.updateAuthUI();
  }
})();
