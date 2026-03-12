-- ArxMint Identity Graph: identity_aliases table
-- Maps external identity namespaces to ArxMint User root identities

CREATE TABLE "identity_aliases" (
    "id" TEXT NOT NULL,
    "root_id" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "linked_by" TEXT NOT NULL,
    "metadata" JSONB,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_aliases_pkey" PRIMARY KEY ("id")
);

-- One external ID can only resolve to one root (prevents conflicts)
CREATE UNIQUE INDEX "identity_aliases_namespace_external_id_key" ON "identity_aliases"("namespace", "external_id");

-- Fast lookup: all aliases for a given root user
CREATE INDEX "identity_aliases_root_id_idx" ON "identity_aliases"("root_id");

-- Fast lookup: resolve any ID without knowing its namespace
CREATE INDEX "identity_aliases_external_id_idx" ON "identity_aliases"("external_id");

-- Foreign key to users table
ALTER TABLE "identity_aliases" ADD CONSTRAINT "identity_aliases_root_id_fkey" FOREIGN KEY ("root_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
