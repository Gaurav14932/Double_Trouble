import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getIntegratedTaxFields } from './property-analytics';

export type PaymentStatus = 'PAID' | 'UNPAID' | 'PARTIAL';

export interface PropertyRecord {
  property_id: number;
  owner_name: string;
  ward: string;
  zone: string;
  property_address: string;
  tax_amount: number;
  due_amount: number;
  water_tax_due: number;
  sewerage_tax_due: number;
  solid_waste_tax_due: number;
  total_due_all_taxes: number;
  last_payment_date: string | null;
  payment_status: PaymentStatus;
}

const PROPERTY_COLUMNS = [
  'owner_name',
  'ward',
  'zone',
  'property_address',
  'tax_amount',
  'due_amount',
  'last_payment_date',
  'payment_status',
] as const;

let cachedProperties: PropertyRecord[] | null = null;

export async function getDemoProperties(): Promise<PropertyRecord[]> {
  if (cachedProperties) {
    return cachedProperties;
  }

  const sqlScriptPath = path.join(process.cwd(), 'scripts', 'init-database.sql');
  const sqlScript = await readFile(sqlScriptPath, 'utf8');
  cachedProperties = parsePropertiesFromSQL(sqlScript);
  return cachedProperties;
}

export function getDemoSchemaInfo(): string {
  return `Database Schema for property_tax_db:

Table: properties
  - property_id (int) [PRIMARY KEY] [NOT NULL]
  - owner_name (varchar(100)) [NOT NULL]
  - ward (varchar(50)) [NOT NULL]
  - zone (varchar(50)) [NOT NULL]
  - property_address (varchar(255))
  - tax_amount (decimal(10,2)) [NOT NULL]
  - due_amount (decimal(10,2)) [NOT NULL]
  - water_tax_due (decimal(10,2)) [NOT NULL]
  - sewerage_tax_due (decimal(10,2)) [NOT NULL]
  - solid_waste_tax_due (decimal(10,2)) [NOT NULL]
  - total_due_all_taxes (decimal(10,2)) [NOT NULL]
  - last_payment_date (date)
  - payment_status (enum('PAID','UNPAID','PARTIAL')) [NOT NULL]
  - created_at (timestamp)
  - updated_at (timestamp)`;
}

function parsePropertiesFromSQL(sqlScript: string): PropertyRecord[] {
  const valuesSection = extractValuesSection(sqlScript);
  const tuples = extractTuples(valuesSection);

  return tuples.map((tuple, index) => {
    const values = splitTupleValues(tuple);
    if (values.length !== PROPERTY_COLUMNS.length) {
      throw new Error(
        `Expected ${PROPERTY_COLUMNS.length} values per property, received ${values.length}`
      );
    }

    const parsedValues = values.map(parseSqlValue);
    const propertyTaxDue = Number(parsedValues[5]);
    const integratedTaxFields = getIntegratedTaxFields(propertyTaxDue);

    return {
      property_id: index + 1,
      owner_name: String(parsedValues[0]),
      ward: String(parsedValues[1]),
      zone: String(parsedValues[2]),
      property_address: String(parsedValues[3]),
      tax_amount: Number(parsedValues[4]),
      due_amount: propertyTaxDue,
      ...integratedTaxFields,
      last_payment_date: parsedValues[6] ? String(parsedValues[6]) : null,
      payment_status: String(parsedValues[7]) as PaymentStatus,
    };
  });
}

function extractValuesSection(sqlScript: string): string {
  const insertMarker = 'INSERT INTO properties';
  const insertStart = sqlScript.indexOf(insertMarker);
  if (insertStart === -1) {
    throw new Error('Could not find demo property insert statement');
  }

  const valuesStart = sqlScript.indexOf('VALUES', insertStart);
  if (valuesStart === -1) {
    throw new Error('Could not find VALUES clause in demo SQL script');
  }

  let inString = false;
  for (let index = valuesStart + 'VALUES'.length; index < sqlScript.length; index++) {
    const char = sqlScript[index];
    const nextChar = sqlScript[index + 1];

    if (char === "'") {
      if (inString && nextChar === "'") {
        index += 1;
        continue;
      }
      inString = !inString;
      continue;
    }

    if (char === ';' && !inString) {
      return sqlScript.slice(valuesStart + 'VALUES'.length, index).trim();
    }
  }

  throw new Error('Could not determine end of demo property insert statement');
}

function extractTuples(valuesSection: string): string[] {
  const tuples: string[] = [];
  let current = '';
  let depth = 0;
  let inString = false;

  for (let index = 0; index < valuesSection.length; index++) {
    const char = valuesSection[index];
    const nextChar = valuesSection[index + 1];

    if (char === "'") {
      if (depth > 0) {
        current += char;
      }

      if (inString && nextChar === "'") {
        if (depth > 0) {
          current += nextChar;
        }
        index += 1;
        continue;
      }

      inString = !inString;
      continue;
    }

    if (!inString && char === '(') {
      depth += 1;
      if (depth === 1) {
        current = '';
        continue;
      }
    }

    if (!inString && char === ')') {
      depth -= 1;
      if (depth === 0) {
        tuples.push(current.trim());
        current = '';
        continue;
      }
    }

    if (depth > 0) {
      current += char;
    }
  }

  return tuples;
}

function splitTupleValues(tuple: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString = false;

  for (let index = 0; index < tuple.length; index++) {
    const char = tuple[index];
    const nextChar = tuple[index + 1];

    if (char === "'") {
      current += char;

      if (inString && nextChar === "'") {
        current += nextChar;
        index += 1;
        continue;
      }

      inString = !inString;
      continue;
    }

    if (char === ',' && !inString) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    values.push(current.trim());
  }

  return values;
}

function parseSqlValue(value: string): string | number | null {
  const trimmedValue = value.trim();

  if (trimmedValue.toUpperCase() === 'NULL') {
    return null;
  }

  if (trimmedValue.startsWith("'") && trimmedValue.endsWith("'")) {
    return trimmedValue.slice(1, -1).replace(/''/g, "'");
  }

  const numericValue = Number(trimmedValue);
  if (!Number.isNaN(numericValue)) {
    return numericValue;
  }

  return trimmedValue;
}
