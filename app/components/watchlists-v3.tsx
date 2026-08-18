"use client";
import { useEffect, useMemo, useState } from "react";
import { CRMPage } from "./crm-shell";
import { simpleCrud, type SimpleRow } from "../lib/supabase/simple-crud";
import { signalPriority } from "../lib/acquisition-os/core";

const s = (v: unknown) => String(v ?? "").trim();
const arr = (v: string) =>
  v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export function WatchlistsV3() {
  const [watchlists, setWatchlists] = useState<SimpleRow[]>([]),
    [signals, setSignals] = useState<SimpleRow[]>([]),
    [companies, setCompanies] = useState<SimpleRow[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    name: "",
    sectors: "",
    cities: "",
    project_types: "",
    stages: "",
    signal_types: "",
    min_signal_score: 60,
    min_project_value: "",
    max_project_value: "",
  });
  const load = async () => {
    setLoading(true);
    try {
      const [w, sg, c] = await Promise.all([
        simpleCrud.page("project_watchlists", 1, 500, { order: "updated_at" }),
        simpleCrud.page("external_signals", 1, 2000, { order: "detected_at" }),
        simpleCrud.page("companies", 1, 2000, { order: "company_name" }),
      ]);
      setWatchlists(w.rows);
      setSignals(sg.rows);
      setCompanies(c.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل Watchlists.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const companyById = useMemo(
    () => new Map(companies.map((c) => [s(c.id), c])),
    [companies],
  );
  const matches = (w: SimpleRow) =>
    signals.filter((sig) => {
      const c = companyById.get(s(sig.company_id));
      const sectors = Array.isArray(w.sectors) ? w.sectors : [],
        cities = Array.isArray(w.cities) ? w.cities : [],
        types = Array.isArray(w.signal_types) ? w.signal_types : [];
      return (
        (!sectors.length || sectors.includes(s(c?.sector))) &&
        (!cities.length || cities.includes(s(c?.city))) &&
        (!types.length || types.includes(s(sig.signal_type))) &&
        signalPriority(sig) >= Number(w.min_signal_score || 0)
      );
    }).length;
  const create = async () => {
    if (!form.name.trim()) {
      setError("اسم Watchlist مطلوب.");
      return;
    }
    try {
      await simpleCrud.create("project_watchlists", {
        name: form.name,
        enabled: true,
        sectors: arr(form.sectors),
        cities: arr(form.cities),
        project_types: arr(form.project_types),
        stages: arr(form.stages),
        signal_types: arr(form.signal_types),
        min_signal_score: Number(form.min_signal_score || 0),
        min_project_value: form.min_project_value
          ? Number(form.min_project_value)
          : null,
        max_project_value: form.max_project_value
          ? Number(form.max_project_value)
          : null,
      });
      setNotice(
        "تم إنشاء Watchlist. سيطابق الإشارات المخزنة دون إرسال أو إنشاء فرص تلقائيًا.",
      );
      setForm({
        name: "",
        sectors: "",
        cities: "",
        project_types: "",
        stages: "",
        signal_types: "",
        min_signal_score: 60,
        min_project_value: "",
        max_project_value: "",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر إنشاء Watchlist.");
    }
  };
  return (
    <CRMPage
      title="Project Watchlists"
      description="فلاتر دائمة للمشاريع والإشارات التي تهمنا فعلًا بدل تصفح السوق يدويًا كل مرة."
    >
      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}
      <section className="crm-card p-4">
        <div>
          <p className="text-xs font-bold text-[var(--nav-accent)]">NEW WATCHLIST</p>
          <h3 className="text-xl font-bold">احفظ استراتيجية البحث</h3>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="مثال: توسعات مصانع الجبيل"
            className="rounded-xl border p-2"
          />
          <input
            value={form.sectors}
            onChange={(e) => setForm({ ...form, sectors: e.target.value })}
            placeholder="Sectors مفصولة بفاصلة"
            className="rounded-xl border p-2"
          />
          <input
            value={form.cities}
            onChange={(e) => setForm({ ...form, cities: e.target.value })}
            placeholder="Cities مفصولة بفاصلة"
            className="rounded-xl border p-2"
          />
          <input
            value={form.signal_types}
            onChange={(e) => setForm({ ...form, signal_types: e.target.value })}
            placeholder="Signal Types"
            className="rounded-xl border p-2"
          />
          <label className="text-xs">
            Min Signal Score
            <input
              type="number"
              min="0"
              max="100"
              value={form.min_signal_score}
              onChange={(e) =>
                setForm({ ...form, min_signal_score: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-xl border p-2"
            />
          </label>
          <input
            value={form.project_types}
            onChange={(e) =>
              setForm({ ...form, project_types: e.target.value })
            }
            placeholder="Project Types"
            className="rounded-xl border p-2"
          />
        </div>
        <button onClick={() => void create()} className="btn-primary mt-3">
          حفظ Watchlist
        </button>
      </section>
      {loading ? (
        <div className="crm-empty">جارٍ تحميل Watchlists…</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {watchlists.map((w) => (
            <article className="crm-card p-4" key={w.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">{s(w.name)}</h3>
                  <p className="mt-1 text-xs text-[#8f96a3]">
                    Min Signal Score {Number(w.min_signal_score || 0)} ·{" "}
                    {Boolean(w.enabled) ? "ACTIVE" : "PAUSED"}
                  </p>
                </div>
                <b className="text-3xl">{matches(w)}</b>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Array.isArray(w.sectors) ? w.sectors : []).map((x) => (
                  <span className="crm-chip status-neutral" key={s(x)}>
                    {s(x)}
                  </span>
                ))}
                {(Array.isArray(w.cities) ? w.cities : []).map((x) => (
                  <span className="crm-chip status-neutral" key={s(x)}>
                    {s(x)}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-[#8f96a3]">
                مطابقات حالية في Signal Radar: {matches(w)}
              </p>
            </article>
          ))}
          {!watchlists.length && (
            <div className="crm-empty md:col-span-2">
              لا توجد Watchlists بعد.
            </div>
          )}
        </div>
      )}
    </CRMPage>
  );
}
