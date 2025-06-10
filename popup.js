// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const submitBtn  = document.getElementById("submitBtn");
  const userInput  = document.getElementById("userInput");
  const resultsDiv = document.getElementById("results");
  const errorText  = document.getElementById("error");

  // Centralized fetch + render, showing only top 3
  async function fetchAndDisplay(text) {
    try {
      errorText.textContent = "Searching for sources...";
      resultsDiv.innerHTML  = "";

      const res = await fetch("http://localhost:8000/sources", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text })
      });
      const data = await res.json();

      if (data.sources && data.sources.length > 0) {
        errorText.textContent = "";
        data.sources
          .slice(0, 3)
          .forEach((source, i) => {
            const link = document.createElement("a");
            link.href          = source.url;
            link.target        = "_blank";
            link.textContent   = `${i + 1}. ${source.title}`;
            link.style.display = "block";
            resultsDiv.appendChild(link);
          });
      } else {
        errorText.textContent = "No sources have been found.";
      }
    } catch (err) {
      console.error(err);
      errorText.textContent = "An error occurred. Please try again.";
    }
  }

  // Wrap your existing manual-submit logic
  submitBtn.addEventListener("click", () => {
    const text = userInput.value.trim();
    if (text.split(/\s+/).length < 30) {
      errorText.textContent = "Please enter at least 30 words.";
      resultsDiv.innerHTML  = "";
      return;
    }
    fetchAndDisplay(text);
  });

  const params = new URLSearchParams(window.location.search);
  const prefill = params.get("text");
  if (prefill) {
    // Show the user what was selected
    userInput.value = prefill;

    // Kick off the search right away (skip 30-word check)
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
