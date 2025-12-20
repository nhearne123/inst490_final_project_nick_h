
const FRUITS_BASE = "/api/fruits";
const ALL_URL = FRUITS_BASE;

const button = document.getElementById("loadFruits");
const select = document.getElementById("fruitSelect");
const viewBtn = document.getElementById("viewFruitBtn");
const statusMsg = document.getElementById("statusMsg");

const details = document.getElementById("fruitDetails");
const swiperWrapper = document.getElementById("swiperWrapper");

let allFruits = [];
let swiperInstance = null;

let chartInstance = null;
const chartCanvas = document.getElementById("nutritionChart");

let currentFruit = null;

// Favorites UI
const quickSaveBtn = document.getElementById("quickSaveBtn");
const favoriteForm = document.getElementById("favoriteForm");
const favFruitName = document.getElementById("favFruitName");
const favNotes = document.getElementById("favNotes");
const favMsg = document.getElementById("favMsg");
const loadFavoritesBtn = document.getElementById("loadFavoritesBtn");
const favoritesList = document.getElementById("favoritesList");

if (button) button.addEventListener("click", loadAllFruits);
if (viewBtn) viewBtn.addEventListener("click", viewSelectedFruit);

if (favoriteForm) favoriteForm.addEventListener("submit", saveFavoriteFromForm);
if (loadFavoritesBtn) loadFavoritesBtn.addEventListener("click", loadFavorites);
if (quickSaveBtn) quickSaveBtn.addEventListener("click", quickSaveFavorite);


// GET ALL FRUITS
async function loadAllFruits() {
  setStatus("Loading fruits...", false);

  try {
    const res = await fetch(ALL_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("API returned non-array");

    allFruits = data;

    // Fill dropdown
    if (select) {
      select.innerHTML = `<option value="">Select a fruit</option>`;
      allFruits
        .map((f) => f.name)
        .sort((a, b) => a.localeCompare(b))
        .forEach((name) => {
          const opt = document.createElement("option");
          opt.value = name;
          opt.textContent = name;
          select.appendChild(opt);
        });
    }

    // Build swiper (first 12 fruits)
    if (swiperWrapper) buildSwiper(allFruits.slice(0, 12));

    setStatus(`Loaded ${allFruits.length} fruits ✅`, false);
  } catch (err) {
    console.error(err);
    setStatus(`Failed to load fruits: ${err.message}`, true);
  }
}


// Fetch #2: GET ONE FRUIT BY NAME
async function viewSelectedFruit() {
  const name = select?.value;

  if (!name) {
    setStatus("Pick a fruit first.", true);
    return;
  }

  setStatus(`Loading ${name}...`, false);

  try {
    const res = await fetch(`${FRUITS_BASE}/${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const fruit = await res.json();
    currentFruit = fruit;

    renderDetails(fruit);
    renderChart(fruit);

    // Auto-fill favorite name
    if (favFruitName) favFruitName.value = fruit.name || "";

    // Enable quick save
    if (quickSaveBtn) quickSaveBtn.disabled = false;

    setStatus(`Showing: ${fruit.name} ✅`, false);
  } catch (err) {
    console.error(err);
    setStatus(`Failed to load fruit details: ${err.message}`, true);
  }
}


// Favorites: POST /api/favorites
async function saveFavoriteFromForm(e) {
  e.preventDefault();

  const name = (favFruitName?.value || "").trim();
  const notes = (favNotes?.value || "").trim();

  if (!name) {
    setFavMsg("Fruit name is required.", true);
    return;
  }

  await postFavorite(name, notes);
}

async function quickSaveFavorite() {
  const name = currentFruit?.name || (select?.value || "").trim();
  const notes = (favNotes?.value || "").trim();

  if (!name) {
    setFavMsg("Pick a fruit first.", true);
    return;
  }

  await postFavorite(name, notes);
}

async function postFavorite(fruit_name, notes) {
  setFavMsg("Saving favorite...", false);

  try {
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fruit_name, notes }),
    });

    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${text.slice(0, 160)}`);

    setFavMsg(`Saved "${fruit_name}" ⭐`, false);

    // Refresh list so they SEE it saved
    await loadFavorites();

    // Clear notes (keep name filled)
    if (favNotes) favNotes.value = "";
  } catch (err) {
    console.error(err);
    setFavMsg(`Save failed: ${err.message}`, true);
  }
}


// Favorites: GET /api/favorites
async function loadFavorites() {
  if (!favoritesList) return;

  favoritesList.innerHTML = `<p class="muted">Loading favorites...</p>`;

  try {
    const res = await fetch("/api/favorites");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Favorites API returned non-array");

    if (data.length === 0) {
      favoritesList.innerHTML = `<p class="muted">No favorites saved yet.</p>`;
      return;
    }

    favoritesList.innerHTML = data
      .map((row) => {
        const name = escapeHtml(row.fruit_name || "—");
        const notes = escapeHtml(row.notes || "");
        const id = row.id;

        return `
          <div class="details-card" style="margin-bottom: 10px;">
            <p><strong>🍓 ${name}</strong></p>
            ${notes ? `<p class="muted">${notes}</p>` : `<p class="muted">(no notes)</p>`}
            <button class="mini-btn" data-del="${id}">Delete</button>
          </div>
        `;
      })
      .join("");

    // Hook delete buttons
    favoritesList.querySelectorAll("button[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.del;
        await deleteFavorite(id);
      });
    });
  } catch (err) {
    console.error(err);
    favoritesList.innerHTML = `<p class="status error">Failed to load favorites: ${escapeHtml(
      err.message
    )}</p>`;
  }
}


