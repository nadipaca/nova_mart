param(
  [string] $Container = "novamart-catalog-postgres",
  [string] $Database = "novamart_catalog",
  [string] $User = "novamart",
  [int] $IntervalSeconds = 5
)

$ErrorActionPreference = "Stop"

$query = @"
select
  now() as now,
  state,
  wait_event_type,
  wait_event,
  count(*) as count
from pg_stat_activity
group by 1,2,3,4
order by 5 desc;
"@

while ($true) {
  docker exec $Container psql -U $User -d $Database -c $query
  Start-Sleep -Seconds $IntervalSeconds
}

