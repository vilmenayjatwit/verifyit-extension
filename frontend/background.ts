// frontend/background.ts

// 1. Import and register the CPU backend.
//    (Service workers don’t have WebGL, so CPU is safest.)
import "@tensorflow/tfjs-backend-cpu";
import * as tf from "@tensorflow/tfjs";
import * as use from "@tensorflow-models/universal-sentence-encoder";

// === Types ===
interface Article {
  title:       string;
  snippet:     string;
  url:         string;
  publishDate: string;  // ISO date string
}

// === Load the USE model once, after setting the backend ===
const modelPromise: Promise<use.UniversalSentenceEncoder> = (async () => {
  await tf.setBackend("cpu");
  await tf.ready();
  console.log("✅ TF.js backend:", tf.getBackend());
  return use.load();
})();

/** 
 * 1. Compute semantic scores with USE embeddings 
 */
async function rankArticles(
  query: string,
  articles: Article[]
): Promise<(Article & { score: number })[]> {
  const model      = await modelPromise;
  const texts      = [query, ...articles.map(a => `${a.title} ${a.snippet}`)];
  const embeddings = await model.embed(texts);
  const allVecs    = (await embeddings.array()) as number[][];
  embeddings.dispose();

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

  // 🔍 Debug: log all semantic scores
  console.group(`Semantic scores for “${query}”`);
  scored.forEach(a => {
    console.log(`${a.title}: ${a.score.toFixed(3)}`);
  });
  console.groupEnd();

  // Return top-3 by score
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

/**
 * 2. Wrap (and later layer in credibility & recency)
 */
async function rankAndFilter(
  query: string,
  articles: Article[]
): Promise<(Article & { score: number })[]> {
  const top3 = await rankArticles(query, articles);

  // 🔍 Debug: show final top-3 in table form
  console.group(`Top results for “${query}”`);
  console.table(
    top3.map(a => ({
      Title: a.title,
      Score: a.score.toFixed(3)
    }))
  );
  console.groupEnd();

  return top3;
}

// === 3. Context Menu ===

// Create the “Find Sources” context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id:       "find-sources",
    title:    "Find Sources with VerifyIT",
    contexts: ["selection"]
  });
});

// When the user clicks the context menu item, open the popup
chrome.contextMenus.onClicked.addListener((info) => {
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
      rankAndFilter(msg.query, msg.articles).then((top3) => {
        respond(top3);
      });
      return true; // keep channel open for async response
    }
    return false;
  }
);

// === 5. Keyboard Command Listener ===

chrome.commands.onCommand.addListener((command) => {
  if (command === "reload-extension") {
    chrome.runtime.reload();
  }
});
