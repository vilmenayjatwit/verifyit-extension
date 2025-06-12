"use strict";
document.addEventListener("mouseup", () => {
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : "";
    if (selectedText.length > 0) {
        chrome.runtime.sendMessage({
            action: "TEXT_SELECTED",
            data: selectedText
        });
    }
});