// Favorites: DELETE 
async function deleteFavorite(id) {
  setFavMsg("Deleting...", false);

  try {
    const res = await fetch(`/api/favorites/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${text.slice(0, 160)}`);

    setFavMsg("Deleted ✅", false);
    await loadFavorites();
  } catch (err) {
    console.error(err);
    setFavMsg(`Delete failed: ${err.message}`, true);
  }
}


// UI HELPERS
function setStatus(msg, isError) {
  if (!statusMsg) return;
  statusMsg.textContent = msg;
  statusMsg.className = isError ? "status error" : "status";
}

function setFavMsg(msg, isError) {
  if (!favMsg) return;
  favMsg.textContent = msg;
  favMsg.className = isError ? "status error" : "status";
}

function renderDetails(fruit) {
  if (!details) return;

  const n = fruit.nutritions || {};
  details.innerHTML = `
    <h4>${escapeHtml(fruit.name || "—")}</h4>
    <p><strong>Genus:</strong> ${escapeHtml(fruit.genus || "—")}</p>
    <p><strong>Family:</strong> ${escapeHtml(fruit.family || "—")}</p>
    <p><strong>Order:</strong> ${escapeHtml(fruit.order || "—")}</p>
    <hr />
    <p><strong>Calories:</strong> ${n.calories ?? "—"}</p>
    <p><strong>Sugar:</strong> ${n.sugar ?? "—"}</p>
    <p><strong>Carbs:</strong> ${n.carbohydrates ?? "—"}</p>
    <p><strong>Protein:</strong> ${n.protein ?? "—"}</p>
    <p><strong>Fat:</strong> ${n.fat ?? "—"}</p>
  `;
}

function buildSwiper(fruits) {
  if (!swiperWrapper) return;

  swiperWrapper.innerHTML = "";

  fruits.forEach((f) => {
    const slide = document.createElement("div");
    slide.className = "swiper-slide";
    slide.innerHTML = `
      <div class="slide-card">
        <h4>${escapeHtml(f.name || "—")}</h4>
        <p class="muted">${escapeHtml(f.family || "")}</p>
        <button class="mini-btn" data-fruit="${escapeHtml(f.name || "")}">View</button>
      </div>
    `;
    swiperWrapper.appendChild(slide);
  });

  // Click handler for slide buttons
  swiperWrapper.querySelectorAll("button[data-fruit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (select) select.value = btn.dataset.fruit;
      await viewSelectedFruit();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // swiper
  if (swiperInstance) swiperInstance.destroy(true, true);

  swiperInstance = new Swiper("#fruitSwiper", {
    slidesPerView: 1,
    spaceBetween: 14,
    pagination: { el: ".swiper-pagination", clickable: true },
    navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
    breakpoints: {
      700: { slidesPerView: 2 },
      1000: { slidesPerView: 3 },
    },
  });
}

function renderChart(fruit) {
  if (!chartCanvas || typeof Chart === "undefined") return;

  const n = fruit.nutritions || {};
  const labels = ["Calories", "Sugar", "Carbs", "Protein", "Fat"];
  const values = [
    n.calories ?? 0,
    n.sugar ?? 0,
    n.carbohydrates ?? 0,
    n.protein ?? 0,
    n.fat ?? 0,
  ];

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(chartCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: `${fruit.name} (per 100g)`, data: values }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
    },
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
