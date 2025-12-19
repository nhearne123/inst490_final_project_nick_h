// server.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ENDPOINT 1: Retrieve Data from your Supabase Database
app.get('/api/my-fruits', async (req, res) => {
  const { data, error } = await supabase.from('fruits').select('*');
  if (error) return res.status(500).json(error);
  res.json(data);
});

// ENDPOINT 2: Get data from external provider (Fruityvice) and manipulate it
app.get('/api/external-fruit/:name', async (req, res) => {
  try {
    const response = await fetch(`https://www.fruityvice.com/api/fruit/${req.params.name}`);
    const data = await response.json();
    
    // Manipulation: Add a "status" field or modify structure before sending to Front-End
    const modifiedData = {
      ...data,
      source: "External API",
      timestamp: new Date().toISOString()
    };
    
    res.json(modifiedData);
  } catch (err) {
    res.status(500).send("Error fetching external data");
  }
});

module.exports = app;