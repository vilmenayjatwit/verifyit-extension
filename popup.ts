document.addEventListener("DOMContentLoaded", () => {
  const submitBtn  = document.getElementById("submitBtn");
  const userInput  = document.getElementById("userInput");
  const resultsDiv = document.getElementById("results");
  const errorText  = document.getElementById("error");

  // Updated: Centralized fetch + render, pulling from Flask
  async function fetchAndDisplay(text) {
    try {
      errorText.textContent = "Searching for sources...";
      resultsDiv.innerHTML  = "";

      const res = await fetch("http://localhost:8000/search", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query: text }) // Flask expects "query"
      });

      const data = await res.json();
      console.log("Raw SerpAPI response:", data);

      if (data.organic_results && data.organic_results.length > 0) {
        errorText.textContent = "";
        data.organic_results
          .slice(0, 3)
          .forEach((result, i) => {
            const link = document.createElement("a");
            link.href          = result.link || "#";
            link.target        = "_blank";
            link.textContent   = `${i + 1}. ${result.title || "Untitled"}`;
            link.style.display = "block";
            resultsDiv.appendChild(link);
          });
      } else {
        errorText.textContent = "No sources have been found.";
      }
    } catch (err) {
      console.error("Fetch error:", err);
      errorText.textContent = "An error occurred. Please try again.";
    }
  }

  // Manual submission
  submitBtn.addEventListener("click", () => {
    const text = userInput.value.trim();
    if (text.split(/\s+/).length < 30) {
      errorText.textContent = "Please enter at least 30 words.";
      resultsDiv.innerHTML  = "";
      return;
    }
    fetchAndDisplay(text);
  });

  // Prefill from query string
  const params = new URLSearchParams(window.location.search);
  const prefill = params.get("text");
  if (prefill) {
    userInput.value = prefill;
    fetchAndDisplay(prefill);
  }

  // ───── Particle sparkle  ─────
  const RANDOM = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
  document.querySelectorAll(".particle").forEach(p => {
    p.setAttribute("style", `
      --x:${RANDOM(20,80)};
      --y:${RANDOM(20,80)};
      --duration:${RANDOM(6,20)};
      --delay:${RANDOM(1,10)};
      --alpha:${RANDOM(40,90)/100};
      --origin-x:${Math.random()>0.5?RANDOM(300,800)*-1:RANDOM(300,800)}%;
      --origin-y:${Math.random()>0.5?RANDOM(300,800)*-1:RANDOM(300,800)}%;
      --size:${RANDOM(40,90)/100};
    `);
  });
});
