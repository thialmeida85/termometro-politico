chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || !/^https:\/\/(www\.)?youtube\.com\//.test(tab.url)) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "truthmeter.toggle" });
  } catch (_) {
    // A página pode ainda estar carregando ou não aceitar content scripts.
  }
});
