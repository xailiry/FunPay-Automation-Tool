(() => {
  const namespace = globalThis.FunPayAutomationToolbar;
  if (globalThis.FunPayAutomationToolbarInstance) return;

  const store = new namespace.ToolbarStore();
  const shell = new namespace.ToolbarShell();
  const controller = new namespace.ToolbarController({
    store,
    shell,
    adapters: namespace.Adapters
  });

  globalThis.FunPayAutomationToolbarInstance = controller;
  namespace.Toolbar = Object.freeze({
    open: (sectionId) => controller.open(sectionId)
  });
  globalThis.FunPayAutomationToolbarAPI = namespace.Toolbar;

  void controller.initialize();
})();
