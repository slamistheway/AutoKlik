import { is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as schema from './schema';

describe('Application table RLS', () => {
  const tables = Object.values(schema).filter(value => is(value, PgTable)).map(table => getTableConfig(table));

  it('enables RLS on every exported table without granting direct client access', () => {
    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      expect({ name: table.name, enabled: table.enableRLS, policies: table.policies }).toEqual({
        name: table.name, enabled: true, policies: [],
      });
    }
  });

  it('provides a transaction covering exactly the application tables', () => {
    const sql = readFileSync(join(__dirname, '../../sql/enable-rls.sql'), 'utf8');
    const migrated = [...sql.matchAll(/ALTER TABLE public\."([^"]+)" ENABLE ROW LEVEL SECURITY;/g)].map(match => match[1]);
    expect(migrated.sort()).toEqual(tables.map(table => table.name).sort());
    expect(sql).toContain('BEGIN;');
    expect(sql).toContain('COMMIT;');
    expect(sql).not.toMatch(/FORCE ROW LEVEL SECURITY|CREATE POLICY|DROP TABLE|DISABLE ROW LEVEL SECURITY/);
  });
});
