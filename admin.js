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
      <h2>Login Required</h2>
      <p>You must be logged in as an admin to access this page.</p>
      <a href="/auth-callback.html"><button>Login with Discord</button></a>
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
        <h3>${world.planet_name}</h3>
        <div>by ${world.fields?.creator_name ?? ''}</div>
        <div>${formatDate(world.created_at)}</div>
        <div>${world.planet_type}</div>
        ${world.locked ? '<div>🔒 Locked</div>' : ''}
        <p>${world.description}</p>
        <button onclick="window.showFields(${world.id})">View All Fields</button>
        <button onclick="window.handleApprove(${world.id})">✓ Approve</button>
        <button onclick="window.handleReject(${world.id})">✕ Reject</button>
      </div>
    `;
  }

  async function renderPendingList() {
    try {
      const worlds = await loadPending();
      if (worlds.length === 0) {
        mainContent.innerHTML = `
          <h2>No Pending Submissions</h2>
          <p>All world submissions have been reviewed.</p>
        `;
        return;
      }
      mainContent.innerHTML = worlds.map(renderWorldCard).join('');
    } catch (error) {
      mainContent.innerHTML = `<div>Error loading pending worlds:<br>${error.message}</div>`;
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
