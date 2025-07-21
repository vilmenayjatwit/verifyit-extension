// frontend/background.ts
;(globalThis as any).window = globalThis;
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
  const maxLen = 256;
  const textsTrimmed = texts.map(t =>
    t.length > maxLen ? t.slice(0, maxLen) : t
  );
  const embeddings = await model.embed(textsTrimmed);
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

