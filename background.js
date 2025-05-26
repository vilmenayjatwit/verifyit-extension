chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "TEXT_SELECTED") {
    fetch("http://localhost:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message.data })
    })
    .then((res) => res.json())
    .then((data) => {
      chrome.runtime.sendMessage({
        action: "DISPLAY_RESULT",
        data: `${data.label} (Confidence: ${data.score.toFixed(2)})`
      });
    });
  }
});
