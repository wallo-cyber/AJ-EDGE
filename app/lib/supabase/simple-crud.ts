import { getSupabaseClient } from './client';

export type SimpleValue = string | number | boolean | null | Record<string, unknown> | unknown[];
export type SimpleRow = Record<string, SimpleValue> & { id: string };

function databaseError(operation: string, error: { code?: string; message?: string }) {
  console.error(`[Supabase:${operation}]`, error.code || 'request_failed');
  return new Error('تعذر إتمام العملية في قاعدة البيانات. أعد المحاولة، وإن استمرت المشكلة راجع حالة النظام.');
}

export const simpleCrud = {
  async page(table: string, page = 1, pageSize = 25, options?: { column?: string; value?: string; order?: string; ascending?: boolean }) {
    const from = Math.max(0, page - 1) * pageSize;
    let query = getSupabaseClient().from(table).select('*', { count: 'exact' });
    if (options?.column && options.value !== undefined) query = query.eq(options.column, options.value);
    const { data, error, count } = await query.order(options?.order ?? 'created_at', { ascending: options?.ascending ?? false }).range(from, from + pageSize - 1);
    if (error) throw databaseError('page', error);
    return { rows: (data ?? []) as SimpleRow[], count: count ?? 0, page, pageSize };
  },
  async forCompany(table: string, companyId: string, pageSize = 100) {
    const { data, error } = await getSupabaseClient().from(table).select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(pageSize);
    if (error) throw databaseError('forCompany', error);
    return (data ?? []) as SimpleRow[];
  },
  async list(table: string) {
    const pageSize = 1000;
    const rows: SimpleRow[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await getSupabaseClient().from(table).select('*').order('created_at', { ascending: false }).range(from, from + pageSize - 1);
      if (error) throw databaseError('list', error);
      const page = (data ?? []) as SimpleRow[];
      rows.push(...page);
      if (page.length < pageSize) break;
    }
    return rows;
  },
  async listWhere(table: string, column: string, value: string) {
    const pageSize = 500;
    const rows: SimpleRow[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await getSupabaseClient().from(table).select('*').eq(column, value).order('created_at', { ascending: false }).range(from, from + pageSize - 1);
      if (error) throw databaseError('listWhere', error);
      const page = (data ?? []) as SimpleRow[];
      rows.push(...page);
      if (page.length < pageSize) break;
    }
    return rows;
  },
  async create(table: string, values: Record<string, unknown>) {
    const { data, error } = await getSupabaseClient().from(table).insert(values).select('*').single();
    if (error) throw databaseError('create', error);
    return data as SimpleRow;
  },
  async update(table: string, id: string, values: Record<string, unknown>) {
    const { data, error } = await getSupabaseClient().from(table).update({ ...values, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    if (error) throw databaseError('update', error);
    return data as SimpleRow;
  },
  async remove(table: string, id: string) {
    const { error } = await getSupabaseClient().from(table).delete().eq('id', id);
    if (error) throw databaseError('remove', error);
  },
};
