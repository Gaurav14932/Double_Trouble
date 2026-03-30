import { ChatResponseData } from './chat-types';
import { getDemoProperties, PropertyRecord } from './demo-data';

interface DemoQueryResponse {
  reply: string;
  data?: ChatResponseData;
}

export function getConversationalReply(userQuery: string): string | null {
  const normalizedQuery = normalize(userQuery);

  if (/^(hi|hii|hello|hey|good morning|good afternoon|good evening)\b/.test(normalizedQuery)) {
    return 'Hello! I can help with property-tax questions like "Show top 10 defaulters in Ward 5", "Total pending tax in Zone A", or "Generate ward-wise collection report".';
  }

  if (/^(thanks|thank you|ok|okay|cool|great)\b/.test(normalizedQuery)) {
    return 'You can keep going with another property-tax question whenever you are ready.';
  }

  return null;
}

export async function runDemoQuery(userQuery: string): Promise<DemoQueryResponse> {
  const conversationalReply = getConversationalReply(userQuery);
  if (conversationalReply) {
    return { reply: conversationalReply };
  }

  const properties = await getDemoProperties();
  const ward = extractWard(userQuery);
  const zone = extractZone(userQuery);
  const propertyId = extractPropertyId(userQuery);
  const ownerName = extractOwnerName(userQuery);
  const normalizedQuery = normalize(userQuery);

  if (isTopDefaultersQuery(normalizedQuery)) {
    const limit = extractTopLimit(userQuery) ?? 10;
    const filtered = applyScope(
      properties.filter(
        (property) =>
          property.payment_status === 'UNPAID' && property.due_amount > 0
      ),
      ward,
      zone
    )
      .sort((left, right) => right.due_amount - left.due_amount)
      .slice(0, limit)
      .map(selectPropertySummary);

    const scopeLabel = formatScopeLabel(ward, zone, 'all areas');
    return createDataResponse({
      reply: `Showing the top ${filtered.length} defaulters in ${scopeLabel} from the bundled demo dataset.`,
      results: filtered,
      intent: `Top ${limit} defaulters`,
      explanation: `These are the properties with the highest unpaid balances in ${scopeLabel}. Demo data is being used because the live database is not available.`,
      queryType: 'table',
      query: buildTopDefaultersQuery(limit, ward, zone),
    });
  }

  if (propertyId !== null && normalizedQuery.includes('payment status')) {
    const property = properties.find((item) => item.property_id === propertyId);

    if (!property) {
      return {
        reply: `I could not find property ID ${propertyId} in the bundled demo dataset. Try a demo ID between 1 and ${properties.length}.`,
      };
    }

    return createDataResponse({
      reply: `Found the payment status for property ID ${propertyId} in the bundled demo dataset.`,
      results: [selectPropertyDetail(property)],
      intent: `Payment status for property ID ${propertyId}`,
      explanation: `Property ID ${propertyId} is currently marked as ${property.payment_status.toLowerCase()} with a due amount of ${property.due_amount.toFixed(2)}. Demo data is being used because the live database is not available.`,
      queryType: 'table',
      query: `SELECT property_id, owner_name, ward, zone, tax_amount, due_amount, last_payment_date, payment_status FROM properties WHERE property_id = ${propertyId};`,
    });
  }

  if (
    normalizedQuery.includes('ward-wise collection report') ||
    normalizedQuery.includes('ward wise collection report')
  ) {
    const results = buildCollectionReport(properties, 'ward');
    return createDataResponse({
      reply: 'Generated a ward-wise collection report from the bundled demo dataset.',
      results,
      intent: 'Ward-wise collection report',
      explanation: 'This report summarizes total properties, billed amount, due amount, collected amount, and payment-status counts for each ward. Demo data is being used because the live database is not available.',
      queryType: 'comparison',
      query: "SELECT ward, COUNT(*) AS total_properties, SUM(tax_amount) AS total_tax, SUM(due_amount) AS total_due, SUM(tax_amount - due_amount) AS total_collected, SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) AS paid_count, SUM(CASE WHEN payment_status = 'UNPAID' THEN 1 ELSE 0 END) AS unpaid_count, SUM(CASE WHEN payment_status = 'PARTIAL' THEN 1 ELSE 0 END) AS partial_count FROM properties GROUP BY ward ORDER BY ward;",
    });
  }

  if (
    normalizedQuery.includes('zone-wise collection report') ||
    normalizedQuery.includes('zone wise collection report')
  ) {
    const results = buildCollectionReport(properties, 'zone');
    return createDataResponse({
      reply: 'Generated a zone-wise collection report from the bundled demo dataset.',
      results,
      intent: 'Zone-wise collection report',
      explanation: 'This report summarizes total properties, billed amount, due amount, collected amount, and payment-status counts for each zone. Demo data is being used because the live database is not available.',
      queryType: 'comparison',
      query: "SELECT zone, COUNT(*) AS total_properties, SUM(tax_amount) AS total_tax, SUM(due_amount) AS total_due, SUM(tax_amount - due_amount) AS total_collected, SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) AS paid_count, SUM(CASE WHEN payment_status = 'UNPAID' THEN 1 ELSE 0 END) AS unpaid_count, SUM(CASE WHEN payment_status = 'PARTIAL' THEN 1 ELSE 0 END) AS partial_count FROM properties GROUP BY zone ORDER BY zone;",
    });
  }

  if (isPendingTaxByGroupQuery(normalizedQuery, 'ward')) {
    const results = buildPendingTaxSummary(properties, 'ward');
    return createDataResponse({
      reply: 'Summarized pending tax by ward from the bundled demo dataset.',
      results,
      intent: 'Pending tax by ward',
      explanation: 'This view compares the total due amount and the number of unpaid properties for each ward. Demo data is being used because the live database is not available.',
      queryType: 'comparison',
      query: "SELECT ward, SUM(due_amount) AS total_due, SUM(CASE WHEN due_amount > 0 THEN 1 ELSE 0 END) AS unpaid_properties FROM properties GROUP BY ward ORDER BY total_due DESC;",
    });
  }

  if (isPendingTaxByGroupQuery(normalizedQuery, 'zone')) {
    const results = buildPendingTaxSummary(properties, 'zone');
    return createDataResponse({
      reply: 'Summarized pending tax by zone from the bundled demo dataset.',
      results,
      intent: 'Pending tax by zone',
      explanation: 'This view compares the total due amount and the number of unpaid properties for each zone. Demo data is being used because the live database is not available.',
      queryType: 'comparison',
      query: "SELECT zone, SUM(due_amount) AS total_due, SUM(CASE WHEN due_amount > 0 THEN 1 ELSE 0 END) AS unpaid_properties FROM properties GROUP BY zone ORDER BY total_due DESC;",
    });
  }

  if (normalizedQuery.includes('pending tax') || normalizedQuery.includes('total due')) {
    const filtered = applyScope(properties, ward, zone);
    const scopeLabel = formatScopeLabel(ward, zone, 'all areas');
    const totalDue = sum(filtered.map((property) => property.due_amount));
    const unpaidProperties = filtered.filter((property) => property.due_amount > 0).length;

    return createDataResponse({
      reply: `Calculated pending tax for ${scopeLabel} from the bundled demo dataset.`,
      results: [
        {
          scope: scopeLabel,
          total_due: roundCurrency(totalDue),
          unpaid_properties: unpaidProperties,
          total_properties: filtered.length,
        },
      ],
      intent: `Pending tax for ${scopeLabel}`,
      explanation: `The total pending tax in ${scopeLabel} is ${roundCurrency(totalDue).toFixed(2)} across ${unpaidProperties} properties with outstanding balances. Demo data is being used because the live database is not available.`,
      queryType: 'aggregate',
      query: buildPendingTaxQuery(ward, zone),
    });
  }

  if (
    normalizedQuery.includes('how many unpaid properties') ||
    normalizedQuery.includes('count unpaid properties')
  ) {
    const filtered = applyScope(
      properties.filter(
        (property) =>
          property.payment_status === 'UNPAID' && property.due_amount > 0
      ),
      ward,
      zone
    );
    const scopeLabel = formatScopeLabel(ward, zone, 'all areas');

    return createDataResponse({
      reply: `Counted unpaid properties in ${scopeLabel} from the bundled demo dataset.`,
      results: [
        {
          scope: scopeLabel,
          unpaid_properties: filtered.length,
          total_due: roundCurrency(sum(filtered.map((property) => property.due_amount))),
        },
      ],
      intent: `Unpaid properties in ${scopeLabel}`,
      explanation: `There are ${filtered.length} unpaid properties in ${scopeLabel}. Demo data is being used because the live database is not available.`,
      queryType: 'aggregate',
      query: buildUnpaidCountQuery(ward, zone),
    });
  }

  if (
    normalizedQuery.includes('list all unpaid properties') ||
    normalizedQuery.includes('show unpaid properties')
  ) {
    const filtered = applyScope(
      properties.filter(
        (property) =>
          property.payment_status === 'UNPAID' && property.due_amount > 0
      ),
      ward,
      zone
    )
      .sort((left, right) => right.due_amount - left.due_amount)
      .map(selectPropertySummary);
    const scopeLabel = formatScopeLabel(ward, zone, 'all areas');

    return createDataResponse({
      reply: `Listed unpaid properties in ${scopeLabel} from the bundled demo dataset.`,
      results: filtered,
      intent: `Unpaid properties in ${scopeLabel}`,
      explanation: `These properties currently have unpaid balances in ${scopeLabel}. Demo data is being used because the live database is not available.`,
      queryType: 'table',
      query: buildUnpaidListQuery(ward, zone),
    });
  }

  if (normalizedQuery.includes('never paid')) {
    const filtered = properties
      .filter((property) => property.last_payment_date === null)
      .sort((left, right) => right.due_amount - left.due_amount)
      .map(selectPropertySummary);

    return createDataResponse({
      reply: 'Listed properties with no recorded payment date from the bundled demo dataset.',
      results: filtered,
      intent: 'Properties with no payment history',
      explanation: 'These properties do not have a recorded last payment date in the bundled demo dataset.',
      queryType: 'table',
      query: 'SELECT property_id, owner_name, ward, zone, tax_amount, due_amount, payment_status FROM properties WHERE last_payment_date IS NULL ORDER BY due_amount DESC;',
    });
  }

  if (ownerName) {
    const filtered = properties
      .filter((property) =>
        property.owner_name.toLowerCase().includes(ownerName.toLowerCase())
      )
      .map(selectPropertyDetail);

    if (filtered.length === 0) {
      return {
        reply: `I could not find any properties for ${ownerName} in the bundled demo dataset.`,
      };
    }

    return createDataResponse({
      reply: `Found ${filtered.length} matching property record(s) for ${ownerName} in the bundled demo dataset.`,
      results: filtered,
      intent: `Properties owned by ${ownerName}`,
      explanation: `Showing matching properties for ${ownerName}. Demo data is being used because the live database is not available.`,
      queryType: 'table',
      query: `SELECT property_id, owner_name, ward, zone, property_address, tax_amount, due_amount, payment_status FROM properties WHERE owner_name LIKE '%${escapeSqlLikeValue(ownerName)}%' ORDER BY owner_name;`,
    });
  }

  if (normalizedQuery.includes('partially paid')) {
    const filtered = properties.filter(
      (property) => property.payment_status === 'PARTIAL'
    );

    return createDataResponse({
      reply: 'Counted partially paid properties from the bundled demo dataset.',
      results: [
        {
          partially_paid_properties: filtered.length,
          total_due: roundCurrency(sum(filtered.map((property) => property.due_amount))),
        },
      ],
      intent: 'Partially paid properties',
      explanation: `There are ${filtered.length} partially paid properties in the bundled demo dataset.`,
      queryType: 'aggregate',
      query: "SELECT COUNT(*) AS partially_paid_properties, SUM(due_amount) AS total_due FROM properties WHERE payment_status = 'PARTIAL';",
    });
  }

  return {
    reply:
      'I can answer property-tax questions in demo mode such as "Show top 10 defaulters in Ward 5", "Total pending tax in Zone A", "How many unpaid properties in Ward 2?", or "Generate ward-wise collection report".',
  };
}

