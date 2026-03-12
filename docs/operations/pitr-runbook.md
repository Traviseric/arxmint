# Postgres PITR Runbook

This runbook defines point-in-time recovery (PITR) for ArxMint Postgres.

## Scope

- Base backups: periodic physical snapshots using `pg_basebackup`.
- WAL archive: continuous Write-Ahead Log segment archiving from Postgres.
- Recovery target: restore to latest state or a specific timestamp.

## Prerequisites

1. Postgres runs with WAL archiving enabled (configured in `docker-compose.yml`):
   - `wal_level=replica`
   - `archive_mode=on`
   - `archive_command=.../var/lib/postgresql/wal-archive/...`
2. Docker named volumes exist:
   - `postgres-data`
   - `postgres-wal-archive`
3. Backup scripts are executable:
   - `scripts/backup_postgres_pitr_base.sh`
   - `scripts/restore_postgres_pitr.sh`
   - `scripts/prune_postgres_wal_archive.sh`

## Backup Schedule (Recommended)

1. Nightly logical backup (existing):
   - `0 2 * * * /app/scripts/backup_postgres.sh /backups/postgres >> /var/log/arxmint-backup.log 2>&1`
2. Nightly base backup:
   - `30 2 * * * /app/scripts/backup_postgres_pitr_base.sh /backups/postgres-pitr/base >> /var/log/arxmint-pitr.log 2>&1`
3. Daily WAL prune (retention policy):
   - `0 3 * * * PITR_WAL_RETENTION_DAYS=7 /app/scripts/prune_postgres_wal_archive.sh /var/lib/docker/volumes/arxmint_postgres-wal-archive/_data >> /var/log/arxmint-pitr.log 2>&1`

## Create Base Backup (Manual)

```bash
chmod +x scripts/backup_postgres_pitr_base.sh
./scripts/backup_postgres_pitr_base.sh /backups/postgres-pitr/base
```

Output example:
- `/backups/postgres-pitr/base/base_20260302_184500.tar.gz`

## Verify WAL Archive Health

```bash
docker exec sf-postgres psql -U arxmint -d arxmint -c "SELECT now(), pg_current_wal_lsn();"
ls -lht /var/lib/docker/volumes/arxmint_postgres-wal-archive/_data | head -20
```

Pass criteria:
- WAL files are present and continuing to update during write activity.

## Restore (Latest Available)

```bash
chmod +x scripts/restore_postgres_pitr.sh
./scripts/restore_postgres_pitr.sh /backups/postgres-pitr/base/base_YYYYMMDD_HHMMSS.tar.gz
```

This restores from the selected base backup and replays available WAL to latest state.

## Restore (Specific Time)

```bash
./scripts/restore_postgres_pitr.sh \
  /backups/postgres-pitr/base/base_YYYYMMDD_HHMMSS.tar.gz \
  "2026-03-02 18:30:00+00"
```

This restores from the base backup and replays WAL until `recovery_target_time`, then promotes.

## Post-Restore Validation

```bash
docker compose ps postgres
docker exec sf-postgres psql -U arxmint -d arxmint -c "SELECT now();"
docker exec sf-postgres psql -U arxmint -d arxmint -c "SELECT COUNT(*) FROM \"Community\";"
docker exec sf-postgres psql -U arxmint -d arxmint -c "SELECT COUNT(*) FROM \"Merchant\";"
```

## Notes

- PITR depends on retained WAL files; do not prune WAL more aggressively than your RPO.
- Keep base backups and WAL archives on encrypted off-host storage for production.
- Use this runbook alongside `docs/operations/dr-drill.md` for full-stack disaster recovery exercises.
