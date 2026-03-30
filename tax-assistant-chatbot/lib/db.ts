import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getDemoProperties, PropertyRecord } from './demo-data';
import { getIntegratedTaxFields } from './property-analytics';

type SQLiteValue = string | number | null;

const sqliteDbPath =
  process.env.SQLITE_DB_PATH && path.isAbsolute(process.env.SQLITE_DB_PATH)
    ? process.env.SQLITE_DB_PATH
    : path.join(process.cwd(), 'data', 'property-tax.sqlite');

let sqlJsPromise: Promise<any> | null = null;
let databasePromise: Promise<any> | null = null;

function getSqlJs() {
  if (!sqlJsPromise) {
    sqlJsPromise = import('sql.js/dist/sql-asm.js').then((module) =>
      module.default()
    );
  }

  return sqlJsPromise;
}

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = openDatabase().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

async function openDatabase() {
  const SQL = await getSqlJs();
  await mkdir(path.dirname(sqliteDbPath), { recursive: true });

  let database: any;

  try {
    const fileContents = await readFile(sqliteDbPath);
    database = new SQL.Database(new Uint8Array(fileContents));
  } catch {
    database = new SQL.Database();
  }

  await ensureDatabaseSchema(database);
  await persistDatabase(database);

  console.log('[DB] SQLite database ready:', sqliteDbPath);
  return database;
}

