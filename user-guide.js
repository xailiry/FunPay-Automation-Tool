(() => {
  const GUIDE_ID = 'fp-user-guide';

  globalThis.FunPayUserGuide = Object.freeze({
    open
  });

  function open() {
    const existing = document.getElementById(GUIDE_ID);
    if (existing) {
      existing.querySelector('.fp-user-guide__close')?.focus();
      return;
    }

    const previouslyFocused = document.activeElement;
    const overlay = document.createElement('div');
    overlay.id = GUIDE_ID;
    overlay.className = 'fp-user-guide';
    overlay.innerHTML = `
      <section
        class="fp-user-guide__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fp-user-guide-title"
      >
        <header class="fp-user-guide__header">
          <div>
            <div class="fp-user-guide__eyebrow">Справка по расширению</div>
            <h2 id="fp-user-guide-title">Как пользоваться</h2>
            <p>Короткое руководство по основным возможностям.</p>
          </div>
          <button
            class="fp-user-guide__close"
            type="button"
            aria-label="Закрыть справку"
          >×</button>
        </header>

        <div class="fp-user-guide__content">
          <section class="fp-user-guide__start">
            <strong>Быстрый старт</strong>
            <ol>
              <li>Откройте свой профиль, чтобы увидеть панель продавца.</li>
              <li>Создайте или откройте объявление, чтобы воспользоваться мультипостингом.</li>
              <li>Нажмите значок расширения для ручного или автоматического поднятия.</li>
            </ol>
          </section>

          <div class="fp-user-guide__sections">
            <details open>
              <summary>Панель продавца</summary>
              <div>
                <p>Панель появляется только в профиле текущего авторизованного пользователя.</p>
                <ul>
                  <li>Поиск, фильтры и сортировка помогают быстро найти объявления.</li>
                  <li>Переключите статус нескольких объявлений и нажмите «Сохранить изменения».</li>
                  <li>Кнопка «Редактировать» открывает обычную форму FunPay, а удаление всегда требует подтверждения.</li>
                  <li>Продажи, выручка, средний чек и топ товаров считаются по странице «Мои продажи».</li>
                </ul>
              </div>
            </details>

            <details>
              <summary>Мультипостинг и черновики копий</summary>
              <div>
                <p>На странице объявления выберите дополнительные категории слева. Выбранные копии появятся справа.</p>
                <ul>
                  <li>Нажмите на выбранную категорию, чтобы отдельно изменить тексты, цену и доступные параметры будущей копии.</li>
                  <li>Расширение сначала загружает настоящую форму целевой категории и переносит только совместимые поля.</li>
                  <li>Копии создаются последовательно. Не закрывайте вкладку до завершения операции.</li>
                  <li>Перед массовой публикацией проверьте одну копию и убедитесь, что категория подходит товару.</li>
                </ul>
              </div>
            </details>

            <details>
              <summary>Поднятие объявлений</summary>
              <div>
                <p>Кнопка «Поднять сейчас» проверяет ваши активные категории и запускает доступные поднятия.</p>
                <ul>
                  <li>Сообщение «на кулдауне» означает, что объявление уже недавно поднималось. Это не поломка.</li>
                  <li>Авто-поднятие повторяет проверку примерно каждые четыре часа, пока переключатель включён.</li>
                  <li>Chrome может задержать фоновую задачу, если браузер долго не запущен.</li>
                </ul>
              </div>
            </details>

            <details>
              <summary>Где хранятся данные</summary>
              <div>
                <p>Расширение работает в вашей текущей сессии FunPay. Логин и пароль оно не запрашивает.</p>
                <ul>
                  <li>Настройки, история последних операций и локальный список неактивных объявлений хранятся в Chrome.</li>
                  <li>Статистика строится из доступных вашему аккаунту страниц FunPay.</li>
                  <li>После очистки данных расширения локальная история и сохранённые настройки пропадут.</li>
                </ul>
              </div>
            </details>

            <details>
              <summary>FAQ: что делать, если не работает?</summary>
              <div>
                <dl>
                  <dt>Панель не появилась в профиле</dt>
                  <dd>Убедитесь, что открыт именно ваш профиль, затем перезагрузите расширение на странице <code>chrome://extensions</code> и обновите вкладку FunPay.</dd>

                  <dt>Категории мультипостинга не загружаются</dt>
                  <dd>Проверьте авторизацию на FunPay, обновите страницу объявления и нажмите «Обновить» в панели категорий.</dd>

                  <dt>Копия не создалась</dt>
                  <dd>Прочитайте сообщение под панелью. Частые причины: обязательное поле целевой формы, неподходящий тип объявления или завершившаяся сессия.</dd>

                  <dt>Метрики отличаются от ожидаемых</dt>
                  <dd>Нажмите «Обновить продажи». Возвраты считаются отдельно, а товары сопоставляются по названию и категории.</dd>

                  <dt>После обновления FunPay интерфейс сломался</dt>
                  <dd>Не повторяйте массовую операцию. Обновите расширение до последней версии и приложите скриншот ошибки при обращении к автору.</dd>
                </dl>
              </div>
            </details>
          </div>

          <p class="fp-user-guide__note">
            Расширение не связано с администрацией FunPay. Автоматизация зависит от текущего интерфейса площадки и не отменяет её правила.
          </p>
        </div>
      </section>
    `;

    const close = () => {
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      previouslyFocused?.focus?.();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };

    overlay.querySelector('.fp-user-guide__close')
      .addEventListener('click', close);
    overlay.addEventListener('mousedown', (event) => {
      if (event.target === overlay) close();
    });
    document.addEventListener('keydown', onKeyDown);
    document.body.appendChild(overlay);
    overlay.querySelector('.fp-user-guide__close').focus();
  }
})();
