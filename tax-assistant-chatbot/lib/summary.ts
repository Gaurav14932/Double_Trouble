import { getAllProperties, getDatabaseStatus } from './db';
import { getDemoProperties, type PropertyRecord } from './demo-data';

export interface SummaryDefaulter {
  name: string;
  amount: number;
}

export interface PropertyTaxSummary {
  paid: number;
  unpaid: number;
  defaulters: SummaryDefaulter[];
  source: 'database' | 'demo';
}

export async function getPropertyTaxSummary(): Promise<PropertyTaxSummary> {
  const databaseStatus = await getDatabaseStatus();
  const source = databaseStatus.connected ? 'database' : 'demo';
  const properties =
    source === 'database' ? await getAllProperties() : await getDemoProperties();

  return buildPropertyTaxSummary(properties, source);
}

function buildPropertyTaxSummary(
  properties: PropertyRecord[],
  source: 'database' | 'demo'
): PropertyTaxSummary {
  const paid = properties.filter(
    (property) => property.payment_status === 'PAID'
  ).length;

  // For the paid vs unpaid chart, treat every non-PAID record as outstanding.
  const unpaid = properties.length - paid;

  const defaulters = properties
    .filter((property) => property.total_due_all_taxes > 0)
    .sort((left, right) => right.total_due_all_taxes - left.total_due_all_taxes)
    .slice(0, 5)
    .map((property) => ({
      name: property.owner_name,
      amount: Number(property.total_due_all_taxes.toFixed(2)),
    }));

  return {
    paid,
    unpaid,
    defaulters,
    source,
  };
}
