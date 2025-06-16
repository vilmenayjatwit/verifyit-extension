document.addEventListener("DOMContentLoaded", () => {
  // Scenes
  const searchScene  = document.getElementById("searchScene")! as HTMLDivElement;
  const resultsScene = document.getElementById("resultsScene")! as HTMLDivElement;
  const resultsList  = document.getElementById("resultsList")! as HTMLDivElement;
  const backBtn      = document.getElementById("backBtn")! as HTMLButtonElement;

  // Original elements
  const submitBtn = document.getElementById("submitBtn")! as HTMLButtonElement;
  const userInput = document.getElementById("userInput")! as HTMLInputElement;
  const errorText = document.getElementById("error")! as HTMLDivElement;

  // Wire up Back button
  backBtn.addEventListener("click", () => {
    resultsList.innerHTML = "";
    resultsScene.style.display = "none";
    searchScene.style.display  = "block";
    errorText.textContent = "";
  });

  // Centralized fetch + render, pulling from Flask
  async function fetchAndDisplay(text: string): Promise<void> {
    try {
      errorText.textContent = "Searching for sources...";
      resultsList.innerHTML = "";

      const res = await fetch("http://localhost:8000/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text })
      });

      const data = await res.json();
      console.log("Raw SerpAPI response:", data);

      if (data.organic_results && Array.isArray(data.organic_results)) {
        errorText.textContent = "";

        // --- NEW: render each result as a styled "card" ---
        data.organic_results.slice(0, 3).forEach((result: any) => {
          const card = document.createElement("a");
          card.className   = "result-card";
          card.href        = result.link || "#";
          card.target      = "_blank";
          card.rel         = "noopener noreferrer";
          card.textContent = result.title || "Untitled";
          resultsList.appendChild(card);
        });

        // Shine effect: track mouse over each card
        const cards = document.querySelectorAll<HTMLAnchorElement>("#resultsList .result-card");
        cards.forEach(card => {
          card.addEventListener("mousemove", e => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top)  / rect.height) * 100;
            card.style.setProperty("--x", `${x}%`);
            card.style.setProperty("--y", `${y}%`);
          });
          card.addEventListener("mouseleave", () => {
            card.style.setProperty("--x", "50%");
            card.style.setProperty("--y", "50%");
          });
        });

      } else {
        errorText.textContent = "No sources have been found.";
      }
    } catch (err) {
      console.error("Fetch error:", err);
      errorText.textContent = "An error occurred. Please try again.";
    } finally {
      // always swap scenes, regardless of success, "no results", or error
      searchScene.style.display  = "none";
      resultsScene.style.display = "block";
    }
  }

  // Manual submission
  submitBtn.addEventListener("click", () => {
    const text = userInput.value.trim();
    fetchAndDisplay(text);
  });

  // Prefill from query string
  const params = new URLSearchParams(window.location.search);
  const prefill = params.get("text");
  if (prefill) {
    userInput.value = prefill;
    fetchAndDisplay(prefill);
  }

  // ───── Particle sparkle ─────
  const RANDOM = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1) + min);

  document.querySelectorAll<HTMLElement>(".particle").forEach(p => {
    p.setAttribute(
      "style",
      `
        --x:${RANDOM(20, 80)};
        --y:${RANDOM(20, 80)};
        --duration:${RANDOM(6, 20)};
        --delay:${RANDOM(1, 10)};
        --alpha:${RANDOM(40, 90) / 100};
        --origin-x:${
          Math.random() > 0.5 ? RANDOM(300, 800) * -1 : RANDOM(300, 800)
        }%;
        --origin-y:${
          Math.random() > 0.5 ? RANDOM(300, 800) * -1 : RANDOM(300, 800)
        }%;
        --size:${RANDOM(40, 90) / 100};
      `
    );
  });
});
