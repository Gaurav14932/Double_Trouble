export interface IntegratedTaxFields {
  water_tax_due: number;
  sewerage_tax_due: number;
  solid_waste_tax_due: number;
  total_due_all_taxes: number;
}

export type RiskBand = 'Low' | 'Medium' | 'High';

export interface DefaulterRiskInsight {
  risk_score: number;
  risk_band: RiskBand;
  risk_reasons: string[];
}

interface RiskInput extends IntegratedTaxFields {
  due_amount: number;
  payment_status: 'PAID' | 'UNPAID' | 'PARTIAL';
  last_payment_date: string | null;
}

const roundAmount = (value: number) => Number(value.toFixed(2));

export function getIntegratedTaxFields(propertyTaxDue: number): IntegratedTaxFields {
  const waterTaxDue = roundAmount(propertyTaxDue * 0.18);
  const sewerageTaxDue = roundAmount(propertyTaxDue * 0.12);
  const solidWasteTaxDue = roundAmount(propertyTaxDue * 0.07);

  return {
    water_tax_due: waterTaxDue,
    sewerage_tax_due: sewerageTaxDue,
    solid_waste_tax_due: solidWasteTaxDue,
    total_due_all_taxes: roundAmount(
      propertyTaxDue + waterTaxDue + sewerageTaxDue + solidWasteTaxDue
    ),
  };
}

export function calculateDefaulterRisk(input: RiskInput): DefaulterRiskInsight {
  let score = 10;
  const reasons: string[] = [];

  if (input.payment_status === 'UNPAID') {
    score += 34;
    reasons.push('Property tax remains unpaid');
  } else if (input.payment_status === 'PARTIAL') {
    score += 18;
    reasons.push('Tax payments are only partially completed');
  }

  if (input.due_amount >= 20000) {
    score += 22;
    reasons.push('Large pending property-tax balance');
  } else if (input.due_amount >= 10000) {
    score += 14;
    reasons.push('Moderate pending property-tax balance');
  } else if (input.due_amount > 0) {
    score += 8;
  }

  if (!input.last_payment_date) {
    score += 16;
    reasons.push('No recorded payment history');
  } else {
    const daysSincePayment = getDaysSince(input.last_payment_date);

    if (daysSincePayment >= 365) {
      score += 14;
      reasons.push('No payment recorded in the last year');
    } else if (daysSincePayment >= 180) {
      score += 8;
      reasons.push('Payment history is aging');
    }
  }

  const otherTaxDue =
    input.water_tax_due + input.sewerage_tax_due + input.solid_waste_tax_due;

  if (otherTaxDue >= 5000) {
    score += 16;
    reasons.push('Additional municipal taxes are also overdue');
  } else if (otherTaxDue >= 2000) {
    score += 9;
    reasons.push('Multiple municipal tax dues are accumulating');
  } else if (otherTaxDue > 0) {
    score += 4;
  }

  const riskScore = Math.min(100, Math.max(0, Math.round(score)));
  const riskBand: RiskBand =
    riskScore >= 70 ? 'High' : riskScore >= 45 ? 'Medium' : 'Low';

  if (reasons.length === 0) {
    reasons.push('Current payment behavior looks stable');
  }

  return {
    risk_score: riskScore,
    risk_band: riskBand,
    risk_reasons: reasons,
  };
}

function getDaysSince(dateValue: string): number {
  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return 0;
  }

  const diffInMs = Date.now() - parsedDate.getTime();
  return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
}
