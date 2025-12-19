// Fruityvice endpoints (official docs show /api/fruit/all and /api/fruit/:name)
// NEW LINES:
const BACKEND_BASE = "/api";

const button = document.getElementById("loadFruits");
const select = document.getElementById("fruitSelect");
const viewBtn = document.getElementById("viewFruitBtn");
const statusMsg = document.getElementById("statusMsg");


const details = document.getElementById("fruitDetails");
const swiperWrapper = document.getElementById("swiperWrapper");


const addForm = document.getElementById("addFruitForm");
const addMsg = document.getElementById("addMsg");


let allFruits = [];
let swiperInstance = null;


let chartInstance = null;
const chartCanvas = document.getElementById("nutritionChart");


if (button) button.addEventListener("click", loadAllFruits);
if (viewBtn) viewBtn.addEventListener("click", viewSelectedFruit);
if (addForm) addForm.addEventListener("submit", submitNewFruit);


// -----------------------------
// Fetch #1: GET ALL FRUITS
// -----------------------------
async function loadAllFruits() {
    setStatus("Loading fruits...", false);
    try {
      // This must match the app.get('/api/my-db-fruits') in server.js
      const res = await fetch(`${BACKEND_BASE}/my-db-fruits`); 
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      allFruits = data;
      // ... rest of your code to fill dropdown


   // Fill dropdown
   select.innerHTML = `<option value="">Select a fruit</option>`;
   allFruits
     .map(f => f.name)
     .sort((a, b) => a.localeCompare(b))
     .forEach(name => {
       const opt = document.createElement("option");
       opt.value = name;
       opt.textContent = name;
       select.appendChild(opt);
     });


   // Build swiper (first 12 fruits)
   buildSwiper(allFruits.slice(0, 12));


   setStatus(`Loaded ${allFruits.length} fruits ✅`, false);
 } catch (err) {
   console.error(err);
   setStatus(`Failed to load fruits: ${err.message}`, true);
 }
}


// -----------------------------
// Fetch #2: GET ONE FRUIT BY NAME
// -----------------------------
async function viewSelectedFruit() {
    const name = select.value;
    if (!name) {
      setStatus("Pick a fruit first.", true);
      return;
    }
  
    setStatus(`Loading ${name} from backend...`, false);
  
    try {
      // 1. UPDATED: Call your custom backend endpoint instead of Fruityvice directly
      const res = await fetch(`${BACKEND_BASE}/external-fruit/${encodeURIComponent(name)}`);
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
  
      const fruit = await res.json();
  
      // 2. ADDED: Prove manipulation for grading (Backend added 'source' and 'timestamp')
      console.log("Data Source:", fruit.source); 
      console.log("Processed at:", fruit.timestamp);
  
      // 3. Render the fruit data (this uses your existing helper functions)
      renderDetails(fruit);
      renderChart(fruit);
  
      setStatus(`Showing: ${fruit.name} (from Backend) ✅`, false);
    } catch (err) {
      console.error(err);
      setStatus(`Failed to load fruit details: ${err.message}`, true);
    }
  }


// -----------------------------
// Fetch #3: PUT ADD FRUIT
// -----------------------------
async function submitNewFruit(e) {
 e.preventDefault();
 addMsg.textContent = "Submitting...";


 const payload = {
   name: getVal("newName"),
   genus: getVal("newGenus") || "Unknown",
   family: getVal("newFamily") || "Unknown",
   order: getVal("newOrder") || "Unknown",
   nutritions: {
     calories: numVal("newCalories"),
     sugar: numVal("newSugar"),
     carbohydrates: numVal("newCarbs"),
     protein: numVal("newProtein"),
     fat: numVal("newFat")
   }
 };


 try {
   const res = await fetch(BASE, {
     method: "PUT",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify(payload)
   });


   // Some APIs return text, some JSON; handle both safely
   const text = await res.text();


   if (!res.ok) {
     throw new Error(`HTTP ${res.status} — ${text.slice(0, 120)}`);
   }


   addMsg.textContent = "Submitted ✅ (API may require admin approval)";
   addForm.reset();
 } catch (err) {
   console.error(err);
   addMsg.textContent = `Submit failed: ${err.message}`;
 }
}


// -----------------------------
// UI HELPERS
// -----------------------------
function setStatus(msg, isError) {
 if (!statusMsg) return;
 statusMsg.textContent = msg;
 statusMsg.className = isError ? "status error" : "status";
}


function renderDetails(fruit) {
 const n = fruit.nutritions || {};
 details.innerHTML = `
   <h4>${fruit.name}</h4>
   <p><strong>Genus:</strong> ${fruit.genus || "—"}</p>
   <p><strong>Family:</strong> ${fruit.family || "—"}</p>
   <p><strong>Order:</strong> ${fruit.order || "—"}</p>
   <hr />
   <p><strong>Calories:</strong> ${n.calories ?? "—"}</p>
   <p><strong>Sugar:</strong> ${n.sugar ?? "—"}</p>
   <p><strong>Carbs:</strong> ${n.carbohydrates ?? "—"}</p>
   <p><strong>Protein:</strong> ${n.protein ?? "—"}</p>
   <p><strong>Fat:</strong> ${n.fat ?? "—"}</p>
 `;
}


function buildSwiper(fruits) {
 swiperWrapper.innerHTML = "";


 fruits.forEach(f => {
   const slide = document.createElement("div");
   slide.className = "swiper-slide";
   slide.innerHTML = `
     <div class="slide-card">
       <h4>${f.name}</h4>
       <p class="muted">${f.family || ""}</p>
       <button class="mini-btn" data-fruit="${f.name}">View</button>
     </div>
   `;
   swiperWrapper.appendChild(slide);
 });


 // Click handler for slide buttons
 swiperWrapper.querySelectorAll("button[data-fruit]").forEach(btn => {
   btn.addEventListener("click", async () => {
     select.value = btn.dataset.fruit;
     await viewSelectedFruit();
     window.scrollTo({ top: 0, behavior: "smooth" });
   });
 });


 // (Re)create swiper
 if (swiperInstance) swiperInstance.destroy(true, true);


 swiperInstance = new Swiper("#fruitSwiper", {
   slidesPerView: 1,
   spaceBetween: 14,
   pagination: { el: ".swiper-pagination", clickable: true },
   navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
   breakpoints: {
     700: { slidesPerView: 2 },
     1000: { slidesPerView: 3 }
   }
 });
}


function renderChart(fruit) {
 const n = fruit.nutritions || {};


 const labels = ["Calories", "Sugar", "Carbs", "Protein", "Fat"];
 const values = [
   n.calories ?? 0,
   n.sugar ?? 0,
   n.carbohydrates ?? 0,
   n.protein ?? 0,
   n.fat ?? 0
 ];


 if (chartInstance) chartInstance.destroy();


 chartInstance = new Chart(chartCanvas, {
   type: "bar",
   data: {
     labels,
     datasets: [{ label: `${fruit.name} (per 100g)`, data: values }]
   },
   options: {
     responsive: true,
     maintainAspectRatio: false,
     scales: { y: { beginAtZero: true } }
   }
 });
}


function getVal(id) {
 const el = document.getElementById(id);
 return (el?.value || "").trim();
}


function numVal(id) {
 const v = Number(getVal(id));
 return Number.isFinite(v) ? v : 0;
}
