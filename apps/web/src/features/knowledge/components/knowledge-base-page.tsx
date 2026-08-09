'use client';

import * as React from 'react';
import type { CreateKnowledgeArticlePayload, KnowledgeArticle, KnowledgeChannel } from '@laam/types';
import { BookOpen, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { FormTextarea } from '@/components/form/form-textarea';
import Link from 'next/link';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { knowledgeApi } from '@/features/knowledge/api/knowledge-api';
import { useOrgCategoryOptions } from '@/features/settings/hooks/use-org-categories';
import { getOrgCategoryLabel } from '@/features/settings/data/org-categories-store';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

const CHANNELS: KnowledgeChannel[] = ['all', 'whatsapp', 'messenger'];

export function KnowledgeBasePage() {
  const knowledgeCategoryOptions = useOrgCategoryOptions('knowledge');
  const [articles, setArticles] = React.useState<KnowledgeArticle[]>([]);
  const [channel, setChannel] = React.useState<KnowledgeChannel | 'any'>('any');
  const [categoryFilter, setCategoryFilter] = React.useState('any');
  const [search, setSearch] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<CreateKnowledgeArticlePayload>({
    title: '',
    body: '',
    keywords: [],
    channels: ['all'],
    category: 'general',
    status: 'active',
  });
  const [keywordText, setKeywordText] = React.useState('');

  const refresh = React.useCallback(async () => {
    const items = await knowledgeApi.list({
      channel: channel === 'any' ? undefined : channel,
      q: search || undefined,
    });
    setArticles(
      categoryFilter === 'any'
        ? items
        : items.filter((item) => item.category === categoryFilter),
    );
  }, [categoryFilter, channel, search]);

  React.useEffect(() => {
    const t = setTimeout(() => void refresh(), search ? 250 : 0);
    return () => clearTimeout(t);
  }, [refresh, search]);

  async function handleCreate() {
    if (!draft.title.trim() || !draft.body.trim()) {
      toast.error('Title and body required');
      return;
    }
    await knowledgeApi.create({
      ...draft,
      keywords: keywordText.split(/[,;]/).map((k) => k.trim()).filter(Boolean),
    });
    setOpen(false);
    setDraft({ title: '', body: '', keywords: [], channels: ['all'], category: 'general', status: 'active' });
    setKeywordText('');
    toast.success('Article added — available for WhatsApp / Messenger bots');
    await refresh();
  }

  async function handleToggle(article: KnowledgeArticle) {
    await knowledgeApi.update(article.id, {
      status: article.status === 'active' ? 'draft' : 'active',
    });
    await refresh();
  }

  return (
    <PageShell
      title="Knowledge base"
      description="Answers for WhatsApp & Messenger automation — bots will search these articles by keywords."
    >
      <div className={ORDER_PAGE_GAP}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(['any', ...CHANNELS] as const).map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={channel === c ? 'default' : 'outline'}
                onClick={() => setChannel(c)}
              >
                {c === 'any' ? 'All channels' : c}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={categoryFilter === 'any' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('any')}
            >
              All categories
            </Button>
            {knowledgeCategoryOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={categoryFilter === option.value ? 'default' : 'outline'}
                onClick={() => setCategoryFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <Can permission="knowledge.manage">
            <Button type="button" size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              Add article
            </Button>
          </Can>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
            placeholder="Search knowledge (e.g. COD, delivery)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Manage categories in{' '}
          <Link href="/dashboard/settings/categories" className="font-medium text-primary hover:underline">
            Settings → Categories
          </Link>
          . Future bots: <code className="rounded bg-muted px-1">GET /crm/knowledge?channel=whatsapp&amp;q=…</code>
        </p>

        {!articles.length ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'py-10 text-center text-sm text-muted-foreground')}>
              No articles match. Add knowledge for your automation channels.
            </CardContent>
          </Card>
        ) : (
          articles.map((article) => (
            <Card key={article.id} className={ORDER_CARD_CLASS}>
              <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex-row items-start justify-between gap-2')}>
                <div className="flex items-start gap-2">
                  <BookOpen className="mt-0.5 size-4 text-primary" />
                  <div>
                    <CardTitle className="text-sm">{article.title}</CardTitle>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {article.channels.map((ch) => (
                        <Badge key={ch} variant="outline" className="text-[10px]">{ch}</Badge>
                      ))}
                      <Badge variant={article.status === 'active' ? 'success' : 'secondary'} className="text-[10px]">
                        {article.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {getOrgCategoryLabel('knowledge', article.category)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Can permission="knowledge.manage">
                  <Button type="button" size="sm" variant="ghost" onClick={() => void handleToggle(article)}>
                    {article.status === 'active' ? 'Draft' : 'Activate'}
                  </Button>
                </Can>
              </CardHeader>
              <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-2')}>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{article.body}</p>
                {article.keywords.length ? (
                  <p className="text-xs text-muted-foreground">
                    Keywords: {article.keywords.join(', ')}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New knowledge article</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label="Title">
              <FormInput value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </FormField>
            <FormField label="Answer body">
              <FormTextarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={4} />
            </FormField>
            <FormField label="Category">
              <FormSearchSelect
                value={draft.category}
                onChange={(value) => setDraft((current) => ({ ...current, category: value }))}
                options={knowledgeCategoryOptions}
                searchable={false}
              />
            </FormField>
            <FormField label="Keywords (comma separated)">
              <FormInput value={keywordText} onChange={(e) => setKeywordText(e.target.value)} placeholder="cod, payment, delivery" />
            </FormField>
            <FormField label="Channels">
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((ch) => {
                  const active = draft.channels?.includes(ch);
                  return (
                    <Button
                      key={ch}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      onClick={() => {
                        const current = draft.channels ?? [];
                        setDraft({
                          ...draft,
                          channels: active ? current.filter((c) => c !== ch) : [...current, ch],
                        });
                      }}
                    >
                      {ch}
                    </Button>
                  );
                })}
              </div>
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void handleCreate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
