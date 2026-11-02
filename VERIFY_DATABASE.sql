-- READ-ONLY VERIFICATION (run in Supabase SQL Editor)
-- 4 tables should all show 'true'.
select tablename, rowsecurity as rls_enabled
from pg_tables
where schemaname='public'
  and tablename in ('admin_users','orders','order_updates','offers')
order by tablename;

-- Confirm order reference and private code are created server-side.
select column_name, column_default
from information_schema.columns
where table_schema='public' and table_name='orders'
  and column_name in ('id','reference','tracking_token','status');

-- Confirm the status-history trigger exists.
select event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where event_object_schema='public'
  and event_object_table='orders';
