'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';

const safe = (v: unknown) => String(v ?? '').trim();
export const LINK_STATUSES = ['مبدئي', 'عرض سعر مُرسل', 'متعاقد', 'مرفوض'] as const;

/** لوحة ربط عامل/عمالة بمشاريع — نفس فكرة لوحة الموردين. تُستخدم من صفحة العمالة. */
export function LaborProjectsPanel({ laborId }: { laborId: string }) {
  const [projects, setProjects] = useState<SimpleRow[]>([]);
  const [links, setLinks] = useState<SimpleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectId, setProjectId] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<(typeof LINK_STATUSES)[number]>('مبدئي');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [allProjects, allLinks] = await Promise.all([
        simpleCrud.list('projects'),
        simpleCrud.listWhere('project_labor', 'labor_id', laborId),
      ]);
      setProjects(allProjects);
      setLinks(allLinks);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل المشاريع المرتبطة.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laborId]);

  const projectById = useMemo(() => new Map(projects.map((p) => [safe(p.id), p])), [projects]);

  const addLink = async () => {
    if (!projectId) {
      setError('اختر مشروعًا أولًا.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await simpleCrud.create('project_labor', {
        project_id: projectId,
        labor_id: laborId,
        role: role.trim(),
        status,
      });
      setProjectId('');
      setRole('');
      setStatus('مبدئي');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر ربط المشروع.');
    } finally {
      setSaving(false);
    }
  };
  const updateStatus = async (link: SimpleRow, next: string) => {
    try {
      await simpleCrud.update('project_labor', safe(link.id), { status: next });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحديث الحالة.');
    }
  };
  const removeLink = async (link: SimpleRow) => {
    if (!confirm('إزالة ربط هذا المشروع بالعامل؟')) return;
    try {
      await simpleCrud.remove('project_labor', safe(link.id));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إزالة الربط.');
    }
  };

  const field =
    'w-full rounded-xl border border-[var(--nav-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--nav-accent)]';

  return (
    <div className="rounded-xl border border-[var(--nav-border)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[var(--nav-accent)]">المشاريع المرتبطة</p>
        {!loading && <span className="text-xs text-[var(--nav-secondary)]">{links.length}</span>}
      </div>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
      {loading ? (
        <p className="mt-2 text-xs text-[var(--nav-secondary)]">جارٍ التحميل...</p>
      ) : (
        <>
          <div className="mt-2 grid gap-2 md:grid-cols-[2fr_1.5fr_1fr_auto]">
            <select className={field} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">— اختر مشروعًا —</option>
              {projects.map((p) => (
                <option key={safe(p.id)} value={safe(p.id)}>
                  {safe(p.project_name)}
                </option>
              ))}
            </select>
            <input
              className={field}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="الدور / نطاق العمل"
            />
            <select
              className={field}
              value={status}
              onChange={(e) => setStatus(e.target.value as (typeof LINK_STATUSES)[number])}
            >
              {LINK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button className="btn-primary" disabled={saving} onClick={() => void addLink()}>
              {saving ? '...' : 'ربط'}
            </button>
          </div>
          {links.length === 0 ? (
            <p className="mt-3 text-xs text-[var(--nav-secondary)]">لا يوجد مشاريع مرتبطة بهذا العامل بعد.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {links.map((link) => {
                const project = projectById.get(safe(link.project_id));
                return (
                  <div
                    key={safe(link.id)}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--nav-border)] px-3 py-2 text-sm"
                  >
                    <div>
                      {project ? (
                        <Link href={`/projects/${safe(project.id)}`} className="font-semibold hover:underline">
                          {safe(project.project_name)}
                        </Link>
                      ) : (
                        <span className="font-semibold">مشروع محذوف</span>
                      )}
                      {safe(link.role) && <span className="mr-2 text-xs text-[var(--nav-secondary)]">{safe(link.role)}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className={`${field} !w-auto text-xs`}
                        value={safe(link.status) || 'مبدئي'}
                        onChange={(e) => void updateStatus(link, e.target.value)}
                      >
                        {LINK_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        className="rounded-lg border border-rose-400/50 px-2 py-1 text-xs font-semibold text-rose-400 hover:border-rose-400"
                        onClick={() => void removeLink(link)}
                      >
                        إزالة
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
