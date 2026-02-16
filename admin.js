// Admin Panel logic for admin.html

// Wait for Supabase client to initialize
(async () => {
  // Check session
  const sessionResult = await window.sb.auth.getSession();
  if (sessionResult.error) {
    console.warn("Session error", sessionResult.error.message);
  }

  // Wait for supabaseClient.js to initialize
  await new Promise(resolve => {
    if (window.sb) resolve();
    else {
      const check = setInterval(() => {
        if (window.sb) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    }
  });

  const mainContent = document.getElementById('main-content');

  // Check if user is admin
  async function requireAdmin() {
    const { data, error } = await window.sb.rpc('is_admin');
    if (error) throw error;
    if (!data) throw new Error("Not an admin");
    return true;
  }

  // Check if user is logged in and admin
  const { data: { user } } = await window.sb.auth.getUser();
  if (!user) {
    mainContent.innerHTML = `
      <div class="login-required">
        <h2>Login Required</h2>
        <p>You must be logged in as an admin to access this page.</p>
        <button class="btn btn-discord-login" onclick="window.loginWithDiscord?.()">Login with Discord</button>
      </div>
    `;
    throw new Error("Not logged in");
  }
  await requireAdmin();

  async function loadPending() {
    const res = await window.sb
      .from("worlds")
      .select("id, planet_name, planet_type, description, created_at, fields, locked, creator_email, quadrant, weather")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (res.error) throw res.error;
    return res.data;
  }

  async function setStatus(id, status) {
    const res = await window.sb
      .from("worlds")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    if (res.error) throw res.error;
  }
async function ensureSbReady() {
  await new Promise((r) => {
    if (window.sb) return r();
    const t = setInterval(() => (window.sb ? (clearInterval(t), r()) : null), 50);
  });
}

async function loadWorldsForArtSelect() {
  // You can decide: approved only, or pending too
  const { data, error } = await window.sb
    .from("worlds")
    .select("id, planet_name")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const sel = document.getElementById("art-world-select");
  sel.innerHTML = data
    .map(w => `<option value="${w.id}">${escapeHtml(w.planet_name || w.id)}</option>`)
    .join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function showStatus(msg) {
  const el = document.getElementById("art-status");
  if (el) el.textContent = msg;
}

function showPreview(file) {
  const preview = document.getElementById("art-preview");
  if (!preview) return;

  if (!file) {
    preview.innerHTML = "";
    return;
  }

  const url = URL.createObjectURL(file);
  preview.innerHTML = `
    <div style="display:flex; gap:12px; align-items:center;">
      <img src="${url}" alt="preview" style="width:120px;height:120px;object-fit:cover;border-radius:12px;border:1px solid rgba(255,255,255,.15);" />
      <div>
        <div><strong>${escapeHtml(file.name)}</strong></div>
        <div class="muted">${Math.round(file.size/1024)} KB</div>
      </div>
    </div>
  `;
}

async function uploadArtAndAttach(worldId, file) {
  // Basic validation
  const okTypes = ["image/png", "image/jpeg", "image/webp", "image/avif"];
  if (!okTypes.includes(file.type)) throw new Error("Please upload a PNG, JPG, WEBP, or AVIF.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Max file size is 10MB.");

  // Create a nice unique path
  const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, "_");
  const path = `worlds/${worldId}/${Date.now()}-${safeName}`;

  // Upload to public bucket
  const { error: upErr } = await window.sb
    .storage
    .from("world-art")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (upErr) throw upErr;

  // Get public URL
  const { data: pub } = window.sb
    .storage
    .from("world-art")
    .getPublicUrl(path);

  const artUrl = pub?.publicUrl;
  if (!artUrl) throw new Error("Upload succeeded, but could not get public URL.");

  // Attach to the world row
  const { error: dbErr } = await window.sb
    .from("worlds")
    .update({ art_url: artUrl })
    .eq("id", worldId);

  if (dbErr) throw dbErr;

  return artUrl;
}

document.addEventListener("DOMContentLoaded", async () => {
  await ensureSbReady();

  // Fill dropdown
  try {
    await loadWorldsForArtSelect();
  } catch (e) {
    console.error(e);
    showStatus("Could not load worlds list.");
  }

  // Preview on file choose
  const fileInput = document.getElementById("art-file");
  fileInput?.addEventListener("change", () => {
    showPreview(fileInput.files?.[0]);
  });

  // Upload button
  document.getElementById("art-upload-btn")?.addEventListener("click", async () => {
    const worldId = document.getElementById("art-world-select")?.value;
    const file = document.getElementById("art-file")?.files?.[0];

    if (!worldId) return showStatus("Pick a world first.");
    if (!file) return showStatus("Choose an image first.");

    showStatus("Uploading…");
    try {
      const url = await uploadArtAndAttach(worldId, file);
      showStatus("✅ Attached! Art URL saved to world.");
      // Optional: display the final URL
      const preview = document.getElementById("art-preview");
      if (preview) {
        preview.innerHTML += `<div style="margin-top:10px;"><a href="${url}" target="_blank" rel="noopener">View uploaded image</a></div>`;
      }
    } catch (e) {
      console.error(e);
      showStatus("❌ " + (e?.message || "Upload failed."));
    }
  });
});

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function renderFields(fields) {
    if (!fields || Object.keys(fields).length === 0) {
      return '<div>No additional fields</div>';
    }
    return Object.entries(fields).map(([key, value]) => `
      <div><strong>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> ${value || 'Not provided'}</div>
    `).join('');
  }

  function renderWorldCard(world) {
    return `
      <div class="world-card" data-id="${world.id}">
        <div class="world-header">
          <div>
            <h3 class="world-title">${world.planet_name}</h3>
            <div class="world-meta">
              <span>by ${world.fields?.creator_name ?? 'Unknown'}</span>
              <span>${formatDate(world.created_at)}</span>
            </div>
          </div>
          <div class="world-header-flexgap">
            <span class="world-type">${world.planet_type || 'unknown'}</span>
            ${world.locked ? '<span class="world-locked">🔒 Locked</span>' : ''}
          </div>
        </div>

        <p class="world-description">${world.description || ''}</p>

        ${world.art_url ? `<img src="${world.art_url}" alt="Art for ${escapeHtml(world.planet_name)}" class="world-art">` : ''}

        <details class="world-fields">
          <summary>View All Fields</summary>
          <div class="world-fields-content">
            ${renderFields(world.fields)}
          </div>
        </details>

        <div class="world-actions">
          <button class="btn btn-approve" onclick="window.handleApprove('${world.id}')">✓ Approve</button>
          <button class="btn btn-reject" onclick="window.handleReject('${world.id}')">✕ Reject</button>
        </div>
      </div>
    `;
  }

  async function renderPendingList() {
    try {
      const worlds = await loadPending();
      if (!worlds || worlds.length === 0) {
        mainContent.innerHTML = `
          <div class="empty-state">
            <h3>No Pending Submissions</h3>
            <p>All world submissions have been reviewed.</p>
          </div>
        `;
        return;
      }
      mainContent.innerHTML = `
        <div class="pending-list">
          ${worlds.map(renderWorldCard).join('')}
        </div>
      `;
    } catch (error) {
      mainContent.innerHTML = `
        <div class="error-message">
          <strong>Error loading pending worlds:</strong><br>
          ${error.message}
        </div>
      `;
    }
  }

  window.handleApprove = async function(id) {
    const card = document.querySelector(`[data-id="${id}"]`);
    const buttons = card.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);
    try {
      await setStatus(id, 'approved');
      card.style.opacity = '0.5';
      card.style.transform = 'scale(0.98)';
      setTimeout(() => {
        card.remove();
        const remaining = document.querySelectorAll('.world-card');
        if (remaining.length === 0) {
          renderPendingList();
        }
      }, 300);
    } catch (error) {
      alert('Error approving: ' + error.message);
      buttons.forEach(btn => btn.disabled = false);
    }
  };

  window.handleReject = async function(id) {
    if (!confirm('Are you sure you want to reject this submission?')) {
      return;
    }
    const card = document.querySelector(`[data-id="${id}"]`);
    const buttons = card.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);
    try {
      await setStatus(id, 'rejected');
      card.style.opacity = '0.5';
      card.style.transform = 'scale(0.98)';
      setTimeout(() => {
        card.remove();
        const remaining = document.querySelectorAll('.world-card');
        if (remaining.length === 0) {
          renderPendingList();
        }
      }, 300);
    } catch (error) {
      alert('Error rejecting: ' + error.message);
      buttons.forEach(btn => btn.disabled = false);
    }
  };

  // Initial render
  renderPendingList();

  // Optional: show fields modal
  window.showFields = function(id) {
    const world = Array.from(document.querySelectorAll('.world-card'))
      .map(card => card.dataset.id == id ? card : null)
      .filter(Boolean)[0];
    // You can implement a modal or popup here if needed
    alert('Show fields for world ID: ' + id);
  };
})();
