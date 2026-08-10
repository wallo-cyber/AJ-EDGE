create index if not exists agent_jobs_company_id_idx on public.agent_jobs(company_id);
create index if not exists agent_runs_job_id_idx on public.agent_runs(job_id);
create index if not exists agent_logs_job_id_idx on public.agent_logs(job_id);
create index if not exists agent_logs_run_id_idx on public.agent_logs(run_id);
create index if not exists agent_errors_job_id_idx on public.agent_errors(job_id);
create index if not exists agent_errors_run_id_idx on public.agent_errors(run_id);
