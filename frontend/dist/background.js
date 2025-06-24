"use strict";

// Setup context menu when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "find-sources",
    title: "Find Sources with VerifyIT",
    contexts: ["selection"]
  });
});

// Listen for context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "find-sources" && info.selectionText) {
    const highlightedText = info.selectionText;
    // <-- point at the frontend folder now
    const popupUrl = chrome.runtime.getURL(
      `frontend/popup.html?text=${encodeURIComponent(highlightedText)}`
    );

    chrome.windows.create({
      url: popupUrl,
      type: "popup",
      width: 350,
      height: 410
    });
  }
});

// 🔁 Global command listener (outside the context menu block)
chrome.commands.onCommand.addListener((command) => {
  if (command === "reload-extension") {
    chrome.runtime.reload();
  }
});