function createDataResponse(
  input: Omit<ChatResponseData, 'resultCount' | 'source'> & { reply: string }
): DemoQueryResponse {
  return {
    reply: input.reply,
    data: {
      results: input.results,
      intent: input.intent,
      explanation: input.explanation,
      queryType: input.queryType,
      resultCount: input.results.length,
      query: input.query,
      source: 'demo',
    },
  };
}

function buildCollectionReport(
  properties: PropertyRecord[],
  groupBy: 'ward' | 'zone'
): Record<string, unknown>[] {
  const grouped = new Map<string, PropertyRecord[]>();

  for (const property of properties) {
    const key = property[groupBy];
    const bucket = grouped.get(key) ?? [];
    bucket.push(property);
    grouped.set(key, bucket);
  }

  return [...grouped.entries()]
    .map(([key, bucket]) => ({
      [groupBy]: key,
      total_properties: bucket.length,
      total_tax: roundCurrency(sum(bucket.map((property) => property.tax_amount))),
      total_due: roundCurrency(sum(bucket.map((property) => property.due_amount))),
      total_collected: roundCurrency(
        sum(bucket.map((property) => property.tax_amount - property.due_amount))
      ),
      paid_count: bucket.filter((property) => property.payment_status === 'PAID').length,
      unpaid_count: bucket.filter((property) => property.payment_status === 'UNPAID').length,
      partial_count: bucket.filter((property) => property.payment_status === 'PARTIAL').length,
    }))
    .sort((left, right) =>
      String(left[groupBy]).localeCompare(String(right[groupBy]), undefined, {
        numeric: true,
      })
    );
}

