// index.js
require("dotenv").config();
const express = require("express");
const axios   = require("axios");
const app     = express();

app.use(express.json());

app.post("/sources", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Missing text" });

    const query = text.split(" ").slice(0, 50).join(" ");
    const serpRes = await axios.get("https://serpapi.com/search.json", {
      params: {
        engine:  "google",
        q:       query,
        api_key: process.env.SERPAPI_KEY
      }
    });

    const top3 = (serpRes.data.organic_results || [])
      .slice(0, 3)
      .map(r => ({ title: r.title, url: r.link }));

    res.json({ sources: top3 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

const PORT = 8000;
app.listen(PORT, () =>
  console.log(`VerifyIT backend running on http://localhost:${PORT}`)
);
