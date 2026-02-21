// admin.js
(async () => {
  // --- helpers ---
  async function ensureSbReady() {
    await new Promise((r) => {
      if (window.sb) return r();
      const t = setInterval(() => (window.sb ? (clearInterval(t), r()) : null), 50);
    });
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  }

  function renderFields(fields) {
    if (!fields || Object.keys(fields).length === 0) return "<div>No additional fields</div>";
    return Object.entries(fields).map(([k, v]) => `
      <div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v || "Not provided")}</div>
    `).join("");
  }

  // --- boot ---
  await ensureSbReady();

  const mainContent = document.getElementById("main-content");
  const worldsList = document.getElementById("worlds-list");
  const uploadDropzone = document.getElementById("upload-dropzone");

  // Require admin via RPC
  async function requireAdmin() {
    const { data, error } = await window.sb.rpc("is_admin");
    if (error) throw error;
    if (!data) throw new Error("Not an admin");
    return true;
  }

  // Require login
  const { data: { user } } = await window.sb.auth.getUser();
  if (!user) {
    mainContent.innerHTML = `
      <div class="login-required">
        <h2>Login Required</h2>
        <p>You must be logged in as an admin to access this page.</p>
        <button class="btn btn-discord-login" onclick="window.loginWithDiscord?.()">Login with Discord</button>
      </div>
    `;
    return;
  }

  try {
    await requireAdmin();
  } catch (e) {
    mainContent.innerHTML = `
      <div class="error-message">
        <strong>Access denied:</strong><br>
        ${escapeHtml(e.message)}
      </div>
    `;
    return;
  }

  // --- data ---
  async function loadPending() {
    const res = await window.sb
      .from("worlds")
      .select("id, planet_name, planet_type, description, created_at, fields, locked, creator_email, quadrant, weather, art_url")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (res.error) throw res.error;
    return res.data || [];
  }

  async function setStatus(id, status) {
    if (status !== "approved" && status !== "rejected") {
      throw new Error("Invalid status: " + status);
    }

    // When approving, assign random map coordinates so the planet has a
    // fixed position on the galaxy map.  Non-admin visitors cannot write
    // to the worlds table, so this must happen here.
    const updatePayload = { status };
    if (status === "approved") {
      updatePayload.map_x = Math.round((Math.random() * 0.8 + 0.1) * 100) / 100; // 0.10-0.90
      updatePayload.map_y = Math.round((Math.random() * 0.8 + 0.1) * 100) / 100;
    }

    const { error } = await window.sb
      .from("worlds")
      .update(updatePayload)
      .eq("id", id);

    if (error) throw error;
  }

// --- world card renderer ---
function renderWorldCard(world) {
  return `
    <div class="world-card" data-id="${world.id}">
      <div class="world-header">
        <div>
          <h3 class="world-title">${escapeHtml(world.planet_name)}</h3>
          <div class="world-meta">
            <span>by ${escapeHtml(world.fields?.creator_name ?? "Unknown")}</span>
            <span>${escapeHtml(formatDate(world.created_at))}</span>
          </div>
        </div>
        <div class="world-header-flexgap">
          <span class="world-type">${escapeHtml(world.planet_type || "unknown")}</span>
          ${world.locked ? '<span class="world-locked">🔒 Locked</span>' : ""}
        </div>
      </div>

      <p class="world-description">${escapeHtml(world.description || "")}</p>

      ${world.art_url ? `<img src="${escapeHtml(world.art_url)}" alt="Art for ${escapeHtml(world.planet_name)}" class="world-art">` : ""}

      <details class="world-fields">
        <summary>View All Fields</summary>
        <div class="world-fields-content">${renderFields(world.fields)}</div>
      </details>

      <div class="world-actions">
        <button class="btn btn-approve" data-action="approve">✓ Approve</button>
        <button class="btn btn-reject" data-action="reject">✕ Reject</button>
      </div>
    </div>
  `;
}

  async function renderPendingList() {
    try {
      if (!worldsList) return;
      const worlds = await loadPending();
      if (worlds.length === 0) {
        worldsList.innerHTML = `
          <div class="empty-state">
            <h3>No Pending Submissions</h3>
            <p>All world submissions have been reviewed.</p>
          </div>
        `;
        return;
      }

      worldsList.innerHTML = worlds.map(renderWorldCard).join("");

      // button handlers (event delegation)
      worldsList.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;

        const card = e.target.closest(".world-card");
        const id = card?.dataset?.id;
        if (!id) return;

        const action = btn.dataset.action;

        const buttons = card.querySelectorAll("button");
        buttons.forEach(b => b.disabled = true);

        try {
          await setStatus(id, action === "approve" ? "approved" : "rejected");
          card.style.opacity = "0.5";
          card.style.transform = "scale(0.98)";
          setTimeout(() => card.remove(), 250);
        } catch (err) {
          alert(`Error ${action}ing: ${err.message}`);
          buttons.forEach(b => b.disabled = false);
        }
      });
      // Remove Loading... message if present
      const loadingElem = document.getElementById('loadingMessage');
      if (loadingElem) {
        loadingElem.remove();
      }
    } catch (err) {
      if (worldsList) {
        worldsList.innerHTML = `
          <div class="error-message">
            <strong>Error loading pending worlds:</strong><br>
            ${escapeHtml(err.message)}
          </div>
        `;
      }
    }
  }

  // --- art upload ---
  // Render upload art UI
  if (uploadDropzone) {
    uploadDropzone.innerHTML = `
      <div class="upload-art-section">
        <h2>Upload World Art</h2>
        <select id="art-world-select"></select>
        <div class="drag-drop-box" id="drag-drop-box" tabindex="0">
          <span class="upload-text">Drag & drop an image here or <span class="browse-link">browse</span></span>
          <input type="file" id="art-file-input" accept="image/*" />
          <div class="upload-preview" id="art-preview"></div>
        </div>
        <button id="art-upload-btn">Upload Art</button>
        <div id="art-status"></div>
      </div>
    `;
  }

  const dropzone = document.getElementById("drag-drop-box");
  const fileInput = document.getElementById("art-file-input");
  const preview = document.getElementById("art-preview");
  const statusEl = document.getElementById("art-status");
  const worldSelect = document.getElementById("art-world-select");
  const uploadBtn = document.getElementById("art-upload-btn");

  // Make drag-drop-box clickable to open file dialog
  dropzone?.addEventListener("click", (e) => {
    // Only trigger if not clicking the preview or button
    if (e.target === dropzone || e.target.classList.contains("upload-text") || e.target.classList.contains("browse-link")) {
      fileInput?.click();
    }
  });
  // Also allow keyboard activation
  dropzone?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      fileInput?.click();
      e.preventDefault();
    }
  });

  function setStatusText(msg) { if (statusEl) statusEl.textContent = msg; }

  function showPreview(file) {
    preview.innerHTML = "";
    if (!file) return;

    const url = URL.createObjectURL(file);
    preview.innerHTML = `
      <div class="preview-flex">
        <img src="${url}" alt="preview" class="preview-img" />
        <div>
          <div><strong>${escapeHtml(file.name)}</strong></div>
          <div class="muted">${Math.round(file.size / 1024)} KB</div>
        </div>
      </div>
    `;
  }

  async function loadWorldsForArtSelect() {
    const { data, error } = await window.sb
      .from("worlds")
      .select("id, planet_name")
      .order("created_at", { ascending: false });

    if (error) throw error;

    worldSelect.innerHTML = data
      .map(w => `<option value="${w.id}">${escapeHtml(w.planet_name || w.id)}</option>`)
      .join("");
  }

  async function uploadArtAndAttach(worldId, file) {
    const okTypes = ["image/png", "image/jpeg", "image/webp", "image/avif"];
    if (!okTypes.includes(file.type)) throw new Error("Please upload a PNG, JPG, WEBP, or AVIF.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Max file size is 10MB.");

    const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, "_");
    const path = `worlds/${worldId}/${Date.now()}-${safeName}`;

    const { error: upErr } = await window.sb
      .storage
      .from("world-art")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) throw upErr;

    const { data: pub } = window.sb.storage.from("world-art").getPublicUrl(path);
    const artUrl = pub?.publicUrl;
    if (!artUrl) throw new Error("Upload succeeded, but could not get public URL.");

    const { error: dbErr } = await window.sb
      .from("worlds")
      .update({ art_url: artUrl })
      .eq("id", worldId);

    if (dbErr) throw dbErr;

    return artUrl;
  }

  // drag/drop wiring
  let currentFile = null;

  ["dragenter", "dragover"].forEach(evt =>
    dropzone?.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("dragover"); })
  );
  ["dragleave", "drop"].forEach(evt =>
    dropzone?.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("dragover"); })
  );

  dropzone?.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    currentFile = file;
    showPreview(file);
    setStatusText("");
  });

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    currentFile = file;
    showPreview(file);
    setStatusText("");
  });

  uploadBtn?.addEventListener("click", async () => {
    const worldId = worldSelect?.value;
    if (!worldId) return setStatusText("Pick a world first.");
    if (!currentFile) return setStatusText("Choose an image first.");

    setStatusText("Uploading…");
    try {
      const url = await uploadArtAndAttach(worldId, currentFile);
      setStatusText("✅ Attached! Art URL saved.");
      preview.innerHTML += `<div class="preview-link"><a href="${escapeHtml(url)}" target="_blank" rel="noopener">View uploaded image</a></div>`;
    } catch (e) {
      setStatusText("❌ " + (e?.message || "Upload failed."));
    }
  });

  // --- backfill coords for already-approved worlds that are missing them ---
  async function backfillCoords() {
    const { data, error } = await window.sb
      .from("worlds")
      .select("id")
      .eq("status", "approved")
      .is("map_x", null);

    if (error) { console.warn("backfillCoords query error:", error.message); return; }
    if (!data || data.length === 0) return;

    for (const w of data) {
      const mx = Math.round((Math.random() * 0.6 + 0.1) * 100) / 100;
      const my = Math.round((Math.random() * 0.8 + 0.1) * 100) / 100;
      const { error: ue } = await window.sb
        .from("worlds")
        .update({ map_x: mx, map_y: my })
        .eq("id", w.id);
      if (ue) console.warn("backfill error for", w.id, ue.message);
    }
    console.log(`Backfilled coords for ${data.length} world(s).`);
  }

  // --- start ---
  await renderPendingList();
  await loadWorldsForArtSelect();
  await backfillCoords();
})();
