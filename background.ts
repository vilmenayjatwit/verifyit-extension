
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id:        "find-sources",
    title:     "Find Sources with VerifyIT",
    contexts:  ["selection"]
  });
});

// Listen for clicks on that menu entry
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "find-sources" && info.selectionText) {
    const highlightedText = info.selectionText;
    const popupUrl = chrome.runtime.getURL(
      `popup.html?text=${encodeURIComponent(highlightedText)}`
    );

    // Open your popup.html as its own small window
chrome.windows.create({
  url:    popupUrl,
  type:   "popup",
  width:  350,
  height: 400,
});
  }
});
