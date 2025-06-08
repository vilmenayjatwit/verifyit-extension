document.addEventListener("DOMContentLoaded", () => {
  const submitBtn  = document.getElementById("submitBtn");
  const userInput  = document.getElementById("userInput");
  const resultsDiv = document.getElementById("results");
  const errorText  = document.getElementById("error");

  submitBtn.addEventListener("click", async () => {
    const text = userInput.value.trim();

    if (text.split(/\s+/).length < 30) {
      errorText.textContent = "Please enter at least 30 words.";
      resultsDiv.innerHTML = "";
      return;
    }

    errorText.textContent = "Searching for sources...";
    resultsDiv.innerHTML  = "";

    try {
      const response = await fetch("http://localhost:8000/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      const data = await response.json();

      if (data.sources && data.sources.length > 0) {
        errorText.textContent = "";
        data.sources.forEach((source, index) => {
          const link   = document.createElement("a");
          link.href    = source.url;
          link.target  = "_blank";
          link.textContent = `${index + 1}. ${source.title}`;
          link.style.display = "block";
          resultsDiv.appendChild(link);
        });
      } else {
        errorText.textContent = "No sources have been found.";
      }
    } catch (error) {
      errorText.textContent = "An error occurred. Please try again.";
      console.error(error);
    }
  });

  /* ───── NEW: scatter sparkle particles with randomised props ───── */
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
