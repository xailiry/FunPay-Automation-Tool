(() => {
  const namespace = globalThis.FunPayAutomation;
  const Core = namespace.ChatManagerCore;

  namespace.ChatManagerContext = Object.freeze({
    findChatForm,
    read
  });

  function findChatForm() {
    return document.querySelector(
      'form[action$="/chat/message"] textarea[name="content"]'
    )?.form || null;
  }

  function read(form) {
    const account = readAccount();
    const buyerLink = document.querySelector(
      '.chat-header .media-user-name a[href*="/users/"]'
    );
    const activeContact = document.querySelector('.contact-item.active');
    const buyerName =
      buyerLink?.textContent?.trim() ||
      activeContact?.querySelector('.media-user-name')?.textContent?.trim() ||
      '';
    const activeBuyerName =
      activeContact?.querySelector('.media-user-name')?.textContent?.trim() ||
      activeContact?.textContent?.trim().split(/\r?\n/)[0] ||
      '';
    const conversationId = Core.getConversationId({
      activeContactId: activeContact?.dataset.id,
      pathname: location.pathname,
      search: location.search
    });

    return {
      account,
      buyerName,
      conversationId,
      form,
      hasOwnMessage: hasOwnMessage(account.userId),
      ready:
        !activeContact ||
        !activeBuyerName ||
        activeBuyerName.toLocaleLowerCase('ru') ===
          buyerName.toLocaleLowerCase('ru'),
      offerName: readOrderOfferName(),
      textarea: form.elements.namedItem('content')
    };
  }

  function readAccount() {
    let appData = {};
    try {
      appData = JSON.parse(document.body?.dataset.appData || '{}');
    } catch {
      // The page can render before FunPay adds account metadata.
    }
    const profileLink = document.querySelector(
      '.user-link-dropdown[href*="/users/"], .navbar a[href*="/users/"]'
    );
    return {
      userId:
        String(appData.userId || '') ||
        profileLink?.href.match(/\/users\/(\d+)/)?.[1] ||
        '',
      username: String(profileLink?.textContent || '')
        .split(/\r?\n/)
        .map((part) => part.trim())
        .find(Boolean) || ''
    };
  }

  function hasOwnMessage(userId) {
    if (!userId) return false;
    return [...document.querySelectorAll(
      '.chat-msg-with-head .media-user-name a[href*="/users/"]'
    )].some((link) => link.href.includes(`/users/${userId}/`));
  }

  function readOrderOfferName() {
    for (const item of document.querySelectorAll('.param-item')) {
      const label = item.firstElementChild?.textContent
        ?.trim()
        .toLocaleLowerCase('ru');
      if (label !== 'краткое описание') continue;
      return item.children[1]?.textContent?.trim() || '';
    }
    return '';
  }
})();
