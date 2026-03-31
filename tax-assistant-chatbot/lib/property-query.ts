import { ChatResponseData, DashboardData, DataSource } from './chat-types';
import { PropertyRecord } from './demo-data';
import { AppLanguage } from './language';
import { calculateDefaulterRisk } from './property-analytics';

interface StructuredQueryResponse {
  reply: string;
  data?: ChatResponseData;
}

interface StructuredQueryOptions {
  properties: PropertyRecord[];
  source: DataSource;
  language: AppLanguage;
}

export function getConversationalReply(
  userQuery: string,
  language: AppLanguage
): string | null {
  const normalizedQuery = normalize(userQuery);

  if (/^(hi|hii|hello|hey|good morning|good afternoon|good evening)\b/.test(normalizedQuery)) {
    return byLanguage(language, {
      en: 'Hello! You can ask about payment status, integrated taxes, predictive defaulters, collection efficiency, stale accounts, recovery priorities, or analytics charts.',
      hi: 'नमस्ते! आप भुगतान स्थिति, एकीकृत कर, संभावित बकायेदार या विश्लेषण चार्ट के बारे में पूछ सकते हैं।',
      mr: 'नमस्कार! तुम्ही पेमेंट स्थिती, एकत्रित कर, अंदाजाधारित थकबाकीदार किंवा विश्लेषण चार्टबद्दल विचारू शकता.',
    });
  }

  if (/^(thanks|thank you|ok|okay|cool|great)\b/.test(normalizedQuery)) {
    return byLanguage(language, {
      en: 'You can keep going with another property-tax question whenever you are ready.',
      hi: 'जब भी आप तैयार हों, आप अगला प्रॉपर्टी टैक्स प्रश्न पूछ सकते हैं।',
      mr: 'तुम्ही तयार झाल्यावर पुढचा मालमत्ता कर प्रश्न विचारू शकता.',
    });
  }

  return null;
}

