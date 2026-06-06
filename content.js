const { FunPayOfferClient, MultiPostController, MultiPostView, Utils } =
  globalThis.FunPayAutomation;

const offerForm = Utils.findOfferForm();

if (offerForm && !document.getElementById('fp-automation-panel')) {
  const view = new MultiPostView(offerForm);
  const controller = new MultiPostController({
    form: offerForm,
    view,
    client: new FunPayOfferClient()
  });

  controller.initialize();
}
