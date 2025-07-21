//Polyfill for TFJS WebGL
;(globalThis as any).window = globalThis

// Imports ────────────────────────────────────────────────────────────────
// Core TF.js API 
import * as tf from "@tensorflow/tfjs-core"
// Backend
import "@tensorflow/tfjs-backend-webgl"
// Universal Sentence Encoder Model
import * as use from "@tensorflow-models/universal-sentence-encoder"

// Model Initialization ───────────────────────────────────────────────────
console.log("🔁 Starting TF.js + USE initialization…")
const modelPromise: Promise<use.UniversalSentenceEncoder> = (async () => {
  await tf.setBackend("webgl")
  await tf.ready()
  console.log("✅ TF.js backend:", tf.getBackend())
  const model = await use.load()
  console.log("✅ USE model loaded")
  return model
})()

// Types ─────────────────────────────────────────────────────────────────
interface Article {
  title:       string
  snippet:     string
  url:         string
  publishDate: string  
}

// Semantic Ranking ──────────────────────────────────────────────────────
async function rankArticles(
  query: string,
  articles: Article[]
): Promise<(Article & { score: number })[]> {
  console.log(
    `🔎 rankArticles("${query}", [${articles.map(a => a.title).join(", ")}])`
  )

  // Prepare texts (Shorten to avoid exceeding max tokens)
  const maxLen = 256
  const texts = [query, ...articles.map(a => `${a.title} ${a.snippet}`)]
  const textsTrimmed = texts.map(t =>
    t.length > maxLen ? t.slice(0, maxLen) : t
  )

  // Embed and extract raw vectors
  const model      = await modelPromise
  const embeddings = await model.embed(textsTrimmed)
  const allVecs    = (await embeddings.array()) as number[][]
  embeddings.dispose()

  console.log("    embeddings shape:", allVecs.length, "×", allVecs[0].length)

  // Cosine similarity scoring
  const queryVec    = allVecs[0]
  const articleVecs = allVecs.slice(1)
  const queryNorm   = Math.hypot(...queryVec)

  const scored = articleVecs.map((vec, i) => {
    let dot = 0
    for (let j = 0; j < vec.length; j++) {
      dot += vec[j] * queryVec[j]
    }
    const norm  = Math.hypot(...vec)
    const score = dot / (norm * queryNorm)
    return { ...articles[i], score }
  })

  console.group(`⏺ Raw semantic scores for "${query}"`)
  scored.forEach(a =>
    console.log(`  • ${a.title}: ${a.score.toFixed(3)}`)
  )
  console.groupEnd()

  // Return top 3
  const top3 = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  console.log("🏆 rankArticles top-3:", top3.map(a => a.title).join(", "))
  return top3
}

// Wrapper for Timing & Future Filters ──────────────────────────────────
async function rankAndFilter(
  query: string,
  articles: Article[]
): Promise<(Article & { score: number })[]> {
  const t0   = performance.now()
  const top3 = await rankArticles(query, articles)
  const dt   = (performance.now() - t0).toFixed(1)

  console.log(`⏱ rankAndFilter("${query}") took ${dt} ms`)
  console.group(`📋 Final top-3 for "${query}"`)
  console.table(top3.map(a => ({ Title: a.title, Score: a.score.toFixed(3) })))
  console.groupEnd()

  return top3
}

// Context Menu Setup ────────────────────────────────────────────────────
// Adds “Find Sources with VerifyIT” when you select text
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id:       "find-sources",
    title:    "Find Sources with VerifyIT",
    contexts: ["selection"]
  })
})

// Opens our popup when the context menu item is clicked
chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === "find-sources" && info.selectionText) {
    const popupUrl = chrome.runtime.getURL(
      `frontend/popup.html?text=${encodeURIComponent(info.selectionText)}`
    )
    chrome.windows.create({
      url:    popupUrl,
      type:   "popup",
      width:  350,
      height: 410
    })
  }
})

// Message Listener ─────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener(
  (
    msg: { type: "RANK"; query: string; articles: Article[] },
    _sender: chrome.runtime.MessageSender,
    respond: (result: (Article & { score: number })[]) => void
  ): boolean => {
    if (msg.type === "RANK") {
      rankAndFilter(msg.query, msg.articles).then(top3 => respond(top3))
      return true
    }
    return false
  }
)

// Keyboard Shortcut Listener ───────────────────────────────────────────
chrome.commands.onCommand.addListener(command => {
  if (command === "reload-extension") {
    chrome.runtime.reload()
  }
})
