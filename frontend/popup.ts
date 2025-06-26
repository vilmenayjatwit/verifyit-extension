// frontend/popup.ts

// Re-use the same Article interface
interface Article {
  title:       string;
  snippet:     string;
  url:         string;
  publishDate: string;
  score?:      number;  // filled in by the background
}

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

  // Centralized fetch + ranking + render
  async function fetchAndDisplay(text: string): Promise<void> {
    try {
      errorText.textContent = "Searching for sources...";
      resultsList.innerHTML = "";

      // 1️⃣ Fetch raw SerpAPI results
      const res = await fetch("http://localhost:8000/search", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query: text })
      });
      const data = await res.json();
      console.log("Raw SerpAPI response:", data);

      if (!data.organic_results || !Array.isArray(data.organic_results)) {
        errorText.textContent = "No sources have been found.";
        return;
      }

      // 2️⃣ Map to Article[]
      const rawArticles: Article[] = data.organic_results.map((r: any) => ({
        title:       r.title      || "Untitled",
        snippet:     r.snippet    || "",
        url:         r.link       || "#",
        publishDate: r.publish_date || ""  // if available
      }));
      console.log("Mapped rawArticles:", rawArticles);

      // 3️⃣ Send to background for AI ranking
      chrome.runtime.sendMessage(
        { type: "RANK", query: text, articles: rawArticles },
        (top3: Article[]) => {
          if (chrome.runtime.lastError) {
            console.warn("Ranking message failed:", chrome.runtime.lastError.message);
            errorText.textContent = "Ranking failed. Showing unranked results.";
            renderUnranked(rawArticles.slice(0, 3));
            return;
          }

          console.log("🔁 Received ranked top3 in popup:", top3);
          renderRanked(top3);
        }
      );

    } catch (err) {
      console.error("Fetch error:", err);
      errorText.textContent = "An error occurred. Please try again.";
      // fallback: show first 3 raw if available
      // resultsList.innerHTML = "";
      // renderUnranked(data.organic_results.slice(0,3));
    } finally {
      // swap scenes (we’ll populate resultsList in the callbacks)
      searchScene.style.display  = "none";
      resultsScene.style.display = "block";
    }
  }

  function renderRanked(articles: Article[]) {
    resultsList.innerHTML = "";
    articles.forEach(item => {
      const card = document.createElement("a");
      card.className   = "result-card";
      card.href        = item.url;
      card.target      = "_blank";
      card.rel         = "noopener noreferrer";
      card.textContent = `${item.title} (${(item.score||0).toFixed(2)})`;
      resultsList.appendChild(card);
    });
    attachShineEffect();
  }

  function renderUnranked(articles: Article[]) {
    resultsList.innerHTML = "";
    articles.forEach((r: any) => {
      const card = document.createElement("a");
      card.className   = "result-card";
      card.href        = r.link || "#";
      card.target      = "_blank";
      card.rel         = "noopener noreferrer";
      card.textContent = r.title || "Untitled";
      resultsList.appendChild(card);
    });
    attachShineEffect();
  }

  function attachShineEffect() {
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
  }

  // Manual submission
  submitBtn.addEventListener("click", () => {
    const text = userInput.value.trim();
    if (text) fetchAndDisplay(text);
  });

  // Prefill from query string
  const params  = new URLSearchParams(window.location.search);
  const prefill = params.get("text");
  if (prefill) {
    userInput.value = prefill;
    fetchAndDisplay(prefill);
  }

  // Particle sparkle (no changes)
  const RANDOM = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1) + min);
  document.querySelectorAll<HTMLElement>(".particle").forEach(p => {
    p.setAttribute("style", `
      --x:${RANDOM(20,80)}; --y:${RANDOM(20,80)};
      --duration:${RANDOM(6,20)}; --delay:${RANDOM(1,10)};
      --alpha:${RANDOM(40,90)/100};
      --origin-x:${Math.random()>0.5?RANDOM(300,800)*-1:RANDOM(300,800)}%;
      --origin-y:${Math.random()>0.5?RANDOM(300,800)*-1:RANDOM(300,800)}%;
      --size:${RANDOM(40,90)/100};
    `);
  });
});