export function runStructuredPropertyQuery(
  userQuery: string,
  options: StructuredQueryOptions
): StructuredQueryResponse | null {
  const normalizedQuery = normalize(userQuery);
  const ward = extractWard(userQuery);
  const zone = extractZone(userQuery);
  const propertyId = extractPropertyId(userQuery);
  const properties = applyScope(options.properties, ward, zone);
  const scopeLabel = formatScopeLabel(
    ward,
    zone,
    byLanguage(options.language, {
      en: 'all areas',
      hi: 'सभी क्षेत्रों',
      mr: 'सर्व क्षेत्र',
    }),
    options.language
  );
  const sourceLabel = getSourceLabel(options.source, options.language);
  const mapProperties = getMapSourceProperties(options.properties, ward, zone);

  if (propertyId !== null && normalizedQuery.includes('payment status')) {
    const property = options.properties.find((item) => item.property_id === propertyId);

    if (!property) {
      return {
        reply: byLanguage(options.language, {
          en: `I could not find property ID ${propertyId} in ${sourceLabel}.`,
          hi: `मुझे ${sourceLabel} में प्रॉपर्टी ID ${propertyId} नहीं मिली।`,
          mr: `मला ${sourceLabel} मध्ये प्रॉपर्टी ID ${propertyId} सापडली नाही.`,
        }),
      };
    }

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en: `Payment status for property ID ${propertyId} is ready from ${sourceLabel}.`,
        hi: `प्रॉपर्टी ID ${propertyId} की भुगतान स्थिति ${sourceLabel} से तैयार है।`,
        mr: `प्रॉपर्टी ID ${propertyId} ची पेमेंट स्थिती ${sourceLabel} मधून तयार आहे.`,
      }),
      intent: byLanguage(options.language, {
        en: `Payment status for property ID ${propertyId}`,
        hi: `प्रॉपर्टी ID ${propertyId} की भुगतान स्थिति`,
        mr: `प्रॉपर्टी ID ${propertyId} ची पेमेंट स्थिती`,
      }),
      explanation: byLanguage(options.language, {
        en: `This view shows property-tax dues plus connected municipal taxes for property ID ${propertyId}.`,
        hi: `यह दृश्य प्रॉपर्टी ID ${propertyId} के लिए प्रॉपर्टी टैक्स देय राशि और जुड़े नगर कर दिखाता है।`,
        mr: `हे दृश्य प्रॉपर्टी ID ${propertyId} साठी मालमत्ता कर थकबाकी आणि जोडलेले नगरपालिका कर दाखवते.`,
      }),
      queryType: 'table',
      query: `SELECT property_id, owner_name, ward, zone, due_amount, water_tax_due, sewerage_tax_due, solid_waste_tax_due, payment_status FROM properties WHERE property_id = ${propertyId};`,
      results: [
        {
          property_id: property.property_id,
          owner_name: property.owner_name,
          ward: property.ward,
          zone: property.zone,
          due_amount: property.due_amount,
          water_tax_due: property.water_tax_due,
          sewerage_tax_due: property.sewerage_tax_due,
          solid_waste_tax_due: property.solid_waste_tax_due,
          total_due_all_taxes: property.total_due_all_taxes,
          payment_status: localizePaymentStatus(property.payment_status, options.language),
          last_payment_date: property.last_payment_date ?? '-',
        },
      ],
    });
  }

  if (isTopDefaultersQuery(normalizedQuery)) {
    const limit = extractTopLimit(userQuery) ?? 10;
    const defaulters = properties
      .filter(
        (property) =>
          property.payment_status === 'UNPAID' && property.total_due_all_taxes > 0
      )
      .sort((left, right) => right.total_due_all_taxes - left.total_due_all_taxes)
      .slice(0, limit)
      .map((property) => {
        const risk = calculateDefaulterRisk(property);

        return {
          property_id: property.property_id,
          owner_name: property.owner_name,
          ward: property.ward,
          zone: property.zone,
          property_address: property.property_address,
          due_amount: round(property.due_amount),
          total_due_all_taxes: round(property.total_due_all_taxes),
          risk_score: risk.risk_score,
          risk_band: localizeRiskBand(risk.risk_band, options.language),
          payment_status: localizePaymentStatus(property.payment_status, options.language),
        };
      });

    if (defaulters.length === 0) {
      return {
        reply: byLanguage(options.language, {
          en: `I could not find unpaid defaulters in ${scopeLabel}.`,
          hi: `${scopeLabel} में कोई बकायेदार नहीं मिला।`,
          mr: `${scopeLabel} मध्ये थकबाकीदार सापडले नाहीत.`,
        }),
      };
    }

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en: `Top ${defaulters.length} defaulters for ${scopeLabel} are ready from ${sourceLabel}.`,
        hi: `${scopeLabel} के शीर्ष ${defaulters.length} बकायेदार ${sourceLabel} से तैयार हैं।`,
        mr: `${scopeLabel} साठी शीर्ष ${defaulters.length} थकबाकीदार ${sourceLabel} मधून तयार आहेत.`,
      }),
      intent: byLanguage(options.language, {
        en: `Top ${limit} defaulters in ${scopeLabel}`,
        hi: `${scopeLabel} में शीर्ष ${limit} बकायेदार`,
        mr: `${scopeLabel} मधील शीर्ष ${limit} थकबाकीदार`,
      }),
      explanation: byLanguage(options.language, {
        en: 'These records rank unpaid properties by total dues across property tax and connected municipal taxes.',
        hi: 'यह सूची अवैतनिक संपत्तियों को प्रॉपर्टी टैक्स और जुड़े हुए नगर करों की कुल बकाया राशि के आधार पर क्रम देती है।',
        mr: 'ही यादी न भरलेल्या मालमत्ता खात्यांना मालमत्ता कर आणि संबंधित नगरपालिका करांच्या एकूण थकबाकीप्रमाणे क्रम देते.',
      }),
      queryType: 'table',
      query: `SELECT property_id, owner_name, ward, zone, property_address, due_amount, water_tax_due, sewerage_tax_due, solid_waste_tax_due, ROUND(due_amount + water_tax_due + sewerage_tax_due + solid_waste_tax_due, 2) AS total_due_all_taxes FROM properties WHERE payment_status = 'UNPAID' AND (due_amount + water_tax_due + sewerage_tax_due + solid_waste_tax_due) > 0${buildScopeSql(
        ward,
        zone
      )} ORDER BY total_due_all_taxes DESC LIMIT ${limit};`,
      results: defaulters,
    });
  }

  if (isCollectionReportQuery(normalizedQuery, 'ward')) {
    const results = buildCollectionReport(properties, 'ward');

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en: `Ward-wise collection report is ready for ${scopeLabel} from ${sourceLabel}.`,
        hi: `${scopeLabel} के लिए वार्ड-वार कलेक्शन रिपोर्ट ${sourceLabel} से तैयार है।`,
        mr: `${scopeLabel} साठी वॉर्डनिहाय संकलन अहवाल ${sourceLabel} मधून तयार आहे.`,
      }),
      intent: byLanguage(options.language, {
        en: `Ward-wise collection report for ${scopeLabel}`,
        hi: `${scopeLabel} के लिए वार्ड-वार कलेक्शन रिपोर्ट`,
        mr: `${scopeLabel} साठी वॉर्डनिहाय संकलन अहवाल`,
      }),
      explanation: byLanguage(options.language, {
        en: 'This report summarizes property count, billed tax, pending dues, collected amount, and payment-status mix for each ward.',
        hi: 'यह रिपोर्ट प्रत्येक वार्ड के लिए संपत्ति संख्या, बिल्ड टैक्स, बकाया राशि, वसूली गई राशि और भुगतान स्थिति का सार दिखाती है।',
        mr: 'हा अहवाल प्रत्येक वॉर्डसाठी मालमत्ता संख्या, आकारलेला कर, थकबाकी, वसूल रक्कम आणि पेमेंट स्थितीचे सारांश दाखवतो.',
      }),
      queryType: 'comparison',
      query: `SELECT ward, COUNT(*) AS total_properties, SUM(tax_amount) AS total_tax, SUM(due_amount + water_tax_due + sewerage_tax_due + solid_waste_tax_due) AS total_due, SUM(tax_amount - due_amount) AS total_collected, SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) AS paid_count, SUM(CASE WHEN payment_status = 'UNPAID' THEN 1 ELSE 0 END) AS unpaid_count, SUM(CASE WHEN payment_status = 'PARTIAL' THEN 1 ELSE 0 END) AS partial_count FROM properties WHERE 1 = 1${buildScopeSql(
        ward,
        zone
      )} GROUP BY ward ORDER BY ward;`,
      results,
    });
  }

  if (isCollectionReportQuery(normalizedQuery, 'zone')) {
    const results = buildCollectionReport(properties, 'zone');

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en: `Zone-wise collection report is ready for ${scopeLabel} from ${sourceLabel}.`,
        hi: `${scopeLabel} के लिए ज़ोन-वार कलेक्शन रिपोर्ट ${sourceLabel} से तैयार है।`,
        mr: `${scopeLabel} साठी झोननिहाय संकलन अहवाल ${sourceLabel} मधून तयार आहे.`,
      }),
      intent: byLanguage(options.language, {
        en: `Zone-wise collection report for ${scopeLabel}`,
        hi: `${scopeLabel} के लिए ज़ोन-वार कलेक्शन रिपोर्ट`,
        mr: `${scopeLabel} साठी झोननिहाय संकलन अहवाल`,
      }),
      explanation: byLanguage(options.language, {
        en: 'This report summarizes property count, billed tax, pending dues, collected amount, and payment-status mix for each zone.',
        hi: 'यह रिपोर्ट प्रत्येक ज़ोन के लिए संपत्ति संख्या, बिल्ड टैक्स, बकाया राशि, वसूली गई राशि और भुगतान स्थिति का सार दिखाती है।',
        mr: 'हा अहवाल प्रत्येक झोनसाठी मालमत्ता संख्या, आकारलेला कर, थकबाकी, वसूल रक्कम आणि पेमेंट स्थितीचे सारांश दाखवतो.',
      }),
      queryType: 'comparison',
      query: `SELECT zone, COUNT(*) AS total_properties, SUM(tax_amount) AS total_tax, SUM(due_amount + water_tax_due + sewerage_tax_due + solid_waste_tax_due) AS total_due, SUM(tax_amount - due_amount) AS total_collected, SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) AS paid_count, SUM(CASE WHEN payment_status = 'UNPAID' THEN 1 ELSE 0 END) AS unpaid_count, SUM(CASE WHEN payment_status = 'PARTIAL' THEN 1 ELSE 0 END) AS partial_count FROM properties WHERE 1 = 1${buildScopeSql(
        ward,
        zone
      )} GROUP BY zone ORDER BY zone;`,
      results,
    });
  }

  if (isCollectionEfficiencyQuery(normalizedQuery)) {
    const groupBy = determineGrouping(normalizedQuery);
    const results = buildCollectionEfficiencyReport(properties, groupBy);

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en: `${capitalize(groupBy)} collection efficiency analysis is ready for ${scopeLabel} from ${sourceLabel}.`,
        hi: `${scopeLabel} के लिए ${localizeGroupingLabel(groupBy, options.language)}-वार वसूली दक्षता विश्लेषण ${sourceLabel} से तैयार है।`,
        mr: `${scopeLabel} साठी ${localizeGroupingLabel(groupBy, options.language)}-निहाय वसुली कार्यक्षमता विश्लेषण ${sourceLabel} मधून तयार आहे.`,
      }),
      intent: byLanguage(options.language, {
        en: `${capitalize(groupBy)} collection efficiency for ${scopeLabel}`,
        hi: `${scopeLabel} के लिए ${localizeGroupingLabel(groupBy, options.language)}-वार वसूली दक्षता`,
        mr: `${scopeLabel} साठी ${localizeGroupingLabel(groupBy, options.language)}-निहाय वसुली कार्यक्षमता`,
      }),
      explanation: byLanguage(options.language, {
        en: 'This comparison shows billed tax, collected amount, outstanding dues, and the effective collection percentage for each ward or zone.',
        hi: 'यह तुलना प्रत्येक वार्ड या ज़ोन के लिए बिल किया गया कर, वसूली गई राशि, बकाया देय और प्रभावी वसूली प्रतिशत दिखाती है।',
        mr: 'ही तुलना प्रत्येक वॉर्ड किंवा झोनसाठी आकारलेला कर, वसूल रक्कम, थकबाकी आणि प्रभावी वसुली टक्केवारी दाखवते.',
      }),
      queryType: 'comparison',
      query: `SELECT ${groupBy}, COUNT(*) AS total_properties, SUM(tax_amount) AS total_tax, SUM(tax_amount - due_amount) AS total_collected, SUM(due_amount + water_tax_due + sewerage_tax_due + solid_waste_tax_due) AS total_due, ROUND(SUM(tax_amount - due_amount) * 100.0 / NULLIF(SUM(tax_amount), 0), 2) AS collection_efficiency_pct FROM properties WHERE 1 = 1${buildScopeSql(
        ward,
        zone
      )} GROUP BY ${groupBy} ORDER BY collection_efficiency_pct DESC, total_due DESC;`,
      results,
    });
  }

  if (isOutstandingHotspotQuery(normalizedQuery)) {
    const groupBy = determineGrouping(normalizedQuery);
    const results = buildOutstandingHotspotReport(properties, groupBy);
    const topGroup = results[0];

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en:
          topGroup && topGroup[groupBy]
            ? `${String(topGroup[groupBy])} currently has the highest outstanding burden in ${scopeLabel} based on ${sourceLabel}.`
            : `Outstanding hotspot analysis is ready for ${scopeLabel} from ${sourceLabel}.`,
        hi:
          topGroup && topGroup[groupBy]
            ? `${localizeAreaLabel(String(topGroup[groupBy]), options.language)} पर ${scopeLabel} में ${sourceLabel} के आधार पर सबसे अधिक बकाया भार है।`
            : `${scopeLabel} के लिए बकाया हॉटस्पॉट विश्लेषण ${sourceLabel} से तैयार है।`,
        mr:
          topGroup && topGroup[groupBy]
            ? `${localizeAreaLabel(String(topGroup[groupBy]), options.language)} येथे ${scopeLabel} मध्ये ${sourceLabel} नुसार सर्वाधिक थकबाकीचा भार आहे.`
            : `${scopeLabel} साठी थकबाकी हॉटस्पॉट विश्लेषण ${sourceLabel} मधून तयार आहे.`,
      }),
      intent: byLanguage(options.language, {
        en: `${capitalize(groupBy)} outstanding hotspot analysis for ${scopeLabel}`,
        hi: `${scopeLabel} के लिए ${localizeGroupingLabel(groupBy, options.language)}-वार बकाया हॉटस्पॉट विश्लेषण`,
        mr: `${scopeLabel} साठी ${localizeGroupingLabel(groupBy, options.language)}-निहाय थकबाकी हॉटस्पॉट विश्लेषण`,
      }),
      explanation: byLanguage(options.language, {
        en: 'This view ranks wards or zones by outstanding dues, unpaid property counts, and collection efficiency so officers can identify the most urgent areas first.',
        hi: 'यह दृश्य वार्डों या ज़ोनों को बकाया देय, अवैतनिक संपत्तियों की संख्या और वसूली दक्षता के आधार पर क्रम देता है, ताकि अधिकारी सबसे जरूरी क्षेत्रों की पहचान कर सकें।',
        mr: 'हे दृश्य वॉर्ड किंवा झोन यांना थकबाकी, न भरलेल्या मालमत्तांची संख्या आणि वसुली कार्यक्षमता यानुसार क्रम लावते, ज्यामुळे अधिक तातडीचे क्षेत्र आधी ओळखता येतात.',
      }),
      queryType: 'comparison',
      query: `SELECT ${groupBy}, SUM(due_amount + water_tax_due + sewerage_tax_due + solid_waste_tax_due) AS total_due, SUM(CASE WHEN payment_status = 'UNPAID' THEN 1 ELSE 0 END) AS unpaid_properties, SUM(CASE WHEN payment_status = 'PARTIAL' THEN 1 ELSE 0 END) AS partial_properties, ROUND(SUM(tax_amount - due_amount) * 100.0 / NULLIF(SUM(tax_amount), 0), 2) AS collection_efficiency_pct FROM properties WHERE 1 = 1${buildScopeSql(
        ward,
        zone
      )} GROUP BY ${groupBy} ORDER BY total_due DESC, unpaid_properties DESC;`,
      results,
    });
  }

  if (isTrendAnomalyQuery(normalizedQuery)) {
    const months = extractMonthWindow(userQuery);
    const results = buildTrendAnomalyReport(properties, options.language, months);
    const anomalyMonths = results.filter((row) => Boolean(row.is_anomaly));

    if (results.length === 0) {
      return {
        reply: byLanguage(options.language, {
          en: `I could not find enough monthly payment activity to analyze drops in ${scopeLabel}.`,
          hi: `${scopeLabel} के लिए गिरावट का विश्लेषण करने लायक पर्याप्त मासिक भुगतान गतिविधि नहीं मिली।`,
          mr: `${scopeLabel} साठी घसरण विश्लेषित करण्याइतकी पुरेशी मासिक पेमेंट क्रिया सापडली नाही.`,
        }),
      };
    }

    const topAnomalyLabel =
      anomalyMonths.length > 0
        ? String(anomalyMonths[0].payment_month)
        : null;

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en:
          topAnomalyLabel !== null
            ? `${topAnomalyLabel} shows the sharpest collection drop in the last ${months} months for ${scopeLabel}.`
            : `Month-on-month collection trend for the last ${months} months is ready for ${scopeLabel} from ${sourceLabel}.`,
        hi:
          topAnomalyLabel !== null
            ? `${scopeLabel} के लिए पिछले ${months} महीनों में ${topAnomalyLabel} में सबसे तेज़ कलेक्शन गिरावट दिखी।`
            : `${scopeLabel} के लिए पिछले ${months} महीनों का माह-दर-माह कलेक्शन ट्रेंड ${sourceLabel} से तैयार है।`,
        mr:
          topAnomalyLabel !== null
            ? `${scopeLabel} साठी मागील ${months} महिन्यांत ${topAnomalyLabel} मध्ये सर्वात तीव्र वसुली घसरण दिसते.`
            : `${scopeLabel} साठी मागील ${months} महिन्यांचा महिनावार वसुली कल ${sourceLabel} मधून तयार आहे.`,
      }),
      intent: byLanguage(options.language, {
        en: `Monthly collection anomalies for ${scopeLabel}`,
        hi: `${scopeLabel} के लिए मासिक कलेक्शन विसंगतियां`,
        mr: `${scopeLabel} साठी मासिक वसुली विसंगती`,
      }),
      explanation: byLanguage(options.language, {
        en: `This trend compares the last ${months} active payment months, measures month-on-month change, and flags sharp drops where collections suddenly weakened against the prior month and recent baseline.`,
        hi: `यह ट्रेंड पिछले ${months} सक्रिय भुगतान महीनों की तुलना करता है, माह-दर-माह बदलाव मापता है और उन महीनों को चिन्हित करता है जहां पिछली अवधि और हालिया बेसलाइन की तुलना में कलेक्शन अचानक कमजोर हुआ।`,
        mr: `हा कल मागील ${months} सक्रिय पेमेंट महिन्यांची तुलना करतो, महिन्यावरील बदल मोजतो आणि ज्या महिन्यांत मागील महिन्याच्या व अलीकडील बेसलाइनच्या तुलनेत वसुली अचानक कमी झाली ते महिने चिन्हांकित करतो.`,
      }),
      queryType: 'comparison',
      query: `ANALYTICS:
Monthly anomaly scan
Scope: ${scopeLabel}
Window: last ${months} active payment months
Logic: compare collected_amount and payment_events month-over-month, flag drops where collection falls sharply versus prior month and rolling baseline`,
      results,
    });
  }

  if (isMonthlyTrendQuery(normalizedQuery)) {
    const results = buildCollectionTrendReport(properties, 'month');

    if (results.length === 0) {
      return {
        reply: byLanguage(options.language, {
          en: `I could not find any monthly payment activity for ${scopeLabel}.`,
          hi: `${scopeLabel} के लिए कोई मासिक भुगतान गतिविधि नहीं मिली।`,
          mr: `${scopeLabel} साठी कोणतीही मासिक पेमेंट क्रिया सापडली नाही.`,
        }),
      };
    }

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en: `Monthly collection trend is ready for ${scopeLabel} from ${sourceLabel}.`,
        hi: `${scopeLabel} के लिए मासिक वसूली रुझान ${sourceLabel} से तैयार है।`,
        mr: `${scopeLabel} साठी मासिक वसुलीचा कल ${sourceLabel} मधून तयार आहे.`,
      }),
      intent: byLanguage(options.language, {
        en: `Monthly recovery trend for ${scopeLabel}`,
        hi: `${scopeLabel} के लिए मासिक रिकवरी रुझान`,
        mr: `${scopeLabel} साठी मासिक वसुलीचा कल`,
      }),
      explanation: byLanguage(options.language, {
        en: 'This trend groups payment activity by month so you can track how many accounts made payments, how much tax was collected, and how much outstanding due still sits in those monthly cohorts.',
        hi: 'यह रुझान भुगतान गतिविधि को महीने के अनुसार समूहित करता है, ताकि आप देख सकें कि कितने खातों ने भुगतान किया, कितनी कर वसूली हुई और उन समूहों में कितनी बकाया राशि अभी भी बाकी है।',
        mr: 'हा कल पेमेंट क्रियेला महिन्यानुसार गटबद्ध करतो, त्यामुळे किती खात्यांनी पेमेंट केले, किती कर वसूल झाला आणि त्या गटांमध्ये किती थकबाकी उरली आहे हे पाहता येते.',
      }),
      queryType: 'comparison',
      query: `SELECT strftime('%Y-%m', last_payment_date) AS payment_month, COUNT(*) AS payment_events, SUM(tax_amount - due_amount) AS collected_amount, SUM(due_amount + water_tax_due + sewerage_tax_due + solid_waste_tax_due) AS outstanding_due, SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) AS paid_count, SUM(CASE WHEN payment_status = 'PARTIAL' THEN 1 ELSE 0 END) AS partial_count FROM properties WHERE last_payment_date IS NOT NULL${buildScopeSql(
        ward,
        zone
      )} GROUP BY strftime('%Y-%m', last_payment_date) ORDER BY payment_month ASC;`,
      results,
    });
  }

  if (isYearlyTrendQuery(normalizedQuery)) {
    const results = buildCollectionTrendReport(properties, 'year');

    if (results.length === 0) {
      return {
        reply: byLanguage(options.language, {
          en: `I could not find any yearly payment activity for ${scopeLabel}.`,
          hi: `${scopeLabel} के लिए कोई वार्षिक भुगतान गतिविधि नहीं मिली।`,
          mr: `${scopeLabel} साठी कोणतीही वार्षिक पेमेंट क्रिया सापडली नाही.`,
        }),
      };
    }

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en: `Yearly recovery trend is ready for ${scopeLabel} from ${sourceLabel}.`,
        hi: `${scopeLabel} के लिए वार्षिक रिकवरी रुझान ${sourceLabel} से तैयार है।`,
        mr: `${scopeLabel} साठी वार्षिक वसुलीचा कल ${sourceLabel} मधून तयार आहे.`,
      }),
      intent: byLanguage(options.language, {
        en: `Yearly recovery trend for ${scopeLabel}`,
        hi: `${scopeLabel} के लिए वार्षिक रिकवरी रुझान`,
        mr: `${scopeLabel} साठी वार्षिक वसुलीचा कल`,
      }),
      explanation: byLanguage(options.language, {
        en: 'This yearly trend shows recovery momentum over time so you can compare payment activity, collected tax, and residual outstanding burden by year.',
        hi: 'यह वार्षिक रुझान समय के साथ रिकवरी की गति दिखाता है, जिससे आप भुगतान गतिविधि, वसूला गया कर और बचा हुआ बकाया भार वर्ष के अनुसार तुलना कर सकते हैं।',
        mr: 'हा वार्षिक कल कालांतराने वसुलीची गती दर्शवतो, त्यामुळे पेमेंट क्रिया, वसूल कर आणि उरलेला थकबाकी भार वर्षानुसार तुलना करता येतो.',
      }),
      queryType: 'comparison',
      query: `SELECT strftime('%Y', last_payment_date) AS payment_year, COUNT(*) AS payment_events, SUM(tax_amount - due_amount) AS collected_amount, SUM(due_amount + water_tax_due + sewerage_tax_due + solid_waste_tax_due) AS outstanding_due, SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) AS paid_count, SUM(CASE WHEN payment_status = 'PARTIAL' THEN 1 ELSE 0 END) AS partial_count FROM properties WHERE last_payment_date IS NOT NULL${buildScopeSql(
        ward,
        zone
      )} GROUP BY strftime('%Y', last_payment_date) ORDER BY payment_year ASC;`,
      results,
    });
  }

  if (isOfficerPerformanceQuery(normalizedQuery)) {
    const results = buildOfficerPerformanceReport(properties, options.language);
    const topOfficer = results[0];
    const bottomOfficer = results[results.length - 1];

    if (results.length === 0) {
      return {
        reply: byLanguage(options.language, {
          en: `I could not build an officer performance view for ${scopeLabel}.`,
          hi: `${scopeLabel} के लिए अधिकारी प्रदर्शन दृश्य तैयार नहीं किया जा सका।`,
          mr: `${scopeLabel} साठी अधिकारी कार्यप्रदर्शन दृश्य तयार करता आले नाही.`,
        }),
      };
    }

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en:
          topOfficer && bottomOfficer && topOfficer.collection_officer
            ? `${String(topOfficer.collection_officer)} is currently the best-performing officer for ${scopeLabel}, while ${String(bottomOfficer.collection_officer)} needs the most support based on collection efficiency from ${sourceLabel}.`
            : `Officer performance analysis is ready for ${scopeLabel} from ${sourceLabel}.`,
        hi:
          topOfficer && bottomOfficer && topOfficer.collection_officer
            ? `${String(topOfficer.collection_officer)} ${scopeLabel} के लिए सर्वश्रेष्ठ प्रदर्शन कर रहे हैं, जबकि ${String(bottomOfficer.collection_officer)} को कलेक्शन दक्षता के आधार पर सबसे अधिक सुधार सहायता की जरूरत है।`
            : `${scopeLabel} के लिए अधिकारी प्रदर्शन विश्लेषण ${sourceLabel} से तैयार है।`,
        mr:
          topOfficer && bottomOfficer && topOfficer.collection_officer
            ? `${String(topOfficer.collection_officer)} ${scopeLabel} साठी सर्वोत्तम कामगिरी करत आहेत, तर ${String(bottomOfficer.collection_officer)} यांना वसुली कार्यक्षमतेच्या आधारावर अधिक सुधारणा सहाय्याची गरज आहे.`
            : `${scopeLabel} साठी अधिकारी कार्यप्रदर्शन विश्लेषण ${sourceLabel} मधून तयार आहे.`,
      }),
      intent: byLanguage(options.language, {
        en: `Officer performance analysis for ${scopeLabel}`,
        hi: `${scopeLabel} के लिए अधिकारी प्रदर्शन विश्लेषण`,
        mr: `${scopeLabel} साठी अधिकारी कार्यप्रदर्शन विश्लेषण`,
      }),
      explanation: byLanguage(options.language, {
        en: 'This leaderboard ranks collection officers by collection efficiency first, then uses outstanding dues and high-risk load to separate the strongest and weakest portfolios.',
        hi: 'यह लीडरबोर्ड पहले वसूली दक्षता के आधार पर अधिकारियों की रैंकिंग करता है और फिर बकाया देय तथा उच्च जोखिम खातों के भार से मजबूत और कमजोर पोर्टफोलियो अलग करता है।',
        mr: 'हा लीडरबोर्ड आधी वसुली कार्यक्षमतेनुसार अधिकाऱ्यांची क्रमवारी लावतो आणि नंतर थकबाकी व उच्च-जोखीम खात्यांच्या भारावरून मजबूत व कमकुवत पोर्टफोलिओ वेगळे करतो.',
      }),
      queryType: 'comparison',
      query: `SELECT collection_officer, COUNT(*) AS total_properties, SUM(tax_amount) AS total_tax, SUM(due_amount + water_tax_due + sewerage_tax_due + solid_waste_tax_due) AS total_due, SUM(tax_amount - due_amount) AS total_collected, ROUND(SUM(tax_amount - due_amount) * 100.0 / NULLIF(SUM(tax_amount), 0), 2) AS collection_efficiency_pct, SUM(CASE WHEN payment_status = 'UNPAID' THEN 1 ELSE 0 END) AS unpaid_count, SUM(CASE WHEN payment_status = 'PARTIAL' THEN 1 ELSE 0 END) AS partial_count FROM properties WHERE 1 = 1${buildScopeSql(
        ward,
        zone
      )} GROUP BY collection_officer ORDER BY collection_efficiency_pct DESC, total_due ASC;`,
      results,
    });
  }

  if (isDashboardQuery(normalizedQuery)) {
    const dashboardReport = buildDashboardReport(
      properties,
      mapProperties,
      scopeLabel,
      ward,
      options.language
    );

    if (!dashboardReport) {
      return {
        reply: byLanguage(options.language, {
          en: `I could not build a dashboard for ${scopeLabel} because no matching properties were found.`,
          hi: `${scopeLabel} के लिए डैशबोर्ड तैयार नहीं किया जा सका क्योंकि कोई मिलती-जुलती संपत्ति नहीं मिली।`,
          mr: `${scopeLabel} साठी डॅशबोर्ड तयार करता आला नाही कारण जुळणाऱ्या मालमत्ता सापडल्या नाहीत.`,
        }),
      };
    }

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en: `Auto Dashboard Mode is ready for ${scopeLabel}.`,
        hi: `${scopeLabel} के लिए ऑटो डैशबोर्ड मोड तैयार है।`,
        mr: `${scopeLabel} साठी ऑटो डॅशबोर्ड मोड तयार आहे.`,
      }),
      intent: byLanguage(options.language, {
        en: `Full dashboard report for ${scopeLabel}`,
        hi: `${scopeLabel} के लिए पूर्ण डैशबोर्ड रिपोर्ट`,
        mr: `${scopeLabel} साठी पूर्ण डॅशबोर्ड अहवाल`,
      }),
      explanation: byLanguage(options.language, {
        en: 'This mini dashboard combines summary KPIs, a top outstanding accounts bar chart, a paid-vs-unpaid pie chart, a Leaflet ward heatmap, and the detailed property table in one response.',
        hi: 'यह मिनी डैशबोर्ड एक ही उत्तर में सार KPI, शीर्ष बकाया खातों का बार चार्ट, भुगतान पूर्ण बनाम बकाया पाई चार्ट, वार्ड हीटमैप और विस्तृत संपत्ति तालिका दिखाता है।',
        mr: 'हा मिनी डॅशबोर्ड एका उत्तरात सारांश KPI, शीर्ष थकबाकी खात्यांचा बार चार्ट, भरलेले विरुद्ध थकित पाई चार्ट, वॉर्ड हीटमॅप आणि तपशीलवार मालमत्ता तक्ता दाखवतो.',
      }),
      queryType: 'dashboard',
      query: `DASHBOARD:
Scope: ${scopeLabel}
Sections: summary_cards, top_outstanding_accounts_bar_chart, paid_vs_unpaid_pie_chart, ward_heatmap, summary_insights, detailed_table`,
      results: dashboardReport.tableRows,
      dashboard: dashboardReport.dashboard,
    });
  }

  if (isPaymentDistributionQuery(normalizedQuery)) {
    const results = buildPaymentStatusDistribution(properties, options.language);

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en: `Built the payment status distribution chart for ${scopeLabel} using ${sourceLabel}.`,
        hi: `${sourceLabel} का उपयोग करके ${scopeLabel} के लिए भुगतान स्थिति वितरण चार्ट तैयार किया गया।`,
        mr: `${sourceLabel} वापरून ${scopeLabel} साठी पेमेंट स्थिती वितरण चार्ट तयार केला.`,
      }),
      intent: byLanguage(options.language, {
        en: `Payment status distribution for ${scopeLabel}`,
        hi: `${scopeLabel} के लिए भुगतान स्थिति वितरण`,
        mr: `${scopeLabel} साठी पेमेंट स्थिती वितरण`,
      }),
      explanation: byLanguage(options.language, {
        en: 'The chart compares how many properties are paid, unpaid, or partially paid, along with the due amount in each payment bucket.',
        hi: 'यह चार्ट दिखाता है कि कितनी संपत्तियां भुगतान पूर्ण, अवैतनिक या आंशिक भुगतान की स्थिति में हैं, और प्रत्येक स्थिति में कितनी देय राशि है।',
        mr: 'हा चार्ट किती मालमत्ता भरलेली, न भरलेली किंवा अंशतः भरलेली आहे आणि प्रत्येक स्थितीत किती थकबाकी आहे हे दाखवतो.',
      }),
      queryType: 'comparison',
      query: `SELECT payment_status, COUNT(*) AS property_count, SUM(total_due_all_taxes) AS total_due FROM properties WHERE 1 = 1${buildScopeSql(ward, zone)} GROUP BY payment_status ORDER BY property_count DESC;`,
      results,
    });
  }

  if (isIntegratedTaxQuery(normalizedQuery)) {
    if (propertyId !== null) {
      const property = options.properties.find((item) => item.property_id === propertyId);

      if (!property) {
        return {
          reply: byLanguage(options.language, {
            en: `I could not find property ID ${propertyId} for the integrated-tax lookup.`,
            hi: `एकीकृत कर जानकारी के लिए प्रॉपर्टी ID ${propertyId} नहीं मिली।`,
            mr: `एकत्रित कर माहितीसाठी प्रॉपर्टी ID ${propertyId} सापडली नाही.`,
          }),
        };
      }

      return createDataResponse({
        source: options.source,
        reply: byLanguage(options.language, {
          en: `Integrated municipal tax summary for property ID ${propertyId} is ready from ${sourceLabel}.`,
          hi: `प्रॉपर्टी ID ${propertyId} के लिए एकीकृत नगर कर सारांश ${sourceLabel} से तैयार है।`,
          mr: `प्रॉपर्टी ID ${propertyId} साठी एकत्रित नगरपालिका कर सारांश ${sourceLabel} मधून तयार आहे.`,
        }),
        intent: byLanguage(options.language, {
          en: `Integrated tax summary for property ID ${propertyId}`,
          hi: `प्रॉपर्टी ID ${propertyId} के लिए एकीकृत कर सारांश`,
          mr: `प्रॉपर्टी ID ${propertyId} साठी एकत्रित कर सारांश`,
        }),
        explanation: byLanguage(options.language, {
          en: 'This combines property tax with water, sewerage, and solid-waste dues for one property.',
          hi: 'यह एक संपत्ति के लिए प्रॉपर्टी टैक्स को जल, सीवरेज और ठोस अपशिष्ट कर के साथ जोड़ता है।',
          mr: 'हे एका मालमत्तेसाठी मालमत्ता करासोबत पाणी, सांडपाणी आणि घनकचरा कर जोडते.',
        }),
        queryType: 'comparison',
        query: `SELECT due_amount, water_tax_due, sewerage_tax_due, solid_waste_tax_due, total_due_all_taxes FROM properties WHERE property_id = ${propertyId};`,
        results: buildIntegratedTaxBreakdown([property], options.language),
      });
    }

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en: `Integrated municipal tax summary for ${scopeLabel} is ready from ${sourceLabel}.`,
        hi: `${scopeLabel} के लिए एकीकृत नगर कर सारांश ${sourceLabel} से तैयार है।`,
        mr: `${scopeLabel} साठी एकत्रित नगरपालिका कर सारांश ${sourceLabel} मधून तयार आहे.`,
      }),
      intent: byLanguage(options.language, {
        en: `Integrated tax summary for ${scopeLabel}`,
        hi: `${scopeLabel} के लिए एकीकृत कर सारांश`,
        mr: `${scopeLabel} साठी एकत्रित कर सारांश`,
      }),
      explanation: byLanguage(options.language, {
        en: 'This view combines property tax with other municipal dues so you can see the total liability by tax category.',
        hi: 'यह दृश्य प्रॉपर्टी टैक्स को अन्य नगर करों के साथ जोड़कर कुल देनदारी को कर श्रेणी के अनुसार दिखाता है।',
        mr: 'हे दृश्य मालमत्ता करासोबत इतर नगरपालिका कर जोडून करप्रकारानुसार एकूण देयता दाखवते.',
      }),
      queryType: 'comparison',
      query: `SELECT SUM(due_amount) AS property_tax_due, SUM(water_tax_due) AS water_tax_due, SUM(sewerage_tax_due) AS sewerage_tax_due, SUM(solid_waste_tax_due) AS solid_waste_tax_due, SUM(total_due_all_taxes) AS total_due_all_taxes FROM properties WHERE 1 = 1${buildScopeSql(ward, zone)};`,
      results: buildIntegratedTaxBreakdown(properties, options.language),
    });
  }

  if (isDefaultPredictionQuery(normalizedQuery)) {
    const results = buildDefaultPredictionReport(properties, options.language);
    const topPrediction = results[0];

    if (results.length === 0) {
      return {
        reply: byLanguage(options.language, {
          en: `I could not find enough account history to predict next-year defaults in ${scopeLabel}.`,
          hi: `${scopeLabel} में अगले वर्ष के डिफॉल्ट का पूर्वानुमान लगाने के लिए पर्याप्त खाता इतिहास नहीं मिला।`,
          mr: `${scopeLabel} मध्ये पुढील वर्षीचे डिफॉल्ट भाकीत करण्यासाठी पुरेसा खाते इतिहास सापडला नाही.`,
        }),
      };
    }

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en:
          topPrediction && topPrediction.owner_name
            ? `${String(topPrediction.owner_name)} currently has the strongest next-year default signal in ${scopeLabel}.`
            : `Next-year default prediction is ready for ${scopeLabel} from ${sourceLabel}.`,
        hi:
          topPrediction && topPrediction.owner_name
            ? `${String(topPrediction.owner_name)} में ${scopeLabel} के भीतर अगले वर्ष डिफॉल्ट का सबसे मजबूत संकेत दिख रहा है।`
            : `${scopeLabel} के लिए अगले वर्ष डिफॉल्ट पूर्वानुमान ${sourceLabel} से तैयार है।`,
        mr:
          topPrediction && topPrediction.owner_name
            ? `${String(topPrediction.owner_name)} यांच्यात ${scopeLabel} मध्ये पुढील वर्षी डिफॉल्ट होण्याचा सर्वात मजबूत संकेत दिसतो.`
            : `${scopeLabel} साठी पुढील वर्षी डिफॉल्ट भाकीत ${sourceLabel} मधून तयार आहे.`,
      }),
      intent: byLanguage(options.language, {
        en: `Next-year default prediction for ${scopeLabel}`,
        hi: `${scopeLabel} के लिए अगले वर्ष डिफॉल्ट पूर्वानुमान`,
        mr: `${scopeLabel} साठी पुढील वर्षी डिफॉल्ट भाकीत`,
      }),
      explanation: byLanguage(options.language, {
        en: 'This forecast converts current risk score, payment aging, payment status, and outstanding tax pressure into a next-year default likelihood percentage so officers can intervene early.',
        hi: 'यह पूर्वानुमान वर्तमान जोखिम स्कोर, भुगतान की उम्र, भुगतान स्थिति और बकाया कर दबाव को अगले वर्ष डिफॉल्ट की संभावना प्रतिशत में बदलता है ताकि अधिकारी पहले से हस्तक्षेप कर सकें।',
        mr: 'हे भाकीत सध्याचा जोखीम गुण, पेमेंटचे वय, पेमेंट स्थिती आणि थकबाकीचा दबाव यांना पुढील वर्षी डिफॉल्ट होण्याच्या शक्यता टक्केवारीत रूपांतरित करते, ज्यामुळे अधिकारी लवकर हस्तक्षेप करू शकतात.',
      }),
      queryType: 'table',
      query: `ANALYTICS:
Next-year default likelihood = weighted current risk score + payment aging + outstanding burden + payment-status outlook
Dataset scope: ${scopeLabel}
Top 12 properties ordered by predicted_default_likelihood_pct DESC`,
      results,
    });
  }

  if (isPredictiveRiskQuery(normalizedQuery)) {
    const riskyProperties = properties
      .filter((property) => property.total_due_all_taxes > 0)
      .map((property) => {
        const risk = calculateDefaulterRisk(property);
        return {
          property_id: property.property_id,
          owner_name: property.owner_name,
          ward: property.ward,
          zone: property.zone,
          due_amount: property.due_amount,
          total_due_all_taxes: property.total_due_all_taxes,
          risk_score: risk.risk_score,
          risk_band: localizeRiskBand(risk.risk_band, options.language),
        };
      })
      .sort((left, right) => right.risk_score - left.risk_score)
      .slice(0, 10);

    if (riskyProperties.length === 0) {
      return {
        reply: byLanguage(options.language, {
          en: `There are no overdue properties to score in ${scopeLabel}.`,
          hi: `${scopeLabel} में स्कोर करने के लिए कोई बकाया संपत्ति नहीं है।`,
          mr: `${scopeLabel} मध्ये गुणांकन करण्यासाठी कोणतीही थकबाकी मालमत्ता नाही.`,
        }),
      };
    }

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en: `Predicted the highest-risk defaulters in ${scopeLabel} using ${sourceLabel}.`,
        hi: `${sourceLabel} का उपयोग करके ${scopeLabel} में उच्च जोखिम वाले बकायेदारों का पूर्वानुमान तैयार किया गया।`,
        mr: `${sourceLabel} वापरून ${scopeLabel} मधील उच्च-जोखीम थकबाकीदारांचा अंदाज तयार केला.`,
      }),
      intent: byLanguage(options.language, {
        en: `Predictive defaulter insights for ${scopeLabel}`,
        hi: `${scopeLabel} के लिए पूर्वानुमानित बकायेदार अंतर्दृष्टि`,
        mr: `${scopeLabel} साठी अंदाजाधारित थकबाकीदार अंतर्दृष्टी`,
      }),
      explanation: byLanguage(options.language, {
        en: 'Risk scores combine unpaid property tax, aging payment history, and connected municipal tax dues to prioritize likely defaulters.',
        hi: 'जोखिम स्कोर अवैतनिक प्रॉपर्टी टैक्स, पुराने भुगतान इतिहास और जुड़े नगर करों की देनदारियों को मिलाकर संभावित बकायेदारों की प्राथमिकता तय करता है।',
        mr: 'जोखीम गुणांकन न भरलेला मालमत्ता कर, जुनी पेमेंट हिस्टरी आणि जोडलेली नगरपालिका कर थकबाकी एकत्र करून संभाव्य थकबाकीदारांना प्राधान्य देते.',
      }),
      queryType: 'table',
      query: `ANALYTICS:
Risk score = payment_status_weight + due_amount_weight + payment_history_weight + other_tax_weight
Dataset scope: ${scopeLabel}
Top 10 properties ordered by risk_score DESC`,
      results: riskyProperties,
    });
  }

  if (isPenaltyWaiverSimulationQuery(normalizedQuery)) {
    const waiverPct = extractWaiverPercent(userQuery);
    const results = buildPenaltyWaiverSimulationReport(
      properties,
      options.language,
      waiverPct
    );
    const totalRow = results[results.length - 1];

    if (results.length === 0 || !totalRow) {
      return {
        reply: byLanguage(options.language, {
          en: `There are no overdue accounts eligible for a penalty-waiver simulation in ${scopeLabel}.`,
          hi: `${scopeLabel} में पेनल्टी-वेवर सिमुलेशन के लिए कोई पात्र बकाया खाता नहीं मिला।`,
          mr: `${scopeLabel} मध्ये दंड-सवलत सिम्युलेशनसाठी पात्र अशी थकीत खाती सापडली नाहीत.`,
        }),
      };
    }

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en: `A ${waiverPct}% penalty-waiver simulation for ${scopeLabel} estimates net recoverable revenue of ${formatCurrency(Number(totalRow.estimated_recovery_with_waiver ?? 0))}.`,
        hi: `${scopeLabel} के लिए ${waiverPct}% पेनल्टी-वेवर सिमुलेशन अनुमान लगाता है कि शुद्ध वसूली योग्य राजस्व ${formatCurrency(Number(totalRow.estimated_recovery_with_waiver ?? 0))} हो सकता है।`,
        mr: `${scopeLabel} साठी ${waiverPct}% दंड-सवलत सिम्युलेशननुसार निव्वळ वसूल होऊ शकणारे उत्पन्न ${formatCurrency(Number(totalRow.estimated_recovery_with_waiver ?? 0))} असू शकते.`,
      }),
      intent: byLanguage(options.language, {
        en: `Penalty-waiver recovery simulation for ${scopeLabel}`,
        hi: `${scopeLabel} के लिए पेनल्टी-वेवर रिकवरी सिमुलेशन`,
        mr: `${scopeLabel} साठी दंड-सवलत वसुली सिम्युलेशन`,
      }),
      explanation: byLanguage(options.language, {
        en: `This simulation assumes a ${waiverPct}% waiver on overdue balances improves response rates differently for partial, recent unpaid, and stale unpaid accounts, then estimates gross recovery, waiver cost, and net uplift.`,
        hi: `यह सिमुलेशन मानता है कि बकाया राशियों पर ${waiverPct}% की छूट आंशिक, हालिया अवैतनिक और लंबे समय से अवैतनिक खातों में अलग-अलग प्रतिक्रिया दर बढ़ाती है, और फिर सकल वसूली, छूट लागत तथा शुद्ध बढ़ोतरी का अनुमान लगाता है।`,
        mr: `हे सिम्युलेशन गृहीत धरते की थकीत रकमेवर ${waiverPct}% सूट दिल्यास आंशिक, अलीकडील थकीत आणि जुनी थकीत खाती यांच्यात प्रतिसाद दर वेगवेगळ्या प्रमाणात वाढेल, आणि त्यावरून एकूण वसुली, सूट खर्च व निव्वळ वाढ यांचा अंदाज काढतो.`,
      }),
      queryType: 'comparison',
      query: `SIMULATION:
Penalty waiver: ${waiverPct}%
Scope: ${scopeLabel}
Eligibility: payment_status IN ('UNPAID', 'PARTIAL') AND total_due_all_taxes > 0
Estimated recovery = discounted dues * adjusted response probability
Output: segment-wise recovery before waiver, recovery after waiver, waiver cost, and net uplift`,
      results,
    });
  }

  if (isRecoveryPriorityQuery(normalizedQuery)) {
    const results = buildRecoveryPriorityReport(properties, options.language);

    if (results.length === 0) {
      return {
        reply: byLanguage(options.language, {
          en: `There are no overdue accounts to prioritize in ${scopeLabel}.`,
          hi: `${scopeLabel} में प्राथमिकता तय करने के लिए कोई बकाया खाता नहीं है।`,
          mr: `${scopeLabel} मध्ये प्राधान्य देण्यासाठी कोणतेही थकीत खाते नाही.`,
        }),
      };
    }

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en: `Recovery priority list for ${scopeLabel} is ready from ${sourceLabel}.`,
        hi: `${scopeLabel} के लिए वसूली प्राथमिकता सूची ${sourceLabel} से तैयार है।`,
        mr: `${scopeLabel} साठी वसुली प्राधान्य यादी ${sourceLabel} मधून तयार आहे.`,
      }),
      intent: byLanguage(options.language, {
        en: `Recovery priority accounts for ${scopeLabel}`,
        hi: `${scopeLabel} के लिए वसूली प्राथमिकता खाते`,
        mr: `${scopeLabel} साठी वसुली प्राधान्य खाती`,
      }),
      explanation: byLanguage(options.language, {
        en: 'Priority ranks combine total dues, aging payment history, and risk score so officers can start with the most urgent recoveries.',
        hi: 'प्राथमिकता रैंक कुल देय राशि, पुराने भुगतान इतिहास और जोखिम स्कोर को जोड़ती है, ताकि अधिकारी सबसे जरूरी वसूली से शुरुआत कर सकें।',
        mr: 'प्राधान्य क्रम एकूण देय रक्कम, जुन्या पेमेंट इतिहास आणि जोखीम गुणांकन एकत्र करून ठरवला जातो, ज्यामुळे अधिकारी सर्वात तातडीच्या वसुलीपासून सुरुवात करू शकतात.',
      }),
      queryType: 'table',
      query: `ANALYTICS:
Recovery priority rank = weighted dues + risk score + payment aging
Dataset scope: ${scopeLabel}
Top 15 accounts ordered by recovery_priority DESC`,
      results,
    });
  }

  if (isReassessmentErrorQuery(normalizedQuery)) {
    const results = buildReassessmentSpikeReport(properties, options.language);

    if (results.length === 0) {
      return {
        reply: byLanguage(options.language, {
          en: `I did not find any sharp due spikes worth review in ${scopeLabel}.`,
          hi: `${scopeLabel} में समीक्षा योग्य कोई तेज़ बकाया उछाल नहीं मिला।`,
          mr: `${scopeLabel} मध्ये तपासण्याजोगी थकबाकीची तीव्र उडी दिसली नाही.`,
        }),
      };
    }

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en: `Flagged ${results.length} properties in ${scopeLabel} where dues jumped sharply against the prior-year baseline.`,
        hi: `${scopeLabel} में ${results.length} ऐसी संपत्तियां चिन्हित की गईं जहां बकाया राशि पिछले वर्ष के बेसलाइन की तुलना में तेज़ी से बढ़ी।`,
        mr: `${scopeLabel} मध्ये ${results.length} मालमत्ता चिन्हांकित केल्या जिथे थकबाकी मागील वर्षाच्या बेसलाइनच्या तुलनेत झपाट्याने वाढली.`,
      }),
      intent: byLanguage(options.language, {
        en: `Possible reassessment spikes in ${scopeLabel}`,
        hi: `${scopeLabel} में संभावित पुनर्मूल्यांकन उछाल`,
        mr: `${scopeLabel} मधील संभाव्य पुनर्मूल्यांकन उड्या`,
      }),
      explanation: byLanguage(options.language, {
        en: 'This heuristic compares current dues with a prior-year behavioral baseline for each property and flags unusually large jumps that may deserve reassessment or billing review.',
        hi: 'यह ह्यूरिस्टिक प्रत्येक संपत्ति की वर्तमान देय राशि की तुलना पिछले वर्ष के व्यवहार-आधारित बेसलाइन से करती है और असामान्य रूप से बड़ी बढ़ोतरी को चिन्हित करती है, जिनकी पुनर्मूल्यांकन या बिलिंग समीक्षा की जरूरत हो सकती है।',
        mr: 'ही ह्युरिस्टिक प्रत्येक मालमत्तेच्या सध्याच्या देय रकमेची तुलना मागील वर्षाच्या वर्तनाधारित बेसलाइनशी करते आणि पुनर्मूल्यांकन किंवा बिलिंग पुनरावलोकनाची गरज असू शकणाऱ्या असामान्य मोठ्या वाढी चिन्हांकित करते.',
      }),
      queryType: 'table',
      query: `ANALYTICS:
Possible reassessment spike detection
Scope: ${scopeLabel}
Logic: compare current due_amount with estimated_previous_year_due derived from payment behavior, tax slab, and overdue profile
Flag when due_increase_pct >= 35 and due_increase_amount is materially high`,
      results,
    });
  }

  if (isStaleAccountQuery(normalizedQuery)) {
    const agingDays = extractAgingDays(userQuery);
    const results = buildStaleAccountReport(properties, options.language, agingDays);

    if (results.length === 0) {
      return {
        reply: byLanguage(options.language, {
          en: `I could not find overdue accounts older than ${agingDays} days in ${scopeLabel}.`,
          hi: `${scopeLabel} में ${agingDays} दिनों से अधिक पुराने बकाया खाते नहीं मिले।`,
          mr: `${scopeLabel} मध्ये ${agingDays} दिवसांपेक्षा जुनी थकीत खाती सापडली नाहीत.`,
        }),
      };
    }

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en: `Found ${results.length} stale accounts in ${scopeLabel} with aging payment history from ${sourceLabel}.`,
        hi: `${scopeLabel} में ${results.length} पुराने खाते मिले, जिनका भुगतान इतिहास पुराना है और डेटा ${sourceLabel} से आया है।`,
        mr: `${scopeLabel} मध्ये जुन्या पेमेंट इतिहासासह ${results.length} जुनी खाती सापडली असून डेटा ${sourceLabel} मधून आला आहे.`,
      }),
      intent: byLanguage(options.language, {
        en: `Stale overdue accounts older than ${agingDays} days in ${scopeLabel}`,
        hi: `${scopeLabel} में ${agingDays} दिनों से अधिक पुराने बकाया खाते`,
        mr: `${scopeLabel} मधील ${agingDays} दिवसांपेक्षा जुनी थकीत खाती`,
      }),
      explanation: byLanguage(options.language, {
        en: `These accounts still carry dues and either have no recorded payment or the last payment is older than ${agingDays} days.`,
        hi: `इन खातों पर अभी भी बकाया है और इनमें या तो कोई भुगतान दर्ज नहीं है या अंतिम भुगतान ${agingDays} दिनों से भी पुराना है।`,
        mr: `या खात्यांवर अजूनही थकबाकी आहे आणि त्यात पेमेंट नोंदलेले नाही किंवा शेवटचे पेमेंट ${agingDays} दिवसांपेक्षा जुने आहे.`,
      }),
      queryType: 'table',
      query: `SELECT property_id, owner_name, ward, zone, last_payment_date, ROUND(due_amount + water_tax_due + sewerage_tax_due + solid_waste_tax_due, 2) AS total_due_all_taxes, CAST(julianday('now') - julianday(last_payment_date) AS INTEGER) AS days_since_last_payment FROM properties WHERE 1 = 1${buildScopeSql(
        ward,
        zone
      )} AND (last_payment_date IS NULL OR date(last_payment_date) <= date('now', '-${agingDays} day')) AND (due_amount + water_tax_due + sewerage_tax_due + solid_waste_tax_due) > 0 ORDER BY days_since_last_payment DESC, total_due_all_taxes DESC LIMIT 25;`,
      results,
    });
  }

  return null;
}

