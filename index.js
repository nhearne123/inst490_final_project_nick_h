const express = require("express");
const dotenv = require("dotenv");
const supabaseClient = require("@supabase/supabase-js");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname + "/public"));

// Supabase
const supabase = supabaseClient.createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Fruityvice base
const FRUITS_BASE = "https://www.fruityvice.com/api/fruit";

// Home page (use your actual index.html)
app.get("/", (req, res) => {
  res.sendFile("public/index.html", { root: __dirname });
});

/* -------------------------
   EXTERNAL API (Fruityvice)
   ------------------------- */

// Fetch #1: All fruits
app.get("/api/fruits", async (req, res) => {
  try {
    const r = await fetch(`${FRUITS_BASE}/all`);
    if (!r.ok) return res.status(r.status).send(await r.text());
    res.json(await r.json());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Fetch #2: One fruit by name
app.get("/api/fruits/:name", async (req, res) => {
  try {
    const name = req.params.name;
    const r = await fetch(`${FRUITS_BASE}/${encodeURIComponent(name)}`);
    if (!r.ok) return res.status(r.status).send(await r.text());
    res.json(await r.json());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Fetch #3: Simple “manipulated” endpoint (example: top 10 lowest sugar)
app.get("/api/fruits-low-sugar", async (req, res) => {
  try {
    const r = await fetch(`${FRUITS_BASE}/all`);
    if (!r.ok) return res.status(r.status).send(await r.text());

    const data = await r.json();
    const top10 = data
      .filter(f => f?.nutritions && typeof f.nutritions.sugar === "number")
      .sort((a, b) => a.nutritions.sugar - b.nutritions.sugar)
      .slice(0, 10);

    res.json(top10);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -------------------------
   SUPABASE (Your database)
   ------------------------- */

// GET favorites from Supabase
app.get("/api/favorites", async (req, res) => {
  const { data, error } = await supabase
    .from("fruit_favorites")
    .select()
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json(error);
  res.json(data);
});

// POST favorite into Supabase
app.post("/api/favorites", async (req, res) => {
  const { fruit_name, notes } = req.body;

  if (!fruit_name) {
    return res.status(400).json({ message: "fruit_name is required" });
  }

  const { data, error } = await supabase
    .from("fruit_favorites")
    .insert({ fruit_name, notes: notes || "" })
    .select();

  if (error) return res.status(500).json(error);
  res.status(201).json(data);
});

// DELETE favorite by id
app.delete("/api/favorites/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: "Bad id" });

  const { error } = await supabase.from("fruit_favorites").delete().eq("id", id);
  if (error) return res.status(500).json(error);

  res.json({ ok: true });
});

app.listen(port, () => console.log("Server running on port:", port));
