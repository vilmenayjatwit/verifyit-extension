document.addEventListener("DOMContentLoaded", () => {
  // Non-null assertions (!) ensure TS knows these exist
  const submitBtn = document.getElementById("submitBtn")! as HTMLButtonElement;
  const userInput = document.getElementById("userInput")! as HTMLInputElement;
  const resultsDiv = document.getElementById("results")! as HTMLDivElement;
  const errorText = document.getElementById("error")! as HTMLDivElement;

  // Centralized fetch + render, pulling from Flask
  async function fetchAndDisplay(text: string): Promise<void> {
    try {
      errorText.textContent = "Searching for sources...";
      resultsDiv.innerHTML = "";

      const res = await fetch("http://localhost:8000/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }) // Flask expects "query"
      });

      const data = await res.json();
      console.log("Raw SerpAPI response:", data);

      if (data.organic_results && Array.isArray(data.organic_results)) {
        errorText.textContent = "";
        data.organic_results
          .slice(0, 3)
          .forEach((result: any, i: number) => {
            const link = document.createElement("a");
            link.href = result.link || "#";
            link.target = "_blank";
            link.textContent = `${i + 1}. ${result.title || "Untitled"}`;
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
      resultsDiv.innerHTML = "";
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
