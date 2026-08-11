import { getSupabaseClient } from './client';

export type SimpleRow = Record<string, string | number | null> & { id: string };

export const simpleCrud = {
  async list(table: string) {
    const pageSize = 1000;
    const rows: SimpleRow[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await getSupabaseClient().from(table).select('*').order('created_at', { ascending: false }).range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const page = (data ?? []) as SimpleRow[];
      rows.push(...page);
      if (page.length < pageSize) break;
    }
    return rows;
  },
  async create(table: string, values: Record<string, unknown>) {
    const { data, error } = await getSupabaseClient().from(table).insert(values).select('*').single();
    if (error) throw new Error(error.message);
    return data as SimpleRow;
  },
  async update(table: string, id: string, values: Record<string, unknown>) {
    const { data, error } = await getSupabaseClient().from(table).update({ ...values, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    if (error) throw new Error(error.message);
    return data as SimpleRow;
  },
  async remove(table: string, id: string) {
    const { error } = await getSupabaseClient().from(table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};