function buildPendingTaxSummary(
  properties: PropertyRecord[],
  groupBy: 'ward' | 'zone'
): Record<string, unknown>[] {
  const grouped = new Map<string, PropertyRecord[]>();

  for (const property of properties) {
    const key = property[groupBy];
    const bucket = grouped.get(key) ?? [];
    bucket.push(property);
    grouped.set(key, bucket);
  }

  return [...grouped.entries()]
    .map(([key, bucket]) => ({
      [groupBy]: key,
      total_due: roundCurrency(sum(bucket.map((property) => property.due_amount))),
      unpaid_properties: bucket.filter((property) => property.due_amount > 0).length,
    }))
    .sort((left, right) => Number(right.total_due) - Number(left.total_due));
}

function selectPropertySummary(property: PropertyRecord): Record<string, unknown> {
  return {
    property_id: property.property_id,
    owner_name: property.owner_name,
    ward: property.ward,
    zone: property.zone,
    property_address: property.property_address,
    tax_amount: roundCurrency(property.tax_amount),
    due_amount: roundCurrency(property.due_amount),
    payment_status: property.payment_status,
  };
}

function selectPropertyDetail(property: PropertyRecord): Record<string, unknown> {
  return {
    ...selectPropertySummary(property),
    last_payment_date: property.last_payment_date ?? 'No payment recorded',
  };
}