async function ensureDatabaseSchema(database: any) {
  runStatement(
    database,
    `CREATE TABLE IF NOT EXISTS properties (
      property_id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_name TEXT NOT NULL,
      ward TEXT NOT NULL,
      zone TEXT NOT NULL,
      property_address TEXT,
      tax_amount REAL NOT NULL DEFAULT 0,
      due_amount REAL NOT NULL DEFAULT 0,
      water_tax_due REAL NOT NULL DEFAULT 0,
      sewerage_tax_due REAL NOT NULL DEFAULT 0,
      solid_waste_tax_due REAL NOT NULL DEFAULT 0,
      last_payment_date TEXT,
      payment_status TEXT NOT NULL DEFAULT 'UNPAID',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`
  );

  ensureIntegratedTaxColumns(database);
  backfillIntegratedTaxData(database);

  runStatement(
    database,
    `CREATE INDEX IF NOT EXISTS idx_ward ON properties (ward);`
  );
  runStatement(
    database,
    `CREATE INDEX IF NOT EXISTS idx_zone ON properties (zone);`
  );
  runStatement(
    database,
    `CREATE INDEX IF NOT EXISTS idx_payment_status ON properties (payment_status);`
  );
  runStatement(
    database,
    `CREATE INDEX IF NOT EXISTS idx_due_amount ON properties (due_amount);`
  );

  const existingRows = getExecRows<{ count: number }>(
    database.exec('SELECT COUNT(*) as count FROM properties;')
  );

  if ((existingRows[0]?.count || 0) > 0) {
    createWardCollectionView(database);
    return false;
  }

  const properties = await getDemoProperties();
  const insertStatement = database.prepare(
    `INSERT INTO properties (
      property_id,
      owner_name,
      ward,
      zone,
      property_address,
      tax_amount,
      due_amount,
      water_tax_due,
      sewerage_tax_due,
      solid_waste_tax_due,
      last_payment_date,
      payment_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
  );

  try {
    for (const property of properties) {
      insertStatement.run([
        property.property_id,
        property.owner_name,
        property.ward,
        property.zone,
        property.property_address,
        property.tax_amount,
        property.due_amount,
        property.water_tax_due,
        property.sewerage_tax_due,
        property.solid_waste_tax_due,
        property.last_payment_date,
        property.payment_status,
      ]);
    }
  } finally {
    insertStatement.free();
  }

  createWardCollectionView(database);
  return true;
}

function createWardCollectionView(database: any) {
  runStatement(database, 'DROP VIEW IF EXISTS ward_collection_summary;');
  runStatement(
    database,
    `CREATE VIEW ward_collection_summary AS
      SELECT
        ward,
        COUNT(*) AS total_properties,
        SUM(tax_amount) AS total_tax,
        SUM(due_amount) AS total_due,
        SUM(tax_amount - due_amount) AS total_collected,
        SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) AS paid_count,
        SUM(CASE WHEN payment_status = 'UNPAID' THEN 1 ELSE 0 END) AS unpaid_count,
        SUM(CASE WHEN payment_status = 'PARTIAL' THEN 1 ELSE 0 END) AS partial_count
      FROM properties
      GROUP BY ward;`
  );
}

async function persistDatabase(database: any) {
  const exportedDatabase = database.export();
  await writeFile(sqliteDbPath, Buffer.from(exportedDatabase));
}

function ensureIntegratedTaxColumns(database: any) {
  const columns = getExecRows<{ name: string }>(
    database.exec('PRAGMA table_info(properties);')
  ).map((column) => column.name);
  const existingColumns = new Set(columns);

  const requiredColumns = [
    'water_tax_due REAL NOT NULL DEFAULT 0',
    'sewerage_tax_due REAL NOT NULL DEFAULT 0',
    'solid_waste_tax_due REAL NOT NULL DEFAULT 0',
  ];

  for (const columnDefinition of requiredColumns) {
    const columnName = columnDefinition.split(' ')[0];

    if (!existingColumns.has(columnName)) {
      runStatement(
        database,
        `ALTER TABLE properties ADD COLUMN ${columnDefinition};`
      );
    }
  }
}

function backfillIntegratedTaxData(database: any) {
  const taxFields = getIntegratedTaxFields(1);

  runStatement(
    database,
    `UPDATE properties
      SET water_tax_due = ROUND(due_amount * ${taxFields.water_tax_due}, 2)
      WHERE water_tax_due IS NULL OR water_tax_due = 0;`
  );
  runStatement(
    database,
    `UPDATE properties
      SET sewerage_tax_due = ROUND(due_amount * ${taxFields.sewerage_tax_due}, 2)
      WHERE sewerage_tax_due IS NULL OR sewerage_tax_due = 0;`
  );
  runStatement(
    database,
    `UPDATE properties
      SET solid_waste_tax_due = ROUND(due_amount * ${taxFields.solid_waste_tax_due}, 2)
      WHERE solid_waste_tax_due IS NULL OR solid_waste_tax_due = 0;`
  );
}

function runStatement(database: any, sql: string, values?: SQLiteValue[]) {
  if (!values || values.length === 0) {
    database.run(sql);
    return;
  }

  const statement = database.prepare(sql);

  try {
    statement.run(values);
  } finally {
    statement.free();
  }
}

function getExecRows<T = Record<string, unknown>>(results: any[]): T[] {
  if (!results || results.length === 0) {
    return [];
  }

  return results.flatMap((result) =>
    result.values.map((row: unknown[]) =>
      Object.fromEntries(
        result.columns.map((column: string, index: number) => [column, row[index]])
      ) as T
    )
  );
}

export async function getDatabaseStatus(): Promise<{
  connected: boolean;
  message: string;
}> {
  try {
    await query('SELECT 1 as ok;');
    return {
      connected: true,
      message: 'SQLite database connected',
    };
  } catch (error) {
    return {
      connected: false,
      message: error instanceof Error ? error.message : 'SQLite unavailable',
    };
  }
}

/**
 * Execute a query and return results
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  values?: SQLiteValue[]
): Promise<T[]> {
  try {
    const database = await getDatabase();
    const statement = database.prepare(sql);

    try {
      if (values && values.length > 0) {
        statement.bind(values);
      }

      const rows: T[] = [];
      while (statement.step()) {
        rows.push(statement.getAsObject() as T);
      }

      return rows;
    } finally {
      statement.free();
    }
  } catch (error) {
    console.error('[DB] SQLite query error:', error);
    throw error;
  }
}

/**
 * Execute a single row query
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  values?: SQLiteValue[]
): Promise<T | null> {
  const results = await query<T>(sql, values);
  return results.length > 0 ? results[0] : null;
}

export async function getAllProperties(): Promise<PropertyRecord[]> {
  return query<PropertyRecord>(
    `SELECT
      property_id,
      owner_name,
      ward,
      zone,
      property_address,
      tax_amount,
      due_amount,
      water_tax_due,
      sewerage_tax_due,
      solid_waste_tax_due,
      ROUND(
        due_amount + water_tax_due + sewerage_tax_due + solid_waste_tax_due,
        2
      ) AS total_due_all_taxes,
      last_payment_date,
      payment_status
    FROM properties
    ORDER BY property_id;`
  );
}

/**
 * Get database schema info for AI context
 */
export async function getSchemaInfo(): Promise<string> {
  try {
    const columns = await query<{
      name: string;
      type: string;
      notnull: number;
      pk: number;
    }>('PRAGMA table_info(properties);');

    let schemaInfo = 'Database Schema for property_tax_db (SQLite):\n\n';
    schemaInfo += 'Table: properties\n';

    for (const column of columns) {
      schemaInfo += `  - ${column.name} (${column.type || 'TEXT'})`;
      if (column.pk) schemaInfo += ' [PRIMARY KEY]';
      if (column.notnull) schemaInfo += ' [NOT NULL]';
      schemaInfo += '\n';
    }

    schemaInfo += '\nView: ward_collection_summary\n';
    schemaInfo += '  - ward (TEXT)\n';
    schemaInfo += '  - total_properties (INTEGER)\n';
    schemaInfo += '  - total_tax (REAL)\n';
    schemaInfo += '  - total_due (REAL)\n';
    schemaInfo += '  - total_collected (REAL)\n';
    schemaInfo += '  - paid_count (INTEGER)\n';
    schemaInfo += '  - unpaid_count (INTEGER)\n';
    schemaInfo += '  - partial_count (INTEGER)\n';

    return schemaInfo;
  } catch (error) {
    console.error('[DB] Schema fetch error:', error);
    return `Database Schema for property_tax_db (SQLite):

Table: properties
  - property_id (INTEGER) [PRIMARY KEY] [NOT NULL]
  - owner_name (TEXT) [NOT NULL]
  - ward (TEXT) [NOT NULL]
  - zone (TEXT) [NOT NULL]
  - property_address (TEXT)
  - tax_amount (REAL) [NOT NULL]
  - due_amount (REAL) [NOT NULL]
  - water_tax_due (REAL) [NOT NULL]
  - sewerage_tax_due (REAL) [NOT NULL]
  - solid_waste_tax_due (REAL) [NOT NULL]
  - last_payment_date (TEXT)
  - payment_status (TEXT) [NOT NULL]`;
  }
}

/**
 * Validate and sanitize SQL query (basic protection against destructive operations)
 */
export function validateSQLQuery(sql: string): {
  valid: boolean;
  message: string;
} {
  const dangerousPhrases = [
    'DROP',
    'DELETE',
    'TRUNCATE',
    'ALTER',
    'CREATE',
    'INSERT',
    'UPDATE',
    'GRANT',
    'REVOKE',
  ];

  const upperSQL = sql.toUpperCase().trim();

  if (!upperSQL.startsWith('SELECT') && !upperSQL.startsWith('WITH')) {
    return {
      valid: false,
      message: 'Only SELECT queries are allowed.',
    };
  }

  for (const phrase of dangerousPhrases) {
    if (upperSQL.startsWith(phrase)) {
      return {
        valid: false,
        message: `Query cannot contain ${phrase} statements. Only SELECT queries are allowed.`,
      };
    }
  }

  if (upperSQL.includes('UNION') && !upperSQL.includes('FROM')) {
    return {
      valid: false,
      message: 'Suspicious query pattern detected',
    };
  }

  return {
    valid: true,
    message: 'Query validation passed',
  };
}
