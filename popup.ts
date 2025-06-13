document.addEventListener("DOMContentLoaded", () => {
  // Scenes
  const searchScene  = document.getElementById("searchScene")! as HTMLDivElement;
  const resultsScene = document.getElementById("resultsScene")! as HTMLDivElement;
  const resultsList  = document.getElementById("resultsList")! as HTMLDivElement;
  const backBtn      = document.getElementById("backBtn")! as HTMLButtonElement;

  // Original elements
  const submitBtn  = document.getElementById("submitBtn")! as HTMLButtonElement;
  const userInput  = document.getElementById("userInput")! as HTMLInputElement;
  const errorText  = document.getElementById("error")! as HTMLDivElement;

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
        data.organic_results.slice(0, 3).forEach((result: any, i: number) => {
          const link = document.createElement("a");
          link.href = result.link || "#";
          link.target = "_blank";
          link.textContent = `${i + 1}. ${result.title || "Untitled"}`;
          link.style.display = "block";
          resultsList.appendChild(link);
        });
        // swap scenes
        searchScene.style.display  = "none";
        resultsScene.style.display = "block";
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
      --origin-x:${Math.random() > 0.5 ? RANDOM(300, 800) * -1 : RANDOM(300, 800)}%;
      --origin-y:${Math.random() > 0.5 ? RANDOM(300, 800) * -1 : RANDOM(300, 800)}%;
      --size:${RANDOM(40, 90) / 100};
    `
    );
  });
});
