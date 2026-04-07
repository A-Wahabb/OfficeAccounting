-- Ensure UUID generators are available in all environments.
-- Some environments may not have uuid-ossp enabled yet, which breaks
-- functions that call uuid_generate_v4().

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
