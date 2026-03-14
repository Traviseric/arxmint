-- ArxMint Identity Graph: identity_aliases table
-- Maps external identity namespaces to ArxMint User root identities

CREATE TABLE IF NOT EXISTS "identity_aliases" (
    "id" TEXT NOT NULL,
    "rootId" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "linkedBy" TEXT NOT NULL,
    "metadata" JSONB,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_aliases_pkey" PRIMARY KEY ("id")
);

-- One external ID can only resolve to one root (prevents conflicts)
CREATE UNIQUE INDEX IF NOT EXISTS "identity_aliases_namespace_externalId_key" ON "identity_aliases"("namespace", "externalId");

-- Fast lookup: all aliases for a given root user
CREATE INDEX IF NOT EXISTS "identity_aliases_rootId_idx" ON "identity_aliases"("rootId");

-- Fast lookup: resolve any ID without knowing its namespace
CREATE INDEX IF NOT EXISTS "identity_aliases_externalId_idx" ON "identity_aliases"("externalId");

-- Foreign key to users table
DO $$ BEGIN
  ALTER TABLE "identity_aliases" ADD CONSTRAINT "identity_aliases_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
