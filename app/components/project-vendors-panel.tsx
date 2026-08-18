'use client';

import { useEffect, useMemo, useState } from 'react';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';
import { LINK_STATUSES } from './vendor-projects-panel';

const safe = (v: unknown) => String(v ?? '').trim();

/** لوحة ربط مشروع بموردين — نفس الخيار أ من معاينة الأمثلة، من طرف صفحة المشروع. */
export function ProjectVendorsPanel({ projectId }: { projectId: string }) {
  const [vendors, setVendors] = useState<SimpleRow[]>([]);
  const [links, setLinks] = useState<SimpleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<(typeof LINK_STATUSES)[number]>('مبدئي');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [allVendors, allLinks] = await Promise.all([
        simpleCrud.list('vendors'),
        simpleCrud.listWhere('project_vendors', 'project_id', projectId),
      ]);
      setVendors(allVendors.filter((v) => v.is_active !== false));
      setLinks(allLinks);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل الموردين المرتبطين.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const vendorById = useMemo(() => new Map(vendors.map((v) => [safe(v.id), v])), [vendors]);

  const addLink = async () => {
    if (!vendorId) {
      setError('اختر موردًا أولًا.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await simpleCrud.create('project_vendors', {
        project_id: projectId,
        vendor_id: vendorId,
        role: role.trim(),
        status,
      });
      setVendorId('');
      setRole('');
      setStatus('مبدئي');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر ربط المورد.');
    } finally {
      setSaving(false);
    }
  };
  const updateStatus = async (link: SimpleRow, next: string) => {
    try {
      await simpleCrud.update('project_vendors', safe(link.id), { status: next });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحديث الحالة.');
    }
  };
  const removeLink = async (link: SimpleRow) => {
    const vendor = vendorById.get(safe(link.vendor_id));
    if (!confirm(`إزالة ربط "${safe(vendor?.company_name) || 'المورد'}" بهذا المشروع؟`)) return;
    try {
      await simpleCrud.remove('project_vendors', safe(link.id));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إزالة الربط.');
    }
  };

  const field =
    'rounded-xl border border-[var(--nav-border)] bg-transparent p-2 text-sm outline-none focus:border-[var(--nav-accent)]';

  return (
    <section className="crm-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-[var(--nav-accent)]">مقاولو الباطن</p>
          <h3 className="text-lg font-bold">الموردون المرتبطون بالمشروع</h3>
        </div>
        <span className="crm-chip status-neutral">{links.length} مورد</span>
      </div>
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
      {loading ? (
        <p className="mt-4 text-sm text-[var(--nav-secondary)]">جارٍ التحميل...</p>
      ) : (
        <>
          <div className="mt-4 grid gap-2 md:grid-cols-[2fr_1.5fr_1fr_auto]">
            <select className={field} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">— اختر موردًا —</option>
              {vendors.map((v) => (
                <option key={safe(v.id)} value={safe(v.id)}>
                  {safe(v.company_name)}
                  {safe(v.trade) ? ` — ${safe(v.trade)}` : ''}
                </option>
              ))}
            </select>
            <input className={field} value={role} onChange={(e) => setRole(e.target.value)} placeholder="الدور / نطاق العمل" />
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
            <p className="mt-4 text-sm text-[var(--nav-secondary)]">لا يوجد موردون مرتبطون بهذا المشروع بعد.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {links.map((link) => {
                const vendor = vendorById.get(safe(link.vendor_id));
                return (
                  <div
                    key={safe(link.id)}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--nav-border)] px-3 py-2"
                  >
                    <div>
                      <span className="font-semibold">{safe(vendor?.company_name) || 'مورد محذوف'}</span>
                      {safe(link.role) && <span className="mr-2 text-xs text-[var(--nav-secondary)]">{safe(link.role)}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className={`${field} !w-auto`}
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
    </section>
  );
}