function createDataResponse(
  input: Omit<ChatResponseData, 'resultCount'> & { reply: string }
): StructuredQueryResponse {
  return {
    reply: input.reply,
    data: {
      results: input.results,
      intent: input.intent,
      explanation: input.explanation,
      queryType: input.queryType,
      resultCount: input.results.length,
      query: input.query,
      source: input.source,
      dashboard: input.dashboard,
    },
  };
}

function buildPaymentStatusDistribution(
  properties: PropertyRecord[],
  language: AppLanguage
): Record<string, unknown>[] {
  const statusOrder: Array<PropertyRecord['payment_status']> = ['PAID', 'PARTIAL', 'UNPAID'];

  return statusOrder.map((status) => {
    const filtered = properties.filter((property) => property.payment_status === status);
    return {
      payment_status: localizePaymentStatus(status, language),
      property_count: filtered.length,
      total_due: round(sum(filtered.map((property) => property.total_due_all_taxes))),
    };
  });
}

function buildIntegratedTaxBreakdown(
  properties: PropertyRecord[],
  language: AppLanguage
): Record<string, unknown>[] {
  return [
    {
      tax_category: byLanguage(language, {
        en: 'Property Tax',
        hi: 'प्रॉपर्टी टैक्स',
        mr: 'मालमत्ता कर',
      }),
      outstanding_amount: round(sum(properties.map((property) => property.due_amount))),
    },
    {
      tax_category: byLanguage(language, {
        en: 'Water Tax',
        hi: 'जल कर',
        mr: 'पाणी कर',
      }),
      outstanding_amount: round(sum(properties.map((property) => property.water_tax_due))),
    },
    {
      tax_category: byLanguage(language, {
        en: 'Sewerage Tax',
        hi: 'सीवरेज कर',
        mr: 'सांडपाणी कर',
      }),
      outstanding_amount: round(sum(properties.map((property) => property.sewerage_tax_due))),
    },
    {
      tax_category: byLanguage(language, {
        en: 'Solid Waste Tax',
        hi: 'ठोस अपशिष्ट कर',
        mr: 'घनकचरा कर',
      }),
      outstanding_amount: round(
        sum(properties.map((property) => property.solid_waste_tax_due))
      ),
    },
  ];
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
      total_tax: round(sum(bucket.map((property) => property.tax_amount))),
      total_due: round(
        sum(bucket.map((property) => property.total_due_all_taxes))
      ),
      total_collected: round(
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

function buildCollectionEfficiencyReport(
  properties: PropertyRecord[],
  groupBy: 'ward' | 'zone'
): Record<string, unknown>[] {
  return buildCollectionReport(properties, groupBy)
    .map((row) => {
      const totalTax = Number(row.total_tax ?? 0);
      const totalCollected = Number(row.total_collected ?? 0);
      const totalDue = Number(row.total_due ?? 0);

      return {
        ...row,
        collection_efficiency_pct: totalTax > 0 ? round((totalCollected * 100) / totalTax) : 0,
        outstanding_ratio_pct: totalTax > 0 ? round((totalDue * 100) / totalTax) : 0,
      };
    })
    .sort(
      (left, right) =>
        Number(right.collection_efficiency_pct) - Number(left.collection_efficiency_pct)
    );
}

function buildOutstandingHotspotReport(
  properties: PropertyRecord[],
  groupBy: 'ward' | 'zone'
): Record<string, unknown>[] {
  return buildCollectionEfficiencyReport(properties, groupBy)
    .sort(
      (left, right) =>
        Number(right.total_due) - Number(left.total_due) ||
        Number(right.unpaid_count) - Number(left.unpaid_count)
    )
    .map((row, index) => ({
      rank: index + 1,
      ...row,
    }));
}

function buildRecoveryPriorityReport(
  properties: PropertyRecord[],
  language: AppLanguage
): Record<string, unknown>[] {
  return properties
    .filter((property) => property.total_due_all_taxes > 0)
    .map((property) => {
      const risk = calculateDefaulterRisk(property);
      const daysSincePayment = getDaysSincePayment(property.last_payment_date);
      const recoveryPriority = round(
        risk.risk_score +
          Math.min(40, property.total_due_all_taxes / 800) +
          Math.min(20, daysSincePayment / 30)
      );

      return {
        property_id: property.property_id,
        owner_name: property.owner_name,
        ward: property.ward,
        zone: property.zone,
        collection_officer: property.collection_officer,
        total_due_all_taxes: round(property.total_due_all_taxes),
        days_since_last_payment: daysSincePayment,
        risk_score: risk.risk_score,
        risk_band: localizeRiskBand(risk.risk_band, language),
        recovery_priority: recoveryPriority,
      };
    })
    .sort(
      (left, right) =>
        Number(right.recovery_priority) - Number(left.recovery_priority) ||
        Number(right.total_due_all_taxes) - Number(left.total_due_all_taxes)
    )
    .slice(0, 15);
}

function buildDefaultPredictionReport(
  properties: PropertyRecord[],
  language: AppLanguage
): Record<string, unknown>[] {
  return properties
    .map((property) => {
      const risk = calculateDefaulterRisk(property);
      const daysSincePayment = getDaysSincePayment(property.last_payment_date);
      const predictedLikelihood = calculateNextYearDefaultLikelihood(
        property,
        risk.risk_score,
        daysSincePayment
      );

      return {
        property_id: property.property_id,
        owner_name: property.owner_name,
        ward: property.ward,
        zone: property.zone,
        collection_officer: property.collection_officer,
        payment_status: localizePaymentStatus(property.payment_status, language),
        total_due_all_taxes: round(property.total_due_all_taxes),
        days_since_last_payment: daysSincePayment,
        risk_score: risk.risk_score,
        predicted_default_likelihood_pct: predictedLikelihood,
        prediction_signal: localizePredictionSignal(predictedLikelihood, language),
        key_risk_factors: risk.risk_reasons.slice(0, 2).join('; '),
      };
    })
    .sort(
      (left, right) =>
        Number(right.predicted_default_likelihood_pct) -
          Number(left.predicted_default_likelihood_pct) ||
        Number(right.total_due_all_taxes) - Number(left.total_due_all_taxes)
    )
    .slice(0, 12);
}

function buildPenaltyWaiverSimulationReport(
  properties: PropertyRecord[],
  language: AppLanguage,
  waiverPct: number
): Record<string, unknown>[] {
  const waiverRate = waiverPct / 100;
  const segments = new Map<
    string,
    {
      label: string;
      eligible_accounts: number;
      outstanding_before_waiver: number;
      estimated_recovery_without_waiver: number;
      estimated_recovery_with_waiver: number;
      estimated_waiver_cost: number;
    }
  >();

  for (const property of properties) {
    if (property.total_due_all_taxes <= 0 || property.payment_status === 'PAID') {
      continue;
    }

    const daysSincePayment = getDaysSincePayment(property.last_payment_date);
    const segmentKey = getPenaltySimulationSegmentKey(property, daysSincePayment);
    const segmentLabel = localizePenaltySimulationSegment(segmentKey, language);
    const bucket = segments.get(segmentKey) ?? {
      label: segmentLabel,
      eligible_accounts: 0,
      outstanding_before_waiver: 0,
      estimated_recovery_without_waiver: 0,
      estimated_recovery_with_waiver: 0,
      estimated_waiver_cost: 0,
    };
    const risk = calculateDefaulterRisk(property);
    const { baselineRate, waiverRateAfterUplift } = getPenaltyWaiverRecoveryRates(
      property,
      risk.risk_score,
      waiverRate,
      daysSincePayment
    );

    bucket.eligible_accounts += 1;
    bucket.outstanding_before_waiver += property.total_due_all_taxes;
    bucket.estimated_recovery_without_waiver +=
      property.total_due_all_taxes * baselineRate;
    bucket.estimated_recovery_with_waiver +=
      property.total_due_all_taxes * (1 - waiverRate) * waiverRateAfterUplift;
    bucket.estimated_waiver_cost += property.total_due_all_taxes * waiverRate;
    segments.set(segmentKey, bucket);
  }

  const rows = [...segments.entries()]
    .map(([segmentKey, bucket]) => {
      const netRecoveryUplift =
        bucket.estimated_recovery_with_waiver -
        bucket.estimated_recovery_without_waiver;

      return {
        segment: bucket.label,
        outstanding_before_waiver: round(bucket.outstanding_before_waiver),
        estimated_recovery_without_waiver: round(
          bucket.estimated_recovery_without_waiver
        ),
        estimated_recovery_with_waiver: round(
          bucket.estimated_recovery_with_waiver
        ),
        net_recovery_uplift: round(netRecoveryUplift),
        estimated_waiver_cost: round(bucket.estimated_waiver_cost),
        recovery_uplift_pct:
          bucket.estimated_recovery_without_waiver > 0
            ? round(
                (netRecoveryUplift * 100) /
                  bucket.estimated_recovery_without_waiver
              )
            : 0,
        eligible_accounts: bucket.eligible_accounts,
      };
    })
    .sort(
      (left, right) =>
        Number(right.estimated_recovery_with_waiver) -
          Number(left.estimated_recovery_with_waiver) ||
        Number(right.outstanding_before_waiver) -
          Number(left.outstanding_before_waiver)
    );

  if (rows.length === 0) {
    return [];
  }

  const totalRow = rows.reduce(
    (accumulator, row) => ({
      segment: byLanguage(language, {
        en: 'Total opportunity',
        hi: 'कुल अवसर',
        mr: 'एकूण संधी',
      }),
      outstanding_before_waiver:
        Number(accumulator.outstanding_before_waiver) +
        Number(row.outstanding_before_waiver),
      estimated_recovery_without_waiver:
        Number(accumulator.estimated_recovery_without_waiver) +
        Number(row.estimated_recovery_without_waiver),
      estimated_recovery_with_waiver:
        Number(accumulator.estimated_recovery_with_waiver) +
        Number(row.estimated_recovery_with_waiver),
      net_recovery_uplift:
        Number(accumulator.net_recovery_uplift) + Number(row.net_recovery_uplift),
      estimated_waiver_cost:
        Number(accumulator.estimated_waiver_cost) +
        Number(row.estimated_waiver_cost),
      recovery_uplift_pct: 0,
      eligible_accounts:
        Number(accumulator.eligible_accounts) + Number(row.eligible_accounts),
    }),
    {
      segment: '',
      outstanding_before_waiver: 0,
      estimated_recovery_without_waiver: 0,
      estimated_recovery_with_waiver: 0,
      net_recovery_uplift: 0,
      estimated_waiver_cost: 0,
      recovery_uplift_pct: 0,
      eligible_accounts: 0,
    }
  );

  totalRow.recovery_uplift_pct =
    Number(totalRow.estimated_recovery_without_waiver) > 0
      ? round(
          (Number(totalRow.net_recovery_uplift) * 100) /
            Number(totalRow.estimated_recovery_without_waiver)
        )
      : 0;

  return [...rows, totalRow].map((row) => ({
    ...row,
    outstanding_before_waiver: round(Number(row.outstanding_before_waiver)),
    estimated_recovery_without_waiver: round(
      Number(row.estimated_recovery_without_waiver)
    ),
    estimated_recovery_with_waiver: round(
      Number(row.estimated_recovery_with_waiver)
    ),
    net_recovery_uplift: round(Number(row.net_recovery_uplift)),
    estimated_waiver_cost: round(Number(row.estimated_waiver_cost)),
    recovery_uplift_pct: round(Number(row.recovery_uplift_pct)),
  }));
}

function buildCollectionTrendReport(
  properties: PropertyRecord[],
  granularity: 'month' | 'year'
): Record<string, unknown>[] {
  const grouped = new Map<string, PropertyRecord[]>();

  for (const property of properties) {
    if (!property.last_payment_date) {
      continue;
    }

    const paymentDate = new Date(property.last_payment_date);
    if (Number.isNaN(paymentDate.getTime())) {
      continue;
    }

    const key =
      granularity === 'month'
        ? property.last_payment_date.slice(0, 7)
        : property.last_payment_date.slice(0, 4);
    const bucket = grouped.get(key) ?? [];
    bucket.push(property);
    grouped.set(key, bucket);
  }

  const keyField = granularity === 'month' ? 'payment_month' : 'payment_year';

  return [...grouped.entries()]
    .map(([key, bucket]) => ({
      [keyField]: key,
      payment_events: bucket.length,
      collected_amount: round(
        sum(bucket.map((property) => Math.max(0, property.tax_amount - property.due_amount)))
      ),
      outstanding_due: round(
        sum(bucket.map((property) => property.total_due_all_taxes))
      ),
      paid_count: bucket.filter((property) => property.payment_status === 'PAID').length,
      partial_count: bucket.filter((property) => property.payment_status === 'PARTIAL').length,
      average_collection_per_payment:
        bucket.length > 0
          ? round(
              sum(
                bucket.map((property) =>
                  Math.max(0, property.tax_amount - property.due_amount)
                )
              ) / bucket.length
            )
          : 0,
    }))
    .sort((left, right) =>
      String(left[keyField]).localeCompare(String(right[keyField]))
    );
}

function buildTrendAnomalyReport(
  properties: PropertyRecord[],
  language: AppLanguage,
  months: number
): Record<string, unknown>[] {
  const recentTrend = buildCollectionTrendReport(properties, 'month').slice(
    -Math.max(3, months)
  );

  if (recentTrend.length === 0) {
    return [];
  }

  const averageCollected =
    sum(recentTrend.map((row) => Number(row.collected_amount ?? 0))) /
    recentTrend.length;

  return recentTrend.map((row, index) => {
    const previous = index > 0 ? recentTrend[index - 1] : null;
    const collectedAmount = Number(row.collected_amount ?? 0);
    const paymentEvents = Number(row.payment_events ?? 0);
    const outstandingDue = Number(row.outstanding_due ?? 0);
    const previousCollected = previous
      ? Number(previous.collected_amount ?? 0)
      : collectedAmount;
    const previousEvents = previous ? Number(previous.payment_events ?? 0) : paymentEvents;
    const previousOutstanding = previous
      ? Number(previous.outstanding_due ?? 0)
      : outstandingDue;

    const monthOnMonthChangePct =
      previous && previousCollected > 0
        ? round(((collectedAmount - previousCollected) * 100) / previousCollected)
        : 0;
    const paymentEventChangePct =
      previous && previousEvents > 0
        ? round(((paymentEvents - previousEvents) * 100) / previousEvents)
        : 0;
    const isAnomaly =
      Boolean(previous) &&
      (monthOnMonthChangePct <= -18 ||
        (collectedAmount < averageCollected * 0.72 &&
          paymentEventChangePct <= -10));
    const anomalyScore = previous
      ? round(
          clamp(
            Math.max(0, -monthOnMonthChangePct) * 1.4 +
              Math.max(0, -paymentEventChangePct) * 0.7 +
              (collectedAmount < averageCollected * 0.72 ? 10 : 0),
            0,
            100
          )
        )
      : 0;

    return {
      payment_month: row.payment_month,
      collected_amount: collectedAmount,
      outstanding_due: outstandingDue,
      payment_events: paymentEvents,
      month_on_month_change_pct: monthOnMonthChangePct,
      payment_event_change_pct: paymentEventChangePct,
      anomaly_score: anomalyScore,
      is_anomaly: isAnomaly,
      possible_reason: isAnomaly
        ? buildTrendAnomalyReason(
            language,
            paymentEventChangePct,
            outstandingDue,
            previousOutstanding
          )
        : byLanguage(language, {
            en: 'No sharp drop detected',
            hi: 'कोई तेज़ गिरावट नहीं मिली',
            mr: 'तीव्र घसरण आढळली नाही',
          }),
    };
  });
}

function buildOfficerPerformanceReport(
  properties: PropertyRecord[],
  language: AppLanguage
): Record<string, unknown>[] {
  const grouped = new Map<string, PropertyRecord[]>();

  for (const property of properties) {
    const officer = property.collection_officer || 'Unassigned Officer';
    const bucket = grouped.get(officer) ?? [];
    bucket.push(property);
    grouped.set(officer, bucket);
  }

  const rankedRows = [...grouped.entries()]
    .map(([collectionOfficer, bucket]) => {
      const totalTax = round(sum(bucket.map((property) => property.tax_amount)));
      const totalCollected = round(
        sum(bucket.map((property) => property.tax_amount - property.due_amount))
      );
      const totalDue = round(
        sum(bucket.map((property) => property.total_due_all_taxes))
      );
      const scoredAccounts = bucket.map((property) => calculateDefaulterRisk(property));
      const highRiskAccounts = scoredAccounts.filter(
        (risk) => risk.risk_score >= 70
      ).length;
      const averageRiskScore =
        scoredAccounts.length > 0
          ? round(
              sum(scoredAccounts.map((risk) => risk.risk_score)) / scoredAccounts.length
            )
          : 0;
      const assignedWards = [...new Set(bucket.map((property) => property.ward))]
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
        .join(', ');

      return {
        collection_officer: collectionOfficer,
        assigned_wards: assignedWards,
        total_properties: bucket.length,
        total_tax: totalTax,
        total_collected: totalCollected,
        total_due: totalDue,
        collection_efficiency_pct: totalTax > 0 ? round((totalCollected * 100) / totalTax) : 0,
        high_risk_accounts: highRiskAccounts,
        average_risk_score: averageRiskScore,
        paid_count: bucket.filter((property) => property.payment_status === 'PAID').length,
        unpaid_count: bucket.filter((property) => property.payment_status === 'UNPAID').length,
        partial_count: bucket.filter((property) => property.payment_status === 'PARTIAL').length,
        top_risk_band:
          highRiskAccounts > 0
            ? localizeRiskBand('High', language)
            : averageRiskScore >= 45
              ? localizeRiskBand('Medium', language)
              : localizeRiskBand('Low', language),
      };
    })
    .sort(
      (left, right) =>
        Number(right.collection_efficiency_pct) -
          Number(left.collection_efficiency_pct) ||
        Number(left.total_due) - Number(right.total_due)
    );

  const bestEfficiency = Number(rankedRows[0]?.collection_efficiency_pct ?? 0);

  return rankedRows.map((row, index) => ({
    rank: index + 1,
    ...row,
    efficiency_gap_pct: round(bestEfficiency - Number(row.collection_efficiency_pct)),
    performance_label: localizeOfficerPerformanceLabel(
      index,
      rankedRows.length,
      language
    ),
  }));
}

function buildStaleAccountReport(
  properties: PropertyRecord[],
  language: AppLanguage,
  agingDays: number
): Record<string, unknown>[] {
  return properties
    .filter((property) => {
      if (property.total_due_all_taxes <= 0) {
        return false;
      }

      const daysSincePayment = getDaysSincePayment(property.last_payment_date);
      return daysSincePayment >= agingDays;
    })
    .map((property) => {
      const risk = calculateDefaulterRisk(property);
      return {
        property_id: property.property_id,
        owner_name: property.owner_name,
        ward: property.ward,
        zone: property.zone,
        payment_status: localizePaymentStatus(property.payment_status, language),
        last_payment_date:
          property.last_payment_date ??
          byLanguage(language, {
            en: 'No payment recorded',
            hi: 'कोई भुगतान दर्ज नहीं है',
            mr: 'पेमेंट नोंदलेले नाही',
          }),
        days_since_last_payment: getDaysSincePayment(property.last_payment_date),
        total_due_all_taxes: round(property.total_due_all_taxes),
        risk_band: localizeRiskBand(risk.risk_band, language),
      };
    })
    .sort(
      (left, right) =>
        Number(right.days_since_last_payment) - Number(left.days_since_last_payment) ||
        Number(right.total_due_all_taxes) - Number(left.total_due_all_taxes)
    )
    .slice(0, 25);
}

function buildReassessmentSpikeReport(
  properties: PropertyRecord[],
  language: AppLanguage
): Record<string, unknown>[] {
  return properties
    .filter((property) => property.due_amount > 0)
    .map((property) => {
      const estimatedPreviousYearDue = estimatePreviousYearDueAmount(property);
      const dueIncreaseAmount = round(property.due_amount - estimatedPreviousYearDue);
      const dueIncreasePct =
        estimatedPreviousYearDue > 0
          ? round((dueIncreaseAmount * 100) / estimatedPreviousYearDue)
          : 0;
      const anomalyScore = round(
        clamp(dueIncreasePct * 0.9 + dueIncreaseAmount / 180, 0, 100)
      );

      return {
        property_id: property.property_id,
        owner_name: property.owner_name,
        ward: property.ward,
        zone: property.zone,
        estimated_previous_year_due: estimatedPreviousYearDue,
        due_amount: round(property.due_amount),
        due_increase_amount: dueIncreaseAmount,
        due_increase_pct: dueIncreasePct,
        anomaly_score: anomalyScore,
        needs_audit_review: dueIncreasePct >= 35 && dueIncreaseAmount >= 3500,
        possible_reason: buildReassessmentReason(
          property,
          dueIncreasePct,
          language
        ),
      };
    })
    .filter(
      (row) =>
        Boolean(row.needs_audit_review) &&
        Number(row.due_increase_pct) >= 35 &&
        Number(row.due_increase_amount) >= 3500
    )
    .sort(
      (left, right) =>
        Number(right.anomaly_score) - Number(left.anomaly_score) ||
        Number(right.due_increase_amount) - Number(left.due_increase_amount)
    )
    .slice(0, 15);
}

function buildDashboardReport(
  properties: PropertyRecord[],
  mapProperties: PropertyRecord[],
  scopeLabel: string,
  focusWard: string | null,
  language: AppLanguage
): {
  dashboard: DashboardData;
  tableRows: Record<string, unknown>[];
} | null {
  if (properties.length === 0) {
    return null;
  }

  const scoredProperties = properties
    .map((property) => ({
      property,
      risk: calculateDefaulterRisk(property),
    }))
    .sort(
      (left, right) =>
        right.property.total_due_all_taxes - left.property.total_due_all_taxes
    );

  const paidCount = properties.filter(
    (property) => property.payment_status === 'PAID'
  ).length;
  const outstandingCount = properties.length - paidCount;
  const highRiskCount = scoredProperties.filter(
    ({ risk }) => risk.risk_score >= 70
  ).length;
  const totalDue = round(
    sum(properties.map((property) => property.total_due_all_taxes))
  );
  const topAccount = scoredProperties[0]?.property;

  const tableRows = scoredProperties.map(({ property, risk }) => ({
    property_id: property.property_id,
    owner_name: property.owner_name,
    ward: property.ward,
    zone: property.zone,
    payment_status: localizePaymentStatus(property.payment_status, language),
    due_amount: round(property.due_amount),
    water_tax_due: round(property.water_tax_due),
    sewerage_tax_due: round(property.sewerage_tax_due),
    solid_waste_tax_due: round(property.solid_waste_tax_due),
    total_due_all_taxes: round(property.total_due_all_taxes),
    risk_score: risk.risk_score,
    risk_band: localizeRiskBand(risk.risk_band, language),
  }));

  const dashboard: DashboardData = {
    summaryCards: [
      {
        label: byLanguage(language, {
          en: 'Total Properties',
          hi: 'कुल संपत्तियां',
          mr: 'एकूण मालमत्ता',
        }),
        value: String(properties.length),
      },
      {
        label: byLanguage(language, {
          en: 'Outstanding Due',
          hi: 'कुल बकाया',
          mr: 'एकूण थकबाकी',
        }),
        value: formatCurrency(totalDue),
        tone: totalDue > 100000 ? 'critical' : 'warning',
      },
      {
        label: byLanguage(language, {
          en: 'Paid Accounts',
          hi: 'भुगतान पूर्ण खाते',
          mr: 'भरलेली खाती',
        }),
        value: String(paidCount),
        tone: 'positive',
      },
      {
        label: byLanguage(language, {
          en: 'High Risk',
          hi: 'उच्च जोखिम',
          mr: 'उच्च जोखीम',
        }),
        value: String(highRiskCount),
        tone: highRiskCount > 0 ? 'critical' : 'positive',
      },
    ],
    insights: [
      byLanguage(language, {
        en: `${scopeLabel} has ${properties.length} properties, with ${outstandingCount} accounts still carrying dues.`,
        hi: `${scopeLabel} में ${properties.length} संपत्तियां हैं, जिनमें ${outstandingCount} खातों पर अभी भी बकाया है।`,
        mr: `${scopeLabel} मध्ये ${properties.length} मालमत्ता आहेत आणि त्यापैकी ${outstandingCount} खात्यांवर अजूनही थकबाकी आहे.`,
      }),
      byLanguage(language, {
        en: `Integrated municipal dues total ${formatCurrency(totalDue)} across property, water, sewerage, and solid-waste taxes.`,
        hi: `प्रॉपर्टी, जल, सीवरेज और ठोस अपशिष्ट कर मिलाकर कुल देय राशि ${formatCurrency(totalDue)} है।`,
        mr: `मालमत्ता, पाणी, सांडपाणी आणि घनकचरा कर मिळून एकूण देय रक्कम ${formatCurrency(totalDue)} आहे.`,
      }),
      topAccount
        ? byLanguage(language, {
            en: `${highRiskCount} accounts are flagged high risk. The largest outstanding account belongs to ${topAccount.owner_name} at ${formatCurrency(
              topAccount.total_due_all_taxes
            )}.`,
            hi: `${highRiskCount} खाते उच्च जोखिम पर चिह्नित हैं। सबसे बड़ा बकाया खाता ${topAccount.owner_name} का है, जिसकी राशि ${formatCurrency(
              topAccount.total_due_all_taxes
            )} है।`,
            mr: `${highRiskCount} खाती उच्च जोखमीची आहेत. सर्वाधिक थकबाकीचे खाते ${topAccount.owner_name} यांचे असून रक्कम ${formatCurrency(
              topAccount.total_due_all_taxes
            )} आहे.`,
          })
        : byLanguage(language, {
            en: `No high-risk account stands out for ${scopeLabel}.`,
            hi: `${scopeLabel} के लिए कोई विशेष उच्च जोखिम खाता सामने नहीं आया।`,
            mr: `${scopeLabel} साठी वेगळे ठळक उच्च-जोखीम खाते दिसत नाही.`,
          }),
    ],
    tableTitle: byLanguage(language, {
      en: `Detailed property accounts in ${scopeLabel}`,
      hi: `${scopeLabel} के विस्तृत संपत्ति खाते`,
      mr: `${scopeLabel} मधील तपशीलवार मालमत्ता खाती`,
    }),
    barChart: {
      title: byLanguage(language, {
        en: `Top outstanding accounts in ${scopeLabel}`,
        hi: `${scopeLabel} के शीर्ष बकाया खाते`,
        mr: `${scopeLabel} मधील शीर्ष थकबाकी खाती`,
      }),
      data: scoredProperties.slice(0, 5).map(({ property }) => ({
        account: formatPropertyLabel(property.owner_name, property.property_id),
        outstanding_due: round(property.total_due_all_taxes),
      })),
      xKey: 'account',
      series: [
        {
          dataKey: 'outstanding_due',
          label: byLanguage(language, {
            en: 'Outstanding Due',
            hi: 'बकाया देय',
            mr: 'थकीत देय',
          }),
          color: '#2563eb',
        },
      ],
    },
    pieChart: {
      title: byLanguage(language, {
        en: `Paid vs unpaid in ${scopeLabel}`,
        hi: `${scopeLabel} में भुगतान पूर्ण बनाम बकाया`,
        mr: `${scopeLabel} मधील भरलेले विरुद्ध थकित`,
      }),
      data: [
        {
          name: byLanguage(language, {
            en: 'Paid',
            hi: 'भुगतान पूर्ण',
            mr: 'भरलेले',
          }),
          value: paidCount,
          color: '#10b981',
        },
        {
          name: byLanguage(language, {
            en: 'Unpaid / Partial',
            hi: 'अवैतनिक / आंशिक',
            mr: 'न भरलेले / आंशिक',
          }),
          value: outstandingCount,
          color: '#ef4444',
        },
      ],
    },
    map: buildWardHeatMapData(mapProperties, scopeLabel, focusWard, language),
  };

  return {
    dashboard,
    tableRows,
  };
}

function isIntegratedTaxQuery(normalizedQuery: string): boolean {
  return matchesAny(normalizedQuery, [
    'integrated tax',
    'other tax',
    'combined tax',
    'water tax',
    'sewerage tax',
    'solid waste tax',
  ]);
}

function isTopDefaultersQuery(normalizedQuery: string): boolean {
  return (
    normalizedQuery.includes('defaulter') &&
    (normalizedQuery.includes('top') ||
      normalizedQuery.includes('highest') ||
      normalizedQuery.includes('show top'))
  );
}

function isCollectionReportQuery(
  normalizedQuery: string,
  groupBy: 'ward' | 'zone'
): boolean {
  return matchesAny(normalizedQuery, [
    `${groupBy}-wise collection report`,
    `${groupBy} wise collection report`,
    `${groupBy} collection report`,
    `collection report by ${groupBy}`,
  ]);
}

function isDashboardQuery(normalizedQuery: string): boolean {
  return matchesAny(normalizedQuery, [
    'give full report',
    'full report',
    'auto dashboard',
    'dashboard report',
    'complete report',
    'executive summary',
    'management summary',
    'overall tax situation',
    'simple summary',
    'summarize the tax situation',
    'heatmap',
    'map visualization',
    'ward wise heatmap',
    'ward-wise heatmap',
  ]);
}

function isPredictiveRiskQuery(normalizedQuery: string): boolean {
  return matchesAny(normalizedQuery, [
    'predict high-risk defaulters',
    'predict high risk defaulters',
    'predict defaulters',
    'predictive defaulter',
    'risk defaulters',
    'ai-based defaulters',
    'ai based defaulters',
  ]);
}

function isPaymentDistributionQuery(normalizedQuery: string): boolean {
  return matchesAny(normalizedQuery, [
    'payment status distribution',
    'payment distribution chart',
    'payment status chart',
    'status distribution chart',
  ]);
}

function isCollectionEfficiencyQuery(normalizedQuery: string): boolean {
  if (isOfficerPerformanceQuery(normalizedQuery)) {
    return false;
  }

  return matchesAny(normalizedQuery, [
    'collection efficiency',
    'collection rate',
    'recovery efficiency',
    'efficiency by ward',
    'efficiency by zone',
  ]);
}

function isOutstandingHotspotQuery(normalizedQuery: string): boolean {
  return matchesAny(normalizedQuery, [
    'highest outstanding',
    'most outstanding',
    'highest unpaid',
    'most unpaid',
    'highest pending tax',
    'most pending tax',
    'outstanding hotspot',
    'which ward has the highest outstanding tax',
    'which zone has the highest outstanding tax',
  ]);
}

function isRecoveryPriorityQuery(normalizedQuery: string): boolean {
  return matchesAny(normalizedQuery, [
    'recovery priority',
    'priority recovery',
    'priority accounts',
    'priority defaulters',
    'follow up first',
    'which accounts should officers target first',
  ]);
}

function isTrendAnomalyQuery(normalizedQuery: string): boolean {
  return matchesAny(normalizedQuery, [
    'sudden drops',
    'flag months with sudden drops',
    'anomaly month',
    'anomaly months',
    'flag drop months',
    'month on month collection trend for last',
    'month-on-month collection trend for last',
  ]);
}

function isMonthlyTrendQuery(normalizedQuery: string): boolean {
  return matchesAny(normalizedQuery, [
    'monthly trend',
    'month wise trend',
    'month-wise trend',
    'monthly collection',
    'monthly recovery',
    'month on month',
    'payment trend by month',
  ]);
}

function isYearlyTrendQuery(normalizedQuery: string): boolean {
  return matchesAny(normalizedQuery, [
    'yearly trend',
    'annual trend',
    'year wise trend',
    'year-wise trend',
    'yearly collection',
    'yearly recovery',
    'year on year',
    'year-over-year',
  ]);
}

function isOfficerPerformanceQuery(normalizedQuery: string): boolean {
  return matchesAny(normalizedQuery, [
    'officer performance',
    'collection officer',
    'ward officer',
    'officer wise',
    'officer-wise',
    'best officer',
    'worst officer',
    'best and worst officer',
    'officer ranking',
    'leaderboard',
    'which officer performs best',
  ]);
}

function isDefaultPredictionQuery(normalizedQuery: string): boolean {
  return matchesAny(normalizedQuery, [
    'likely to default next year',
    'most likely to default',
    'default next year',
    'next year default',
    'future default',
    'future defaulter',
  ]);
}

function isPenaltyWaiverSimulationQuery(normalizedQuery: string): boolean {
  return (
    matchesAny(normalizedQuery, [
      'waive',
      'waiver',
      'penalty relief',
      'discount defaulters',
      'recovery simulation',
      'revenue could we recover',
      'estimated recovery',
    ]) && normalizedQuery.includes('penalty')
  );
}

function isReassessmentErrorQuery(normalizedQuery: string): boolean {
  return matchesAny(normalizedQuery, [
    'reassessment error',
    'reassessment errors',
    'due amount increased sharply',
    'increased sharply',
    'sharp due increase',
    'possible reassessment',
    'year on year due increase',
    'year-on-year due increase',
  ]);
}

function isStaleAccountQuery(normalizedQuery: string): boolean {
  return matchesAny(normalizedQuery, [
    'stale account',
    'stale accounts',
    'no recent payment',
    'old unpaid accounts',
    'aging payment history',
    'no payment in the last',
    'no payment since',
    'overdue accounts older than',
  ]);
}

function matchesAny(normalizedQuery: string, values: string[]): boolean {
  return values.some((value) => normalizedQuery.includes(value));
}

function determineGrouping(
  normalizedQuery: string,
  fallback: 'ward' | 'zone' = 'ward'
): 'ward' | 'zone' {
  if (normalizedQuery.includes('zone')) {
    return 'zone';
  }

  if (normalizedQuery.includes('ward')) {
    return 'ward';
  }

  return fallback;
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

function formatScopeLabel(
  ward: string | null,
  zone: string | null,
  fallback: string,
  language: AppLanguage
): string {
  const localizedWard = ward ? localizeAreaLabel(ward, language) : null;
  const localizedZone = zone ? localizeAreaLabel(zone, language) : null;

  if (ward && zone) {
    return `${localizedWard}, ${localizedZone}`;
  }

  if (ward) {
    return localizedWard ?? ward;
  }

  if (zone) {
    return localizedZone ?? zone;
  }

  return fallback;
}

function extractWard(userQuery: string): string | null {
  const match = userQuery.match(/\bward\s*(\d+)\b/i);
  return match ? `Ward ${match[1]}` : null;
}

function extractZone(userQuery: string): string | null {
  const match = userQuery.match(/\bzone(?:\s+|[-_]?)([abc])\b/i);
  return match ? `Zone ${match[1].toUpperCase()}` : null;
}

function extractPropertyId(userQuery: string): number | null {
  const match = userQuery.match(/\bproperty(?:\s+id)?\s*(\d+)\b/i);
  return match ? Number(match[1]) : null;
}

function extractTopLimit(userQuery: string): number | null {
  const match = userQuery.match(/\btop\s+(\d+)\b/i);
  return match ? Number(match[1]) : null;
}

function extractAgingDays(userQuery: string): number {
  const yearMatch = userQuery.match(/\b(\d+)\s+year/gi);
  if (yearMatch) {
    const value = Number(yearMatch[0].match(/\d+/)?.[0] ?? 1);
    return value * 365;
  }

  const monthMatch = userQuery.match(/\b(\d+)\s+month/gi);
  if (monthMatch) {
    const value = Number(monthMatch[0].match(/\d+/)?.[0] ?? 6);
    return value * 30;
  }

  const dayMatch = userQuery.match(/\b(\d+)\s+day/gi);
  if (dayMatch) {
    return Number(dayMatch[0].match(/\d+/)?.[0] ?? 180);
  }

  if (userQuery.toLowerCase().includes('last year')) {
    return 365;
  }

  if (userQuery.toLowerCase().includes('last 6 months')) {
    return 180;
  }

  return 180;
}

function extractMonthWindow(userQuery: string): number {
  const monthMatch = userQuery.match(/\b(\d+)\s+months?\b/i);
  if (monthMatch) {
    return clamp(Number(monthMatch[1]), 3, 24);
  }

  return 12;
}

function extractWaiverPercent(userQuery: string): number {
  const percentageMatch = userQuery.match(/\b(\d+(?:\.\d+)?)\s*(?:%|percent)\b/i);
  if (percentageMatch) {
    return clamp(Number(percentageMatch[1]), 1, 50);
  }

  return 10;
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

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function sum(values: number[]): number {
  return values.reduce((total, current) => total + current, 0);
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatCurrency(value: number): string {
  return `INR ${value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function localizeGroupingLabel(
  groupBy: 'ward' | 'zone',
  language: AppLanguage
): string {
  if (groupBy === 'ward') {
    return byLanguage(language, {
      en: 'Ward',
      hi: 'वार्ड',
      mr: 'वॉर्ड',
    });
  }

  return byLanguage(language, {
    en: 'Zone',
    hi: 'ज़ोन',
    mr: 'झोन',
  });
}

function localizeAreaLabel(value: string, language: AppLanguage): string {
  if (/^Ward\s+\d+$/i.test(value)) {
    const suffix = value.replace(/^Ward\s+/i, '');
    return `${localizeGroupingLabel('ward', language)} ${suffix}`;
  }

  if (/^Zone\s+[A-Z]$/i.test(value)) {
    const suffix = value.replace(/^Zone\s+/i, '');
    return `${localizeGroupingLabel('zone', language)} ${suffix}`;
  }

  return value;
}

function getDaysSincePayment(lastPaymentDate: string | null): number {
  if (!lastPaymentDate) {
    return 999;
  }

  const parsedDate = new Date(lastPaymentDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return 999;
  }

  return Math.max(
    0,
    Math.floor((Date.now() - parsedDate.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function formatPropertyLabel(ownerName: string, propertyId: number): string {
  const trimmedOwnerName = ownerName.trim();
  const shortenedName =
    trimmedOwnerName.length > 16
      ? `${trimmedOwnerName.slice(0, 16)}...`
      : trimmedOwnerName;

  return `${shortenedName} #${propertyId}`;
}

function calculateNextYearDefaultLikelihood(
  property: PropertyRecord,
  riskScore: number,
  daysSincePayment: number
): number {
  let likelihood =
    riskScore * 0.72 +
    Math.min(14, property.total_due_all_taxes / 1800) +
    Math.min(10, daysSincePayment / 45);

  if (property.payment_status === 'UNPAID') {
    likelihood += 12;
  } else if (property.payment_status === 'PARTIAL') {
    likelihood += 4;
  } else {
    likelihood -= 20;
  }

  if (property.payment_status === 'PAID' && daysSincePayment <= 120) {
    likelihood -= 12;
  }

  if (property.total_due_all_taxes >= 25000) {
    likelihood += 6;
  }

  return round(clamp(likelihood, 5, 97));
}

function localizePredictionSignal(
  predictedLikelihood: number,
  language: AppLanguage
): string {
  if (predictedLikelihood >= 80) {
    return byLanguage(language, {
      en: 'Immediate intervention',
      hi: 'तुरंत हस्तक्षेप',
      mr: 'तातडीचा हस्तक्षेप',
    });
  }

  if (predictedLikelihood >= 60) {
    return byLanguage(language, {
      en: 'Watch closely',
      hi: 'करीबी निगरानी',
      mr: 'बारकाईने लक्ष ठेवा',
    });
  }

  return byLanguage(language, {
    en: 'Monitor',
    hi: 'निगरानी रखें',
    mr: 'निरीक्षण ठेवा',
  });
}

function getPenaltySimulationSegmentKey(
  property: PropertyRecord,
  daysSincePayment: number
): string {
  if (property.payment_status === 'PARTIAL') {
    return 'partial_accounts';
  }

  if (daysSincePayment <= 180) {
    return 'recent_unpaid';
  }

  if (daysSincePayment <= 365) {
    return 'aging_unpaid';
  }

  return 'stale_unpaid';
}

function localizePenaltySimulationSegment(
  segmentKey: string,
  language: AppLanguage
): string {
  switch (segmentKey) {
    case 'partial_accounts':
      return byLanguage(language, {
        en: 'Partial accounts',
        hi: 'आंशिक भुगतान खाते',
        mr: 'आंशिक पेमेंट खाती',
      });
    case 'recent_unpaid':
      return byLanguage(language, {
        en: 'Recent unpaid accounts',
        hi: 'हालिया अवैतनिक खाते',
        mr: 'अलीकडील थकीत खाती',
      });
    case 'aging_unpaid':
      return byLanguage(language, {
        en: 'Aging unpaid accounts',
        hi: 'पुराने अवैतनिक खाते',
        mr: 'जुनी थकीत खाती',
      });
    default:
      return byLanguage(language, {
        en: 'Stale unpaid accounts',
        hi: 'लंबे समय से अवैतनिक खाते',
        mr: 'जुनी थकीत खाती',
      });
  }
}

function getPenaltyWaiverRecoveryRates(
  property: PropertyRecord,
  riskScore: number,
  waiverRate: number,
  daysSincePayment: number
): { baselineRate: number; waiverRateAfterUplift: number } {
  let baselineRate =
    property.payment_status === 'PARTIAL'
      ? 0.42
      : daysSincePayment <= 180
        ? 0.27
        : daysSincePayment <= 365
          ? 0.18
          : 0.11;

  if (riskScore < 45) {
    baselineRate += 0.08;
  } else if (riskScore < 70) {
    baselineRate += 0.04;
  } else {
    baselineRate -= 0.02;
  }

  if (property.total_due_all_taxes >= 25000) {
    baselineRate -= 0.04;
  }

  baselineRate = clamp(baselineRate, 0.05, 0.62);

  let uplift =
    property.payment_status === 'PARTIAL'
      ? 0.15
      : daysSincePayment <= 180
        ? 0.17
        : daysSincePayment <= 365
          ? 0.12
          : 0.08;

  uplift *= clamp(waiverRate / 0.1, 0.4, 2);

  const waiverRateAfterUplift = clamp(baselineRate + uplift, 0.08, 0.82);
  return {
    baselineRate: round(baselineRate),
    waiverRateAfterUplift: round(waiverRateAfterUplift),
  };
}

function buildTrendAnomalyReason(
  language: AppLanguage,
  paymentEventChangePct: number,
  outstandingDue: number,
  previousOutstanding: number
): string {
  if (paymentEventChangePct <= -15) {
    return byLanguage(language, {
      en: 'Fewer accounts made payments than in the previous month.',
      hi: 'पिछले महीने की तुलना में कम खातों ने भुगतान किया।',
      mr: 'मागील महिन्याच्या तुलनेत कमी खात्यांनी पेमेंट केले.',
    });
  }

  if (outstandingDue > previousOutstanding * 1.08) {
    return byLanguage(language, {
      en: 'Outstanding dues rose while collections softened.',
      hi: 'कलेक्शन घटा जबकि बकाया देय बढ़ा।',
      mr: 'वसुली कमी झाली तर थकबाकी वाढली.',
    });
  }

  return byLanguage(language, {
    en: 'Collections fell faster than the recent monthly baseline.',
    hi: 'कलेक्शन हालिया मासिक बेसलाइन से अधिक तेज़ी से गिरा।',
    mr: 'वसुली अलीकडील मासिक बेसलाइनपेक्षा अधिक वेगाने घसरली.',
  });
}

function localizeOfficerPerformanceLabel(
  index: number,
  totalRows: number,
  language: AppLanguage
): string {
  if (index === 0) {
    return byLanguage(language, {
      en: 'Best performer',
      hi: 'सर्वश्रेष्ठ प्रदर्शन',
      mr: 'सर्वोत्तम कामगिरी',
    });
  }

  if (index === totalRows - 1) {
    return byLanguage(language, {
      en: 'Needs support',
      hi: 'सहायता की जरूरत',
      mr: 'अधिक सहाय्याची गरज',
    });
  }

  return byLanguage(language, {
    en: 'Steady portfolio',
    hi: 'स्थिर पोर्टफोलियो',
    mr: 'स्थिर पोर्टफोलिओ',
  });
}

function estimatePreviousYearDueAmount(property: PropertyRecord): number {
  if (property.due_amount <= 0) {
    return 0;
  }

  const paymentBehaviorFactor =
    property.payment_status === 'UNPAID'
      ? 0.72
      : property.payment_status === 'PARTIAL'
        ? 0.64
        : 0.38;
  const historicalVariation = 0.58 + ((property.property_id % 6) * 0.06);
  const zoneAdjustment =
    property.zone === 'Zone C' ? 1.03 : property.zone === 'Zone B' ? 0.98 : 0.94;
  const estimated = property.due_amount * paymentBehaviorFactor * historicalVariation * zoneAdjustment;

  return round(Math.min(property.due_amount * 0.92, Math.max(0, estimated)));
}

function buildReassessmentReason(
  property: PropertyRecord,
  dueIncreasePct: number,
  language: AppLanguage
): string {
  if (dueIncreasePct >= 75) {
    return byLanguage(language, {
      en: 'Current due is far above the prior-year baseline. Verify reassessment inputs or duplicate billing.',
      hi: 'वर्तमान देय राशि पिछले वर्ष के बेसलाइन से बहुत अधिक है। पुनर्मूल्यांकन इनपुट या डुप्लिकेट बिलिंग की जांच करें।',
      mr: 'सध्याची देय रक्कम मागील वर्षाच्या बेसलाइनपेक्षा खूप जास्त आहे. पुनर्मूल्यांकन इनपुट किंवा डुप्लिकेट बिलिंग तपासा.',
    });
  }

  if (property.payment_status === 'UNPAID') {
    return byLanguage(language, {
      en: 'Due growth is unusually high even after accounting for unpaid behavior. Review reassessment notes.',
      hi: 'अवैतनिक व्यवहार को ध्यान में रखने के बाद भी देय वृद्धि असामान्य रूप से अधिक है। पुनर्मूल्यांकन नोट्स की समीक्षा करें।',
      mr: 'थकित वर्तनाचा विचार करूनही देय वाढ असामान्यपणे जास्त आहे. पुनर्मूल्यांकन नोंदी तपासा.',
    });
  }

  return byLanguage(language, {
    en: 'Due jumped beyond the expected payment-behavior baseline and should be audited.',
    hi: 'देय राशि अपेक्षित भुगतान-बेसलाइन से अधिक बढ़ी है और इसकी ऑडिट जांच होनी चाहिए।',
    mr: 'देय रक्कम अपेक्षित पेमेंट-बेसलाइनपेक्षा जास्त वाढली असून तिची तपासणी करावी.',
  });
}

function getMapSourceProperties(
  allProperties: PropertyRecord[],
  ward: string | null,
  zone: string | null
) {
  if (zone && !ward) {
    return allProperties.filter((property) => property.zone === zone);
  }

  return allProperties;
}

function buildWardHeatMapData(
  properties: PropertyRecord[],
  scopeLabel: string,
  focusWard: string | null,
  language: AppLanguage
): NonNullable<DashboardData['map']> {
  const grouped = new Map<
    string,
    {
      pendingTax: number;
      totalProperties: number;
    }
  >();

  for (const property of properties) {
    const current = grouped.get(property.ward) ?? {
      pendingTax: 0,
      totalProperties: 0,
    };

    current.pendingTax += property.total_due_all_taxes;
    current.totalProperties += 1;
    grouped.set(property.ward, current);
  }

  const wards = [...grouped.entries()]
    .map(([wardName, totals], index) => {
      const coordinates = getWardCoordinates(wardName, index);

      return {
        ward: wardName,
        lat: coordinates[0],
        lng: coordinates[1],
        pendingTax: round(totals.pendingTax),
        totalProperties: totals.totalProperties,
        isFocus: focusWard === wardName,
      };
    })
    .sort((left, right) => left.ward.localeCompare(right.ward, undefined, { numeric: true }));

  const center = calculateMapCenter(wards);

  return {
    title: byLanguage(language, {
      en: 'Ward-wise pending tax heatmap',
      hi: 'वार्ड-वार बकाया कर हीटमैप',
      mr: 'वॉर्डनिहाय थकीत कर हीटमॅप',
    }),
    subtitle: focusWard
      ? byLanguage(language, {
          en: `Red areas indicate higher pending tax across all wards. ${focusWard} is highlighted for comparison.`,
          hi: `लाल क्षेत्र सभी वार्डों में अधिक बकाया कर दिखाते हैं। तुलना के लिए ${localizeAreaLabel(
            focusWard,
            language
          )} को हाइलाइट किया गया है।`,
          mr: `लाल भाग सर्व वॉर्डांतील जास्त थकीत कर दर्शवतात. तुलनेसाठी ${localizeAreaLabel(
            focusWard,
            language
          )} हायलाइट केला आहे.`,
        })
      : byLanguage(language, {
          en: `Red areas indicate higher pending tax across ${scopeLabel}.`,
          hi: `लाल क्षेत्र ${scopeLabel} में अधिक बकाया कर दिखाते हैं।`,
          mr: `लाल भाग ${scopeLabel} मधील जास्त थकीत कर दर्शवतात.`,
        }),
    center,
    zoom: 13,
    wards,
  };
}

const DEFAULT_WARD_CENTER: [number, number] = [18.521, 73.857];

function getWardCoordinates(ward: string, index = 0): [number, number] {
  const wardCoordinates: Record<string, [number, number]> = {
    'Ward 1': [18.536, 73.847],
    'Ward 2': [18.531, 73.862],
    'Ward 3': [18.525, 73.878],
    'Ward 4': [18.514, 73.869],
    'Ward 5': [18.518, 73.849],
  };

  const knownCoordinates = wardCoordinates[ward];

  if (knownCoordinates) {
    return knownCoordinates;
  }

  const angle = (index % 8) * (Math.PI / 4);
  const distance = 0.007 + Math.floor(index / 8) * 0.004;

  return [
    roundCoordinate(DEFAULT_WARD_CENTER[0] + Math.sin(angle) * distance),
    roundCoordinate(DEFAULT_WARD_CENTER[1] + Math.cos(angle) * distance),
  ];
}

function calculateMapCenter(
  wards: Array<{ lat: number; lng: number }>
): [number, number] {
  if (wards.length === 0) {
    return DEFAULT_WARD_CENTER;
  }

  const totals = wards.reduce(
    (current, ward) => {
      current.lat += ward.lat;
      current.lng += ward.lng;
      return current;
    },
    { lat: 0, lng: 0 }
  );

  return [totals.lat / wards.length, totals.lng / wards.length];
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(6));
}

function getSourceLabel(source: DataSource, language: AppLanguage): string {
  if (source === 'database') {
    return byLanguage(language, {
      en: 'the live SQLite database',
      hi: 'लाइव SQLite डेटाबेस',
      mr: 'लाइव्ह SQLite डेटाबेस',
    });
  }

  return byLanguage(language, {
    en: 'the bundled demo dataset',
    hi: 'बंडल किए गए डेमो डेटा',
    mr: 'बंडल केलेला डेमो डेटा',
  });
}

function localizePaymentStatus(
  status: PropertyRecord['payment_status'],
  language: AppLanguage
): string {
  if (status === 'PAID') {
    return byLanguage(language, {
      en: 'Paid',
      hi: 'भुगतान पूर्ण',
      mr: 'भरलेले',
    });
  }

  if (status === 'PARTIAL') {
    return byLanguage(language, {
      en: 'Partial',
      hi: 'आंशिक',
      mr: 'आंशिक',
    });
  }

  return byLanguage(language, {
    en: 'Unpaid',
    hi: 'अवैतनिक',
    mr: 'न भरलेले',
  });
}

function localizeRiskBand(riskBand: 'Low' | 'Medium' | 'High', language: AppLanguage) {
  if (riskBand === 'High') {
    return byLanguage(language, {
      en: 'High',
      hi: 'उच्च',
      mr: 'उच्च',
    });
  }

  if (riskBand === 'Medium') {
    return byLanguage(language, {
      en: 'Medium',
      hi: 'मध्यम',
      mr: 'मध्यम',
    });
  }

  return byLanguage(language, {
    en: 'Low',
    hi: 'निम्न',
    mr: 'कमी',
  });
}

function byLanguage<T>(
  language: AppLanguage,
  values: Record<AppLanguage, T>
): T {
  return values[language];
}
