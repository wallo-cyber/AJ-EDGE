import { getSupabaseClient } from './client';

export type SimpleRow = Record<string, string | number | null> & { id: string };

export const simpleCrud = {
  async list(table: string) {
    const { data, error } = await getSupabaseClient().from(table).select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as SimpleRow[];
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
