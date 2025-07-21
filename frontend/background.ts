// frontend/background.ts

// 1. Import only the core API (no auto backends)
import * as tf from "@tensorflow/tfjs-core";
// 2. Manually pull in exactly one backend
import "@tensorflow/tfjs-backend-webgl";
// 3. Then pull in the USE model
import * as use from "@tensorflow-models/universal-sentence-encoder";

// === Load the USE model once, after setting the backend ===
console.log("🔁 Starting TF.js + USE initialization…");
const modelPromise: Promise<use.UniversalSentenceEncoder> = (async () => {
  await tf.setBackend("webgl");
  await tf.ready();
  console.log("✅ TF.js backend:", tf.getBackend());
  const model = await use.load();
  console.log("✅ USE model loaded");
  return model;
})();

// === Types ===
interface Article {
  title:       string;
  snippet:     string;
  url:         string;
  publishDate: string;  // ISO date string
}

// === 1. Compute semantic scores with USE embeddings ===
async function rankArticles(
  query: string,
  articles: Article[]
): Promise<(Article & { score: number })[]> {
  console.log(`🔎 rankArticles("${query}", [${articles.map(a => a.title).join(", ")}])`);
  const model      = await modelPromise;
  const texts      = [query, ...articles.map(a => `${a.title} ${a.snippet}`)];
  const embeddings = await model.embed(texts);
  const allVecs    = (await embeddings.array()) as number[][];
  embeddings.dispose();

  console.log("    embeddings shape:", allVecs.length, "×", allVecs[0].length);

  const queryVec    = allVecs[0];
  const articleVecs = allVecs.slice(1);
  const queryNorm   = Math.hypot(...queryVec);

  const scored = articleVecs.map((vec, i) => {
    let dot = 0;
    for (let j = 0; j < vec.length; j++) {
      dot += vec[j] * queryVec[j];
    }
    const norm  = Math.hypot(...vec);
    const score = dot / (norm * queryNorm);
    return { ...articles[i], score };
  });

  console.group(`⏺ Raw semantic scores for "${query}"`);
  scored.forEach(a => console.log(`  • ${a.title}: ${a.score.toFixed(3)}`));
  console.groupEnd();

  const top3 = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  console.log("🏆 rankArticles top-3:", top3.map(a => a.title).join(", "));
  return top3;
}

// === 2. Wrap (and later layer in credibility & recency) ===
async function rankAndFilter(
  query: string,
  articles: Article[]
): Promise<(Article & { score: number })[]> {
  const t0   = performance.now();
  const top3 = await rankArticles(query, articles);
  const dt   = (performance.now() - t0).toFixed(1);
  console.log(`⏱ rankAndFilter("${query}") took ${dt} ms`);

  console.group(`📋 Final top-3 for "${query}"`);
  console.table(top3.map(a => ({ Title: a.title, Score: a.score.toFixed(3) })));
  console.groupEnd();

  return top3;
}

// === 3. Context Menu ===
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id:       "find-sources",
    title:    "Find Sources with VerifyIT",
    contexts: ["selection"]
  });
});
chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === "find-sources" && info.selectionText) {
    const popupUrl = chrome.runtime.getURL(
      `frontend/popup.html?text=${encodeURIComponent(info.selectionText)}`
    );
    chrome.windows.create({
      url:    popupUrl,
      type:   "popup",
      width:  350,
      height: 410
    });
  }
});

// === 4. Message Listener ===
chrome.runtime.onMessage.addListener(
  (
    msg: { type: "RANK"; query: string; articles: Article[] },
    _sender: chrome.runtime.MessageSender,
    respond: (result: (Article & { score: number })[]) => void
  ): boolean => {
    if (msg.type === "RANK") {
      rankAndFilter(msg.query, msg.articles).then(top3 => respond(top3));
      return true;
    }
    return false;
  }
);

// === 5. Keyboard Command Listener ===
chrome.commands.onCommand.addListener(command => {
  if (command === "reload-extension") {
    chrome.runtime.reload();
  }
});

// === 6. Self-Tests ===
(async () => {
  console.log("🚨 Running self-tests for rankArticles & rankAndFilter…");

  // Test case 1: Semantic ordering
  const fruitsPhysics: Article[] = [
    { title: "Apple",    snippet: "Fruit",   url: "a", publishDate: "" },
    { title: "Quantum",  snippet: "Physics", url: "b", publishDate: "" },
    { title: "Banana",   snippet: "Fruit",   url: "c", publishDate: "" },
    { title: "Electron", snippet: "Physics", url: "d", publishDate: "" }
  ];
  const result1 = await rankArticles("physics", fruitsPhysics);
  if (result1[0].title === "Quantum" || result1[0].title === "Electron") {
    console.log("✅ [Test 1] Semantic ranking picks a physics article first:", result1[0].title);
  } else {
    console.error("❌ [Test 1] Semantic ranking failed, got:", result1.map(a => a.title));
  }

  // Test case 2: Limiting to top 3
  const manyArticles: Article[] = Array.from({ length: 10 }, (_, i) => ({
    title:       `Item${i}`,
    snippet:     `Snippet${i}`,
    url:         `${i}`,
    publishDate: ""
  }));
  const result2 = await rankArticles("Item", manyArticles);
  if (result2.length === 3) {
    console.log("✅ [Test 2] rankArticles returns exactly 3 items when given 10");
  } else {
    console.error("❌ [Test 2] rankArticles returned", result2.length, "items");
  }

  // Test case 3: Fewer than 3 articles
  const twoArticles: Article[] = [
    { title: "One", snippet: "A", url: "1", publishDate: "" },
    { title: "Two", snippet: "B", url: "2", publishDate: "" }
  ];
  const result3 = await rankArticles("A", twoArticles);
  if (result3.length === 2) {
    console.log("✅ [Test 3] rankArticles returns 2 items when given 2");
  } else {
    console.error("❌ [Test 3] rankArticles returned", result3.length, "items");
  }

  // Test case 4: rankAndFilter mirrors rankArticles
  const result4a = await rankArticles("fruit", fruitsPhysics);
  const result4b = await rankAndFilter("fruit", fruitsPhysics);
  const sameOrder = result4a.map(a => a.title).join() === result4b.map(a => a.title).join();
  if (sameOrder) {
    console.log("✅ [Test 4] rankAndFilter matches rankArticles order");
  } else {
    console.error("❌ [Test 4] rankAndFilter differs:", result4a.map(a => a.title), result4b.map(a => a.title));
  }

  console.log("🚨 Self-tests complete.");
})();
