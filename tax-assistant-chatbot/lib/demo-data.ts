import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getIntegratedTaxFields } from './property-analytics';

export type PaymentStatus = 'PAID' | 'UNPAID' | 'PARTIAL';

export interface PropertyRecord {
  property_id: number;
  owner_name: string;
  ward: string;
  zone: string;
  collection_officer: string;
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

const DATASET_MULTIPLIER = 4;
const SYNTHETIC_FIRST_NAMES = [
  'Aarav',
  'Ishita',
  'Kabir',
  'Megha',
  'Rudra',
  'Tanvi',
  'Dev',
  'Aditi',
  'Kunal',
  'Rhea',
  'Yuvraj',
  'Nandini',
];
const SYNTHETIC_LAST_NAMES = [
  'Joshi',
  'Kulkarni',
  'Bhosale',
  'Chavan',
  'Pawar',
  'Jadhav',
  'Shinde',
  'More',
  'Deshmukh',
  'Kale',
  'Patankar',
  'Sawant',
];
const STREET_NAMES = [
  'Lake View Road',
  'Station Lane',
  'Market Street',
  'Riverfront Avenue',
  'Temple Road',
  'Garden Lane',
  'College Street',
  'Shivaji Nagar Road',
  'Tilak Path',
  'Civil Lines Avenue',
];
const LOCALITIES = [
  'Green Residency',
  'Sunrise Heights',
  'Lakeview Enclave',
  'Civic Square',
  'Metro Residency',
  'Palm Court',
  'River Park',
  'Silver Nest',
  'Heritage Homes',
  'Central Residency',
];
const COLLECTION_OFFICERS = [
  'Officer Anita Patil',
  'Officer Rahul More',
  'Officer Sneha Kulkarni',
  'Officer Vijay Shinde',
  'Officer Pooja Jadhav',
  'Officer Sameer Pawar',
];

let cachedProperties: PropertyRecord[] | null = null;

export async function getDemoProperties(): Promise<PropertyRecord[]> {
  if (cachedProperties) {
    return cachedProperties;
  }

  const sqlScriptPath = path.join(process.cwd(), 'scripts', 'init-database.sql');
  const sqlScript = await readFile(sqlScriptPath, 'utf8');
  cachedProperties = buildExpandedDataset(parsePropertiesFromSQL(sqlScript));
  return cachedProperties;
}

export function getDemoSchemaInfo(): string {
  return `Database Schema for property_tax_db:

Table: properties
  - property_id (int) [PRIMARY KEY] [NOT NULL]
  - owner_name (varchar(100)) [NOT NULL]
  - ward (varchar(50)) [NOT NULL]
  - zone (varchar(50)) [NOT NULL]
  - collection_officer (varchar(100)) [NOT NULL]
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
      collection_officer: buildCollectionOfficer(
        String(parsedValues[1]),
        String(parsedValues[2]),
        index + 1
      ),
      property_address: String(parsedValues[3]),
      tax_amount: Number(parsedValues[4]),
      due_amount: propertyTaxDue,
      ...integratedTaxFields,
      last_payment_date: parsedValues[6] ? String(parsedValues[6]) : null,
      payment_status: String(parsedValues[7]) as PaymentStatus,
    };
  });
}

function buildExpandedDataset(baseProperties: PropertyRecord[]): PropertyRecord[] {
  if (baseProperties.length === 0) {
    return [];
  }

  const expanded = [...baseProperties];

  for (let cycle = 1; cycle < DATASET_MULTIPLIER; cycle += 1) {
    for (let index = 0; index < baseProperties.length; index += 1) {
      const baseProperty = baseProperties[index];
      const propertyId = baseProperties.length * cycle + index + 1;
      expanded.push(createSyntheticVariant(baseProperty, propertyId, cycle, index));
    }
  }

  return expanded;
}

function createSyntheticVariant(
  baseProperty: PropertyRecord,
  propertyId: number,
  cycle: number,
  index: number
): PropertyRecord {
  const ward = buildSyntheticWard(baseProperty.ward, cycle, index);
  const zone = buildSyntheticZone(baseProperty.zone, cycle, index);
  const taxAmount = roundAmount(
    Math.max(
      9000,
      baseProperty.tax_amount * (0.92 + ((index + cycle * 2) % 9) * 0.06) +
        cycle * 450 +
        (index % 4) * 175
    )
  );
  const paymentStatus = getSyntheticPaymentStatus(propertyId, cycle, index);
  const dueAmount = getSyntheticDueAmount(taxAmount, paymentStatus, propertyId, cycle);
  const integratedTaxFields = getIntegratedTaxFields(dueAmount);

  return {
    property_id: propertyId,
    owner_name: buildSyntheticOwnerName(propertyId),
    ward,
    zone,
    collection_officer: buildCollectionOfficer(ward, zone, propertyId),
    property_address: buildSyntheticAddress(propertyId, cycle, index),
    tax_amount: taxAmount,
    due_amount: dueAmount,
    ...integratedTaxFields,
    last_payment_date: buildSyntheticPaymentDate(paymentStatus, propertyId, cycle, index),
    payment_status: paymentStatus,
  };
}

function buildSyntheticOwnerName(propertyId: number): string {
  const firstName =
    SYNTHETIC_FIRST_NAMES[propertyId % SYNTHETIC_FIRST_NAMES.length];
  const lastName =
    SYNTHETIC_LAST_NAMES[(propertyId * 3) % SYNTHETIC_LAST_NAMES.length];

  return `${firstName} ${lastName}`;
}

function buildSyntheticWard(baseWard: string, cycle: number, index: number): string {
  const wardMatch = baseWard.match(/(\d+)/);
  const baseWardNumber = wardMatch ? Number(wardMatch[1]) : 1;
  const nextWardNumber = ((baseWardNumber - 1 + cycle + (index % 2)) % 5) + 1;

  return `Ward ${nextWardNumber}`;
}

function buildSyntheticZone(baseZone: string, cycle: number, index: number): string {
  const zoneSequence = ['A', 'B', 'C'];
  const baseLetterMatch = baseZone.match(/Zone\s+([A-Z])/i);
  const baseIndex = baseLetterMatch
    ? zoneSequence.indexOf(baseLetterMatch[1].toUpperCase())
    : 0;
  const nextZoneIndex =
    (Math.max(baseIndex, 0) + cycle + (index % zoneSequence.length)) %
    zoneSequence.length;

  return `Zone ${zoneSequence[nextZoneIndex]}`;
}

function buildSyntheticAddress(propertyId: number, cycle: number, index: number): string {
  const buildingNumber = 100 + propertyId;
  const streetName = STREET_NAMES[(propertyId + cycle) % STREET_NAMES.length];
  const locality = LOCALITIES[(propertyId + index) % LOCALITIES.length];
  const flatNumber = 100 + ((propertyId * 7 + cycle * 13) % 900);

  return `${buildingNumber} ${streetName}, ${locality}, Flat ${flatNumber}`;
}

function buildCollectionOfficer(
  ward: string,
  zone: string,
  propertyId: number
): string {
  const wardNumber = Number(ward.match(/(\d+)/)?.[1] ?? 1);
  const zoneLetter = zone.match(/Zone\s+([A-Z])/i)?.[1]?.toUpperCase() ?? 'A';
  const zoneOffset = ['A', 'B', 'C'].indexOf(zoneLetter);
  const officerIndex =
    (Math.max(zoneOffset, 0) + wardNumber + propertyId) % COLLECTION_OFFICERS.length;

  return COLLECTION_OFFICERS[officerIndex];
}

function getSyntheticPaymentStatus(
  propertyId: number,
  cycle: number,
  index: number
): PaymentStatus {
  const selector = (propertyId + cycle + index) % 10;

  if (selector <= 2) {
    return 'PAID';
  }

  if (selector <= 5) {
    return 'PARTIAL';
  }

  return 'UNPAID';
}

function getSyntheticDueAmount(
  taxAmount: number,
  paymentStatus: PaymentStatus,
  propertyId: number,
  cycle: number
): number {
  if (paymentStatus === 'PAID') {
    return 0;
  }

  if (paymentStatus === 'PARTIAL') {
    const partialRatio = 0.18 + ((propertyId + cycle) % 5) * 0.11;
    return roundAmount(taxAmount * Math.min(partialRatio, 0.72));
  }

  const unpaidRatio = 0.58 + ((propertyId + cycle) % 4) * 0.1;
  return roundAmount(taxAmount * Math.min(unpaidRatio, 1));
}

function buildSyntheticPaymentDate(
  paymentStatus: PaymentStatus,
  propertyId: number,
  cycle: number,
  index: number
): string | null {
  if (paymentStatus === 'UNPAID' && (propertyId + index) % 3 === 0) {
    return null;
  }

  const year =
    paymentStatus === 'PAID'
      ? 2025 - (cycle % 2)
      : paymentStatus === 'PARTIAL'
        ? 2024 - (cycle % 2)
        : 2023 + (cycle % 2);
  const month = ((propertyId + cycle * 3) % 12) + 1;
  const day = ((propertyId + index * 2) % 27) + 1;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function roundAmount(value: number): number {
  return Number(value.toFixed(2));
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