function isTopDefaultersQuery(normalizedQuery: string): boolean {
  return normalizedQuery.includes('defaulter');
}

function isPendingTaxByGroupQuery(
  normalizedQuery: string,
  groupBy: 'ward' | 'zone'
): boolean {
  return (
    normalizedQuery.includes('pending tax') &&
    (normalizedQuery.includes(`by ${groupBy}`) ||
      normalizedQuery.includes(`${groupBy}-wise`) ||
      normalizedQuery.includes(`${groupBy} wise`))
  );
}

function extractTopLimit(userQuery: string): number | null {
  const match = userQuery.match(/\btop\s+(\d+)\b/i);
  return match ? Number(match[1]) : null;
}

function extractWard(userQuery: string): string | null {
  const match = userQuery.match(/\bward\s*(\d+)\b/i);
  return match ? `Ward ${match[1]}` : null;
}

function extractZone(userQuery: string): string | null {
  const match = userQuery.match(/\bzone\s*([a-z])\b/i);
  return match ? `Zone ${match[1].toUpperCase()}` : null;
}

function extractPropertyId(userQuery: string): number | null {
  const match = userQuery.match(/\bproperty(?:\s+id)?\s*(\d+)\b/i);
  return match ? Number(match[1]) : null;
}

function extractOwnerName(userQuery: string): string | null {
  const match = userQuery.match(/\bowned by\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function applyScope(
  properties: PropertyRecord[],
  ward: string | null,
  zone: string | null
): PropertyRecord[] {
  return properties.filter((property) => {
    if (ward && property.ward !== ward) {
      return false;
    }

    if (zone && property.zone !== zone) {
      return false;
    }

    return true;
  });
}

function buildTopDefaultersQuery(
  limit: number,
  ward: string | null,
  zone: string | null
): string {
  return `SELECT property_id, owner_name, ward, zone, property_address, tax_amount, due_amount, payment_status FROM properties WHERE payment_status = 'UNPAID' AND due_amount > 0${buildScopeSql(ward, zone)} ORDER BY due_amount DESC LIMIT ${limit};`;
}

function buildPendingTaxQuery(ward: string | null, zone: string | null): string {
  return `SELECT SUM(due_amount) AS total_due, SUM(CASE WHEN due_amount > 0 THEN 1 ELSE 0 END) AS unpaid_properties, COUNT(*) AS total_properties FROM properties WHERE 1 = 1${buildScopeSql(ward, zone)};`;
}

function buildUnpaidCountQuery(ward: string | null, zone: string | null): string {
  return `SELECT COUNT(*) AS unpaid_properties, SUM(due_amount) AS total_due FROM properties WHERE payment_status = 'UNPAID' AND due_amount > 0${buildScopeSql(ward, zone)};`;
}

function buildUnpaidListQuery(ward: string | null, zone: string | null): string {
  return `SELECT property_id, owner_name, ward, zone, property_address, tax_amount, due_amount, payment_status FROM properties WHERE payment_status = 'UNPAID' AND due_amount > 0${buildScopeSql(ward, zone)} ORDER BY due_amount DESC;`;
}

function buildScopeSql(ward: string | null, zone: string | null): string {
  let sql = '';

  if (ward) {
    sql += ` AND ward = '${ward}'`;
  }

  if (zone) {
    sql += ` AND zone = '${zone}'`;
  }

  return sql;
}

function formatScopeLabel(
  ward: string | null,
  zone: string | null,
  fallback: string
): string {
  if (ward && zone) {
    return `${ward}, ${zone}`;
  }

  if (ward) {
    return ward;
  }

  if (zone) {
    return zone;
  }

  return fallback;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function sum(values: number[]): number {
  return values.reduce((total, current) => total + current, 0);
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function escapeSqlLikeValue(value: string): string {
  return value.replace(/'/g, "''");
}
