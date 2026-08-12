'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CRMPage } from './crm-shell';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';
import { getSupabaseClient } from '../lib/supabase/client';

const s = (v: unknown) => String(v ?? '').trim();
const n = (v: unknown) => Number(v || 0) || 0;
const dt = (v: unknown) => {
  const x = s(v);
  return x ? new Date(x).toLocaleString('ar-SA') : '—';
};

export function SaudiMarketIntelligence() {
  const [data, setData] = useState<Record<string, SimpleRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<'NEW' | 'VERIFIED' | 'ALL'>('NEW');
  const [companyChoice, setCompanyChoice] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const specs: [string, number, string][] = [
        ['market_source_catalog', 100, 'created_at'],
        ['market_source_subscriptions', 100, 'updated_at'],
        ['market_radar_runs', 100, 'started_at'],
        ['raw_market_events', 2500, 'detected_at'],
        ['companies', 2000, 'company_name'],
        ['projects', 1500, 'updated_at'],
      ];
      const rows = await Promise.all(
        specs.map(async ([table, size, order]) => [
          table,
          (await simpleCrud.page(table, 1, size, { order })).rows,
        ] as const),
      );
      setData(Object.fromEntries(rows));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل Saudi Market Intelligence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const sources = data.market_source_catalog ?? [];
  const subscriptions = data.market_source_subscriptions ?? [];
  const runs = data.market_radar_runs ?? [];
  const events = data.raw_market_events ?? [];
  const companies = data.companies ?? [];
  const projects = data.projects ?? [];

  const subByKey = useMemo(
    () => new Map(subscriptions.map((x) => [s(x.source_key), x])),
    [subscriptions],
  );

  const runRadar = async (keys?: string[]) => {
    setRunning(true);
    setError('');
    setNotice('');
    try {
      const supabase = getSupabaseClient();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('الجلسة غير متصلة.');

      const { data: result, error: functionError } = await supabase.functions.invoke(
        'market-radar-worker',
        { body: { source_keys: keys ?? [] } },
      );
      if (functionError) throw functionError;

      setNotice(
        `اكتمل الرادار: ${Number(result?.events_inserted ?? 0)} إشارات جديدة من ${Number(result?.sources ?? 0)} مصادر.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تشغيل Market Radar.');
    } finally {
      setRunning(false);
    }
  };

  const toggleSource = async (source: SimpleRow) => {
    const key = s(source.source_key);
    const existing = subByKey.get(key);
    try {
      if (existing) {
        await simpleCrud.update('market_source_subscriptions', s(existing.id), {
          enabled: !Boolean(existing.enabled),
          updated_at: new Date().toISOString(),
        });
      } else {
        await simpleCrud.create('market_source_subscriptions', {
          source_key: key,
          enabled: true,
          query_override: '',
          cities: ['الدمام', 'الخبر', 'الظهران', 'الجبيل'],
          sectors: [],
        });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحديث المصدر.');
    }
  };

  const review = async (event: SimpleRow, status: 'verified' | 'rejected') => {
    try {
      await simpleCrud.update('raw_market_events', s(event.id), {
        verification_status: status,
        review_status: 'REVIEWED',
        updated_at: new Date().toISOString(),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر اعتماد الإشارة.');
    }
  };

  const createProject = async (event: SimpleRow) => {
    if (s(event.verification_status) !== 'verified') {
      setError('اعتمد الإشارة أولًا قبل إنشاء Project Candidate.');
      return;
    }
    try {
      const companyId = companyChoice[s(event.id)] || s(event.linked_company_id) || '';
      const project = await simpleCrud.create('projects', {
        project_name: s(event.project_name) || s(event.title) || 'Project Candidate',
        owner_company_id: companyId || null,
        source_signal_id: null,
        project_type: s(event.event_type) || 'UNCLASSIFIED',
        sector: s(event.sector),
        city: s(event.city),
        stage: 'CANDIDATE',
        route_to_revenue: 'UNDEFINED',
        verification_status: 'needs_research',
        verification_confidence: 0,
        source_url: s(event.source_url),
        why_now: s(event.summary) || s(event.title),
        last_signal_at:
          s(event.published_at) || s(event.detected_at) || new Date().toISOString(),
        next_action: 'حدد Owner / Consultant / Main Contractor والحزمة المناسبة.',
      });

      await simpleCrud.update('raw_market_events', s(event.id), {
        review_status: 'CONVERTED',
        linked_project_id: project.id,
        linked_company_id: companyId || null,
        updated_at: new Date().toISOString(),
      });

      setNotice(
        'تم إنشاء Project Candidate. المشروع نفسه بقي needs_research حتى التحقق البشري.',
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إنشاء Project Candidate.');
    }
  };

  const visible = useMemo(
    () =>
      events
        .filter(
          (event) =>
            filter === 'ALL' ||
            (filter === 'VERIFIED'
              ? s(event.verification_status) === 'verified'
              : s(event.review_status) === 'NEW'),
        )
        .sort(
          (a, b) =>
            n(b.overall_score) - n(a.overall_score) ||
            s(b.detected_at).localeCompare(s(a.detected_at)),
        ),
    [events, filter],
  );

  const latestRun = [...runs].sort((a, b) =>
    s(b.started_at).localeCompare(s(a.started_at)),
  )[0];

  return (
    <CRMPage
      title="Saudi Market Intelligence"
      description="مصادر سعودية موثقة → إشارات سوق → مراجعة بشرية → Project Candidate. لا تحويل تلقائي إلى فرصة أو تواصل."
    >
      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {notice && (
        <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-5">
        <div className="crm-kpi">
          <span>المصادر</span>
          <b className="mt-2 block text-3xl">{sources.length}</b>
        </div>
        <div className="crm-kpi">
          <span>إشارات جديدة</span>
          <b className="mt-2 block text-3xl">
            {events.filter((x) => s(x.review_status) === 'NEW').length}
          </b>
        </div>
        <div className="crm-kpi">
          <span>موثقة بشريًا</span>
          <b className="mt-2 block text-3xl">
            {events.filter((x) => s(x.verification_status) === 'verified').length}
          </b>
        </div>
        <div className="crm-kpi">
          <span>تحولت لمشروع</span>
          <b className="mt-2 block text-3xl">
            {events.filter((x) => s(x.review_status) === 'CONVERTED').length}
          </b>
        </div>
        <div className="crm-kpi">
          <span>آخر تشغيل</span>
          <b className="mt-2 block text-sm">{latestRun ? s(latestRun.status) : '—'}</b>
          <small>
            {latestRun ? `${Number(latestRun.events_inserted || 0)} جديد` : 'لا يوجد'}
          </small>
        </div>
      </section>

      <section className="crm-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[#8c7cff]">SOURCE CONTROL</p>
            <h3 className="text-xl font-bold">مصادر السوق السعودية</h3>
            <p className="mt-1 text-xs text-[#8f96a3]">
              افتراضيًا نراقب اعتماد، مدن، الهيئة السعودية للمقاولين، أرامكو وسابك.
            </p>
          </div>
          <button
            disabled={running}
            onClick={() => void runRadar()}
            className="btn-primary disabled:opacity-50"
          >
            {running ? 'جاري الفحص…' : 'تشغيل الرادار الآن'}
          </button>
        </div>

        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {sources.map((source) => {
            const sub = subByKey.get(s(source.source_key));
            const enabled = sub ? Boolean(sub.enabled) : true;
            return (
              <article key={s(source.source_key)} className="rounded-2xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="crm-chip status-neutral">{s(source.source_type)}</span>
                      <span className="crm-chip status-success">
                        Trust {Number(source.trust_score || 0)}
                      </span>
                    </div>
                    <b className="mt-2 block">{s(source.name)}</b>
                    <p className="mt-1 text-xs text-[#8f96a3]">{s(source.notes)}</p>
                  </div>
                  <button
                    onClick={() => void toggleSource(source)}
                    className={enabled ? 'btn-secondary' : 'btn-ghost'}
                  >
                    {enabled ? 'مفعل' : 'متوقف'}
                  </button>
                </div>
                <div className="mt-3 flex gap-2">
                  <a
                    href={s(source.base_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost"
                  >
                    فتح المصدر
                  </a>
                  <button
                    disabled={running}
                    onClick={() => void runRadar([s(source.source_key)])}
                    className="btn-ghost disabled:opacity-50"
                  >
                    فحص المصدر
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="crm-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[#ff9d5c]">REVIEW QUEUE</p>
            <h3 className="text-xl font-bold">إشارات تحتاج قرارًا</h3>
          </div>
          <div className="flex gap-2">
            {(
              [
                ['NEW', 'جديدة'],
                ['VERIFIED', 'موثقة'],
                ['ALL', 'الكل'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={filter === id ? 'btn-primary' : 'btn-ghost'}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="crm-empty">جارٍ تحميل Market Intelligence…</div>
      ) : (
        <div className="grid gap-3">
          {visible.map((event) => {
            const linkedProject = projects.find(
              (project) => s(project.id) === s(event.linked_project_id),
            );
            return (
              <article key={event.id} className="crm-card p-4">
                <div className="grid gap-4 lg:grid-cols-[1.45fr_.55fr_.8fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="crm-chip status-neutral">{s(event.source_key)}</span>
                      <span className="crm-chip status-neutral">{s(event.event_type)}</span>
                      <span
                        className={`crm-chip ${
                          s(event.verification_status) === 'verified'
                            ? 'status-success'
                            : s(event.verification_status) === 'rejected'
                              ? 'status-danger'
                              : 'status-warning'
                        }`}
                      >
                        {s(event.verification_status)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-bold">{s(event.title)}</h3>
                    <p className="mt-2 text-sm">{s(event.summary)}</p>
                    <p className="mt-2 text-xs text-[#8f96a3]">
                      Detected {dt(event.detected_at)} · Source Quality{' '}
                      {Number(event.source_quality || 0)}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-[#8f96a3]">Radar Score</span>
                    <b className="block text-3xl">{Number(event.overall_score || 0)}</b>
                    <small>
                      Event {Number(event.event_confidence || 0)} · Geo{' '}
                      {Number(event.geography_confidence || 0)}
                    </small>
                  </div>

                  <div>
                    <label className="text-xs">
                      ربط بمالك معروف (اختياري)
                      <select
                        value={
                          companyChoice[s(event.id)] || s(event.linked_company_id) || ''
                        }
                        onChange={(e) =>
                          setCompanyChoice((prev) => ({
                            ...prev,
                            [s(event.id)]: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border p-2"
                      >
                        <option value="">غير محدد</option>
                        {companies.map((company) => (
                          <option key={company.id} value={s(company.id)}>
                            {s(company.company_name)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:flex-col">
                    <a
                      href={s(event.source_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost"
                    >
                      المصدر
                    </a>

                    {s(event.review_status) === 'CONVERTED' && linkedProject ? (
                      <Link href={`/projects/${linkedProject.id}`} className="btn-primary">
                        فتح المشروع
                      </Link>
                    ) : (
                      <>
                        {s(event.verification_status) === 'needs_research' && (
                          <button
                            onClick={() => void review(event, 'verified')}
                            className="btn-secondary"
                          >
                            اعتماد الإشارة
                          </button>
                        )}
                        {s(event.verification_status) !== 'rejected' && (
                          <button
                            onClick={() => void review(event, 'rejected')}
                            className="btn-ghost"
                          >
                            رفض
                          </button>
                        )}
                        {s(event.verification_status) === 'verified' && (
                          <button
                            onClick={() => void createProject(event)}
                            className="btn-primary"
                          >
                            إنشاء Project Candidate
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {!visible.length && (
            <div className="crm-empty">
              لا توجد إشارات في هذا الفلتر. شغّل الرادار أو فعّل مصدرًا.
            </div>
          )}
        </div>
      )}
    </CRMPage>
  );
}
