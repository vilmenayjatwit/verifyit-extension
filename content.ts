// content.ts

document.addEventListener("mouseup", () => {
  // 1️⃣ Grab the selection
  const selectedText = window.getSelection()?.toString().trim() ?? "";
  if (!selectedText) return;

  // 2️⃣ Guard against missing chrome.runtime or stale extension context
  if (
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    typeof chrome.runtime.sendMessage === "function"
  ) {
    try {
      // 3️⃣ Send message with an optional callback to swallow errors
      chrome.runtime.sendMessage(
        { action: "TEXT_SELECTED", data: selectedText },
        (response) => {
          // You can inspect response or errors via chrome.runtime.lastError
          if (chrome.runtime.lastError) {
            console.warn(
              "Message send failed:",
              chrome.runtime.lastError.message
            );
          }
        }
      );
    } catch (err) {
      console.warn("Exception when sending message:", err);
    }
  } else {
    console.warn("chrome.runtime.sendMessage unavailable or extension reloaded");
  }
});
