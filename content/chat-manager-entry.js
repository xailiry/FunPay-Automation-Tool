(() => {
  const namespace = globalThis.FunPayAutomation;
  if (globalThis.FunPayAutomationChatManagerInstance) return;

  const controller = new namespace.ChatManagerController();
  globalThis.FunPayAutomationChatManagerInstance = controller;
  void controller.initialize();
})();
