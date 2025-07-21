// frontend/popup.ts

// Shared Types ─────────────────────────────────────────────────────────────

// Re-use the same Article interface from background.ts
interface Article {
  title:       string;
  snippet:     string;
  url:         string;
  publishDate: string;
  score?:      number;  
}

// Shape of each saved bookmark
interface Bookmark {
  title:       string;
  url:         string;
  publishDate?: string;
  added?:      number;  
}

// DOMContentLoaded Handler ─────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // Scene containers
  const searchScene      = document.getElementById("searchScene")! as HTMLDivElement;
  const resultsScene     = document.getElementById("resultsScene")! as HTMLDivElement;
  const bookmarksScene   = document.getElementById("bookmarksScene")! as HTMLDivElement;

  // Lists
  const resultsList      = document.getElementById("resultsList")! as HTMLDivElement;
  const bookmarksList    = document.getElementById("bookmarksList")! as HTMLDivElement;

  // Buttons
  const backBtn           = document.getElementById("backBtn")! as HTMLButtonElement;
  const backFromBookmarks = document.getElementById("backFromBookmarks")! as HTMLButtonElement;
  const submitBtn         = document.getElementById("submitBtn")! as HTMLButtonElement;
  const bookmarksBtn      = document.getElementById("bookmarksBtn")! as HTMLButtonElement;

  // Inputs & feedback
  const userInput         = document.getElementById("userInput")! as HTMLInputElement;
  const errorText         = document.getElementById("error")! as HTMLDivElement;
  const toast             = document.getElementById("toast")! as HTMLDivElement;

  // Navigation Listeners ────────────────────────────────────────────────────

  backBtn.addEventListener("click", () => {
    // Return to search
    resultsList.innerHTML        = "";
    errorText.textContent        = "";
    resultsScene.style.display   = "none";
    bookmarksScene.style.display = "none";
    searchScene.style.display    = "block";
  });

  bookmarksBtn.addEventListener("click", () => {
    // Show bookmarks
    searchScene.style.display    = "none";
    resultsScene.style.display   = "none";
    bookmarksScene.style.display = "block";
    renderBookmarks();
  });

  backFromBookmarks.addEventListener("click", () => {
    // Back from bookmarks to search
    bookmarksScene.style.display = "none";
    resultsScene.style.display   = "none";
    searchScene.style.display    = "block";
    errorText.textContent        = "";
  });

  // Toast Helper ────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1500);
  }

  // Bookmark Rendering ──────────────────────────────────────────────────────

  function renderBookmarks() {
    chrome.storage.local.get<{ bookmarks: Bookmark[] }>({ bookmarks: [] }, ({ bookmarks: all }) => {
      const toShow = all.slice(-5);
      bookmarksList.innerHTML = "";

      if (toShow.length === 0) {
        const msg = document.createElement("div");
        msg.textContent = "No bookmarks yet.";
        msg.className   = "empty-message";
        bookmarksList.appendChild(msg);
        return;
      }

      toShow.forEach(b => {
        const item = document.createElement("div");
        item.className = "bookmark-item";

        // Link to article
        const link = document.createElement("a");
        link.className   = "result-card";
        link.href        = b.url;
        link.target      = "_blank";
        link.rel         = "noopener noreferrer";
        link.textContent = b.title;

        // Remove button
        const removeBtn = document.createElement("button");
        removeBtn.className   = "bookmark-remove";
        removeBtn.textContent = "✖";
        removeBtn.addEventListener("click", () => {
          // Remove this bookmark and re-render
          chrome.storage.local.get<{ bookmarks: Bookmark[] }>({ bookmarks: [] }, ({ bookmarks: all }) => {
            const updated = all.filter(x => x.url !== b.url);
            chrome.storage.local.set({ bookmarks: updated }, () => {
              showToast("Bookmark Removed");
              renderBookmarks();
            });
          });
        });

        item.appendChild(link);
        item.appendChild(removeBtn);
        bookmarksList.appendChild(item);
      });
    });
  }

  // Search & Display Logic ──────────────────────────────────────────────────

  async function fetchAndDisplay(text: string): Promise<void> {
    try {
      errorText.textContent = "Searching for sources...";
      resultsList.innerHTML = "";

      const res  = await fetch("http://localhost:8000/search", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query: text })
      });

      const data = await res.json();
      if (!Array.isArray(data.organic_results)) {
        errorText.textContent = "No sources have been found.";
        return;
      }

      const rawArticles: Article[] = data.organic_results.map((r: any) => ({
        title:       r.title        || "Untitled",
        snippet:     r.snippet      || "",
        url:         r.link         || "#",
        publishDate: r.publish_date || ""
      }));

      // Ask background to rank
      chrome.runtime.sendMessage(
        { type: "RANK", query: text, articles: rawArticles },
        (top3: Article[]) => {
          if (chrome.runtime.lastError) {
            errorText.textContent = "Ranking failed. Showing unranked.";
            renderUnranked(rawArticles.slice(0, 3));
          } else {
            renderRanked(top3);
          }
        }
      );

    } catch {
      errorText.textContent = "An error occurred. Please try again.";
    } finally {
      // Show results scene
      searchScene.style.display    = "none";
      resultsScene.style.display   = "block";
      bookmarksScene.style.display = "none";
    }
  }

  // Render top-3 ranked articles
  function renderRanked(articles: Article[]) {
    resultsList.innerHTML = "";

    articles.forEach(item => {
      const wrapper = document.createElement("div");
      wrapper.className = "result-item";

      // Article card
      const card = document.createElement("a");
      card.className   = "result-card";
      card.href        = item.url;
      card.target      = "_blank";
      card.rel         = "noopener noreferrer";
      card.textContent = `${item.title} (${(item.score ?? 0).toFixed(2)})`;

      // Bookmark icon
      const icon = document.createElement("button");
      icon.className = "bookmark-icon";
      icon.innerText = "🔖";
      icon.addEventListener("click", () => {
        chrome.storage.local.get({ bookmarks: [] }, ({ bookmarks }) => {
          bookmarks.push({
            title:       item.title,
            url:         item.url,
            publishDate: item.publishDate
          });
          chrome.storage.local.set({ bookmarks }, () => showToast("Article Saved"));
        });
      });

      wrapper.append(card, icon);
      resultsList.appendChild(wrapper);
    });

    attachShineEffect();
  }

  // Render fallback unranked articles
  function renderUnranked(articles: Article[]) {
    resultsList.innerHTML = "";
    articles.forEach(r => {
      const card = document.createElement("a");
      card.className   = "result-card";
      card.href        = (r as any).link || "#";
      card.target      = "_blank";
      card.rel         = "noopener noreferrer";
      card.textContent = r.title || "Untitled";
      resultsList.appendChild(card);
    });
    attachShineEffect();
  }

  // Shine-on-Hover Effect ────────────────────────────────────────────────

  function attachShineEffect() {
    document
      .querySelectorAll<HTMLAnchorElement>("#resultsList .result-card")
      .forEach(card => {
        card.addEventListener("mousemove", e => {
          const rect = card.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          card.style.setProperty("--x", `${x}%`);
          card.style.setProperty("--y", `${y}%`);
        });
        card.addEventListener("mouseleave", () => {
          card.style.setProperty("--x", "50%");
          card.style.setProperty("--y", "50%");
        });
      });
  }

  // User Input & Prefill ──────────────────────────────────────────────────

  submitBtn.addEventListener("click", () => {
    const text = userInput.value.trim();
    if (text) fetchAndDisplay(text);
  });

  // Pre-populate search from URL (context menu)
  const params  = new URLSearchParams(window.location.search);
  const prefill = params.get("text");
  if (prefill) {
    userInput.value = prefill;
    fetchAndDisplay(prefill);
  }

  // Particle Randomization ───────────────────────────────────────────────

  const RANDOM = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1) + min);

  document.querySelectorAll<HTMLElement>(".particle").forEach(p => {
    p.setAttribute(
      "style",
      `
        --x:${RANDOM(20,80)}; --y:${RANDOM(20,80)};
        --duration:${RANDOM(6,20)}; --delay:${RANDOM(1,10)};
        --alpha:${RANDOM(40,90)/100};
        --origin-x:${Math.random()>0.5?RANDOM(300,800)*-1:RANDOM(300,800)}%;
        --origin-y:${Math.random()>0.5?RANDOM(300,800)*-1:RANDOM(300,800)}%;
        --size:${RANDOM(40,90)/100};
      `
    );
  });
});
