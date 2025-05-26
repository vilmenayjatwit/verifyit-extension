chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "DISPLAY_RESULT") {
    document.getElementById("status").textContent = "Result:";
    document.getElementById("result").textContent = message.data;
  }
});
