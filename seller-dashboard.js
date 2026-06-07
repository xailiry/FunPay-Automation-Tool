const {
  SellerDashboardClient,
  SellerDashboardController,
  SellerDashboardData,
  SellerDashboardView,
  SellerOfferStore
} = globalThis.FunPayAutomation;

void (async () => {
  const profile = SellerDashboardData.collectProfile(document);

  if (
    profile.isOwnProfile &&
    profile.offersSection &&
    !document.getElementById('fp-seller-dashboard')
  ) {
    const offerStore = new SellerOfferStore();
    await offerStore.hydrate(profile).catch(() => profile);
    const view = new SellerDashboardView(profile);
    const controller = new SellerDashboardController({
      profile,
      view,
      client: new SellerDashboardClient(),
      offerStore
    });

    controller.initialize();
  }
})();
