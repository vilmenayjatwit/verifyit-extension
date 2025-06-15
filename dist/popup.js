"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
document.addEventListener("DOMContentLoaded", () => {
    // Scenes
    const searchScene = document.getElementById("searchScene");
    const resultsScene = document.getElementById("resultsScene");
    const resultsList = document.getElementById("resultsList");
    const backBtn = document.getElementById("backBtn");
    // Original elements
    const submitBtn = document.getElementById("submitBtn");
    const userInput = document.getElementById("userInput");
    const errorText = document.getElementById("error");
    // Wire up Back button
    backBtn.addEventListener("click", () => {
        resultsList.innerHTML = "";
        resultsScene.style.display = "none";
        searchScene.style.display = "block";
        errorText.textContent = "";
    });
    // Centralized fetch + render, pulling from Flask
    function fetchAndDisplay(text) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                errorText.textContent = "Searching for sources...";
                resultsList.innerHTML = "";
                const res = yield fetch("http://localhost:8000/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query: text })
                });
                const data = yield res.json();
                console.log("Raw SerpAPI response:", data);
                if (data.organic_results && Array.isArray(data.organic_results)) {
                    errorText.textContent = "";
                    data.organic_results
                        .slice(0, 3)
                        .forEach((result, i) => {
                        const link = document.createElement("a");
                        link.href = result.link || "#";
                        link.target = "_blank";
                        link.textContent = `${i + 1}. ${result.title || "Untitled"}`;
                        link.style.display = "block";
                        resultsList.appendChild(link);
                    });
                    // ← removed the swap from here
                }
                else {
                    errorText.textContent = "No sources have been found.";
                }
            }
            catch (err) {
                console.error("Fetch error:", err);
                errorText.textContent = "An error occurred. Please try again.";
            }
            finally {
                // always swap scenes, regardless of success, "no results", or error
                searchScene.style.display = "none";
                resultsScene.style.display = "block";
            }
        });
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
    const RANDOM = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
    document.querySelectorAll(".particle").forEach(p => {
        p.setAttribute("style", `
      --x:${RANDOM(20, 80)};
      --y:${RANDOM(20, 80)};
      --duration:${RANDOM(6, 20)};
      --delay:${RANDOM(1, 10)};
      --alpha:${RANDOM(40, 90) / 100};
      --origin-x:${Math.random() > 0.5 ? RANDOM(300, 800) * -1 : RANDOM(300, 800)}%;
      --origin-y:${Math.random() > 0.5 ? RANDOM(300, 800) * -1 : RANDOM(300, 800)}%;
      --size:${RANDOM(40, 90) / 100};
    `);
    });
});
