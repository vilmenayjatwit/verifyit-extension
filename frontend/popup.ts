// frontend/popup.ts

// Re-use the same Article interface
interface Article {
  title:       string;
  snippet:     string;
  url:         string;
  publishDate: string;
  score?:      number;
}

// the shape of objects we store as bookmarks
interface Bookmark {
  title:       string;
  url:         string;
  publishDate?: string;
  added?:      number;
}

document.addEventListener("DOMContentLoaded", () => {
  const toast = document.getElementById("toast")! as HTMLDivElement;
  const searchScene      = document.getElementById("searchScene")! as HTMLDivElement;
  const resultsScene     = document.getElementById("resultsScene")! as HTMLDivElement;
  const bookmarksScene   = document.getElementById("bookmarksScene")! as HTMLDivElement;

  const resultsList      = document.getElementById("resultsList")! as HTMLDivElement;
  const bookmarksList    = document.getElementById("bookmarksList")! as HTMLDivElement;

  const backBtn           = document.getElementById("backBtn")! as HTMLButtonElement;
  const backFromBookmarks = document.getElementById("backFromBookmarks")! as HTMLButtonElement;
  const submitBtn         = document.getElementById("submitBtn")! as HTMLButtonElement;
  const bookmarksBtn      = document.getElementById("bookmarksBtn")! as HTMLButtonElement;

  const userInput         = document.getElementById("userInput")! as HTMLInputElement;
  const errorText         = document.getElementById("error")! as HTMLDivElement;

  backBtn.addEventListener("click", () => {
    resultsList.innerHTML = "";
    resultsScene.style.display     = "none";
    bookmarksScene.style.display   = "none";
    searchScene.style.display      = "block";
    errorText.textContent          = "";
  });

  // Helper to show toast
  function showToast(msg: string) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1500);
  }

  // Render bookmarks list
  function renderBookmarks() {
chrome.storage.local.get<{bookmarks: Bookmark[]}>(
  { bookmarks: [] },
  ({ bookmarks: all }) => {
    const toShow: Bookmark[] = all.slice(-5);
      bookmarksList.innerHTML = "";

      if (toShow.length === 0) {
        const msg = document.createElement("div");
        msg.textContent = "No bookmarks yet.";
        msg.className   = "empty-message";
        bookmarksList.appendChild(msg);
      } else {
        toShow.forEach((b: Bookmark) => {
          const item = document.createElement("div");
          item.className = "bookmark-item";

          const link = document.createElement("a");
          link.className   = "result-card";
          link.href        = b.url;
          link.target      = "_blank";
          link.rel         = "noopener noreferrer";
          link.textContent = b.title;

        const removeBtn = document.createElement("button");
        removeBtn.className   = "bookmark-remove";
        removeBtn.textContent = "✖";
        removeBtn.addEventListener("click", () => {
          // get the full array, filter out this bookmark by URL, save & re-render
          chrome.storage.local.get<{ bookmarks: Bookmark[] }>(
            { bookmarks: [] },
           ({ bookmarks: all }) => {
              const updated = all.filter(x => x.url !== b.url);
              chrome.storage.local.set({ bookmarks: updated }, () => {
               showToast("Bookmark Removed");
                renderBookmarks();
              });
            }
          );
        });

          item.appendChild(link);
          item.appendChild(removeBtn);
          bookmarksList.appendChild(item);
        });
      }
    });
  }

  // Show bookmarks when button clicked
  bookmarksBtn.addEventListener("click", () => {
    searchScene.style.display    = "none";
    resultsScene.style.display   = "none";
    bookmarksScene.style.display = "block";
    renderBookmarks();
  });

  backFromBookmarks.addEventListener("click", () => {
    bookmarksScene.style.display  = "none";
    searchScene.style.display     = "block";
    resultsScene.style.display    = "none";
    errorText.textContent         = "";
  });

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

      if (!data.organic_results || !Array.isArray(data.organic_results)) {
        errorText.textContent = "No sources have been found.";
        return;
      }

      const rawArticles: Article[] = data.organic_results.map((r: any) => ({
        title:       r.title           || "Untitled",
        snippet:     r.snippet         || "",
        url:         r.link            || "#",
        publishDate: r.publish_date    || ""
      }));

      chrome.runtime.sendMessage(
        { type: "RANK", query: text, articles: rawArticles },
        (top3: Article[]) => {
          if (chrome.runtime.lastError) {
            errorText.textContent = "Ranking failed. Showing unranked results.";
            renderUnranked(rawArticles.slice(0, 3));
            return;
          }
          renderRanked(top3);
        }
      );

    } catch (err) {
      errorText.textContent = "An error occurred. Please try again.";
    } finally {
      searchScene.style.display     = "none";
      resultsScene.style.display    = "block";
      bookmarksScene.style.display  = "none";
    }
  }

  function renderRanked(articles: Article[]) {
    resultsList.innerHTML = "";
    articles.forEach(item => {
      const wrapper = document.createElement("div");
      wrapper.className = "result-item";

      const card = document.createElement("a");
      card.className   = "result-card";
      card.href        = item.url;
      card.target      = "_blank";
      card.rel         = "noopener noreferrer";
      card.textContent = `${item.title} (${(item.score||0).toFixed(2)})`;

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
          chrome.storage.local.set({ bookmarks }, () => {
            showToast("Article Saved");
          });
        });
      });

      wrapper.appendChild(card);
      wrapper.appendChild(icon);
      resultsList.appendChild(wrapper);
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

  submitBtn.addEventListener("click", () => {
    const text = userInput.value.trim();
    if (text) fetchAndDisplay(text);
  });

  const params  = new URLSearchParams(window.location.search);
  const prefill = params.get("text");
  if (prefill) {
    userInput.value = prefill;
    fetchAndDisplay(prefill);
  }

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
