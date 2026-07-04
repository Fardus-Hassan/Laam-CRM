import type {
  CreateKnowledgeArticlePayload,
  KnowledgeArticle,
  KnowledgeSearchQuery,
} from '@laam/types';

const now = '2026-07-04T10:00:00Z';

let articles: KnowledgeArticle[] = [
  {
    id: 'kb-1',
    title: 'Delivery time — Dhaka & outside',
    body: 'Dhaka metro: usually 1–2 days. Outside Dhaka: 2–4 days depending on courier. Track updates are sent via SMS.',
    keywords: ['delivery', 'time', 'koto din', 'shipping', 'courier'],
    channels: ['whatsapp', 'messenger', 'all'],
    category: 'delivery',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'kb-2',
    title: 'COD policy',
    body: 'We accept Cash on Delivery. Please keep the exact amount ready. You may open the parcel in front of the rider if sealed packaging allows.',
    keywords: ['cod', 'cash', 'payment', 'tk', 'taka'],
    channels: ['whatsapp', 'messenger', 'all'],
    category: 'payment',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'kb-3',
    title: 'How to store modhu (honey)',
    body: 'Keep honey in a cool dry place. Do not refrigerate. Natural crystallization is normal — warm the jar in room-temperature water.',
    keywords: ['modhu', 'honey', 'store', 'crystal'],
    channels: ['whatsapp', 'all'],
    category: 'product',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'kb-4',
    title: 'Return & exchange',
    body: 'Damaged or wrong product: contact us within 24 hours of delivery with photos. We arrange replacement or refund after verification.',
    keywords: ['return', 'refund', 'exchange', 'wrong', 'damage'],
    channels: ['whatsapp', 'messenger', 'all'],
    category: 'returns',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'kb-5',
    title: 'Ramadan gift box',
    body: 'Gift boxes include modhu + khejur combo. Custom cards available on request. Order 3 days before Eid for guaranteed delivery.',
    keywords: ['ramadan', 'gift', 'box', 'eid'],
    channels: ['messenger', 'all'],
    category: 'product',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  },
];

export function listKnowledgeArticles(query: KnowledgeSearchQuery = {}): KnowledgeArticle[] {
  let result = [...articles];
  if (query.status) {
    result = result.filter((a) => a.status === query.status);
  } else {
    result = result.filter((a) => a.status !== 'archived');
  }
  if (query.channel && query.channel !== 'all') {
    result = result.filter(
      (a) => a.channels.includes('all') || a.channels.includes(query.channel!),
    );
  }
  if (query.q?.trim()) {
    const q = query.q.trim().toLowerCase();
    result = result
      .map((a) => {
        const hay = `${a.title} ${a.body} ${a.keywords.join(' ')}`.toLowerCase();
        const score = hay.includes(q) ? 2 : a.keywords.some((k) => k.toLowerCase().includes(q)) ? 1 : 0;
        return { a, score };
      })
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score)
      .map((x) => x.a);
  }
  return result;
}

export function getKnowledgeArticle(id: string): KnowledgeArticle | undefined {
  return articles.find((a) => a.id === id);
}

export function createKnowledgeArticle(payload: CreateKnowledgeArticlePayload): KnowledgeArticle {
  const ts = new Date().toISOString();
  const article: KnowledgeArticle = {
    id: `kb-${Date.now()}`,
    title: payload.title,
    body: payload.body,
    keywords: payload.keywords ?? [],
    channels: payload.channels?.length ? payload.channels : ['all'],
    category: payload.category ?? 'general',
    status: payload.status ?? 'active',
    createdAt: ts,
    updatedAt: ts,
  };
  articles = [article, ...articles];
  return article;
}

export function updateKnowledgeArticle(
  id: string,
  patch: Partial<CreateKnowledgeArticlePayload>,
): KnowledgeArticle | undefined {
  const idx = articles.findIndex((a) => a.id === id);
  if (idx < 0) return undefined;
  const updated: KnowledgeArticle = {
    ...articles[idx],
    ...patch,
    keywords: patch.keywords ?? articles[idx].keywords,
    channels: patch.channels ?? articles[idx].channels,
    updatedAt: new Date().toISOString(),
  };
  articles = articles.map((a, i) => (i === idx ? updated : a));
  return updated;
}

export function deleteKnowledgeArticle(id: string): boolean {
  const before = articles.length;
  articles = articles.filter((a) => a.id !== id);
  return articles.length < before;
}
