chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "find-sources",
    title: "Find Sources with VerifyIT",
    contexts: ["selection"]
  });
});

// Listen for clicks on that menu entry
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "find-sources" && info.selectionText) {
    const highlightedText: string = info.selectionText;
    const popupUrl: string = chrome.runtime.getURL(
      `popup.html?text=${encodeURIComponent(highlightedText)}`
    );

    chrome.windows.create({
      url: popupUrl,
      type: "popup",
      width: 350,
      height: 400
    });
  }
});
