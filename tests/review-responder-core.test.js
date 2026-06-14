import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.FunPayAutomation = {};
await import('../content/review-responder-core.js');

const Core = globalThis.FunPayAutomation.ReviewResponderCore;

test('normalizes review-reply settings with five star slots', () => {
  const settings = Core.normalizeSettings({
    reviewReplyEnabled: 1,
    reviewReplyDelayMinutes: 9999,
    reviewReplyTemplate: 'Спасибо!',
    reviewReplyStars: { '1': 'Жаль', '3': '', extra: 'ignored' }
  });

  assert.equal(settings.reviewReplyEnabled, true);
  assert.equal(settings.reviewReplyDelayMinutes, 1440);
  assert.equal(settings.reviewReplyTemplate, 'Спасибо!');
  assert.deepEqual(Object.keys(settings.reviewReplyStars), ['1', '2', '3', '4', '5']);
  assert.equal(settings.reviewReplyStars['1'], 'Жаль');
  assert.equal(settings.reviewReplyStars['3'], '');
});

test('resolves per-rating override, falling back to the shared template', () => {
  const settings = Core.normalizeSettings({
    reviewReplyTemplate: 'Общий',
    reviewReplyStars: { '1': 'Извините', '5': '' }
  });

  assert.equal(Core.resolveTemplate(1, settings), 'Извините');
  assert.equal(Core.resolveTemplate(5, settings), 'Общий');
  assert.equal(Core.resolveTemplate(4, settings), 'Общий');
});

test('renders variables in a reply', () => {
  const text = Core.renderText('{buyername}, спасибо за отзыв к #{order}!', {
    buyerName: 'Founy',
    orderId: 'Q5YD8SJ4'
  });
  assert.equal(text, 'Founy, спасибо за отзыв к #Q5YD8SJ4!');
});

test('builds the /orders/review reply body', () => {
  const body = Core.buildReplyBody({
    authorId: '11360744',
    orderId: 'WWYFJ9RM',
    text: 'Спасибо!',
    csrfToken: 'abc'
  });
  const params = new URLSearchParams(body);
  assert.equal(params.get('authorId'), '11360744');
  assert.equal(params.get('orderId'), 'WWYFJ9RM');
  assert.equal(params.get('text'), 'Спасибо!');
  assert.equal(params.get('rating'), '');
  assert.equal(params.get('csrf_token'), 'abc');
});

test('parses reviews from a profile document', () => {
  const doc = mockDocument([
    reviewElement({
      order: 'Q5YD8SJ4',
      ratingClass: 'rating5',
      buyer: 'Founy',
      detail: 'Claude, 10 ₽',
      replied: false
    }),
    reviewElement({
      order: 'AAA111',
      ratingClass: 'rating1',
      buyer: 'Bad',
      detail: '',
      replied: true
    }),
    reviewElement({ order: '', ratingClass: 'rating4', buyer: '', detail: '', replied: false })
  ]);

  const reviews = Core.parseReviews(doc);

  assert.equal(reviews.length, 2); // the order-less one is dropped
  assert.deepEqual(
    {
      order: reviews[0].orderId,
      rating: reviews[0].rating,
      buyer: reviews[0].buyerName,
      replied: reviews[0].hasReply
    },
    { order: 'Q5YD8SJ4', rating: 5, buyer: 'Founy', replied: false }
  );
  assert.equal(reviews[1].orderId, 'AAA111');
  assert.equal(reviews[1].rating, 1);
  assert.equal(reviews[1].hasReply, true);
});

function mockDocument(containers) {
  return {
    querySelectorAll: (selector) =>
      selector === '.review-container' ? containers : []
  };
}

function reviewElement({ order, ratingClass, buyer, detail, replied }) {
  return {
    querySelector(selector) {
      switch (selector) {
        case '.review-item-order a':
          return order
            ? { getAttribute: () => `https://funpay.com/orders/${order}/` }
            : null;
        case '.review-item-rating .rating > div':
          return ratingClass ? { classList: [ratingClass] } : null;
        case '.media-user-name a':
          return { textContent: buyer };
        case '.review-item-detail':
          return { textContent: detail };
        case '.review-item-answer':
          return replied ? {} : null;
        default:
          return null;
      }
    }
  };
}
