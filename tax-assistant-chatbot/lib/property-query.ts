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
      en: 'Hello! You can ask about payment status, integrated taxes, predictive defaulters, or analytics charts.',
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
  const scopeLabel = formatScopeLabel(ward, zone, 'all areas');
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
          hi: `I could not build a dashboard for ${scopeLabel} because no matching properties were found.`,
          mr: `I could not build a dashboard for ${scopeLabel} because no matching properties were found.`,
        }),
      };
    }

    return createDataResponse({
      source: options.source,
      reply: byLanguage(options.language, {
        en: `Auto Dashboard Mode is ready for ${scopeLabel}.`,
        hi: `Auto Dashboard Mode is ready for ${scopeLabel}.`,
        mr: `Auto Dashboard Mode is ready for ${scopeLabel}.`,
      }),
      intent: byLanguage(options.language, {
        en: `Full dashboard report for ${scopeLabel}`,
        hi: `Full dashboard report for ${scopeLabel}`,
        mr: `Full dashboard report for ${scopeLabel}`,
      }),
      explanation: byLanguage(options.language, {
        en: 'This mini dashboard combines summary KPIs, a top outstanding accounts bar chart, a paid-vs-unpaid pie chart, a Leaflet ward heatmap, and the detailed property table in one response.',
        hi: 'This mini dashboard combines summary KPIs, a top outstanding accounts bar chart, a paid-vs-unpaid pie chart, a Leaflet ward heatmap, and the detailed property table in one response.',
        mr: 'This mini dashboard combines summary KPIs, a top outstanding accounts bar chart, a paid-vs-unpaid pie chart, a Leaflet ward heatmap, and the detailed property table in one response.',
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
        label: 'Total Properties',
        value: String(properties.length),
      },
      {
        label: 'Outstanding Due',
        value: formatCurrency(totalDue),
        tone: totalDue > 100000 ? 'critical' : 'warning',
      },
      {
        label: 'Paid Accounts',
        value: String(paidCount),
        tone: 'positive',
      },
      {
        label: 'High Risk',
        value: String(highRiskCount),
        tone: highRiskCount > 0 ? 'critical' : 'positive',
      },
    ],
    insights: [
      `${scopeLabel} has ${properties.length} properties, with ${outstandingCount} accounts still carrying dues.`,
      `Integrated municipal dues total ${formatCurrency(totalDue)} across property, water, sewerage, and solid-waste taxes.`,
      topAccount
        ? `${highRiskCount} accounts are flagged high risk. The largest outstanding account belongs to ${topAccount.owner_name} at ${formatCurrency(
            topAccount.total_due_all_taxes
          )}.`
        : `No high-risk account stands out for ${scopeLabel}.`,
    ],
    tableTitle: `Detailed property accounts in ${scopeLabel}`,
    barChart: {
      title: `Top outstanding accounts in ${scopeLabel}`,
      data: scoredProperties.slice(0, 5).map(({ property }) => ({
        account: formatPropertyLabel(property.owner_name, property.property_id),
        outstanding_due: round(property.total_due_all_taxes),
      })),
      xKey: 'account',
      series: [
        {
          dataKey: 'outstanding_due',
          label: 'Outstanding Due',
          color: '#2563eb',
        },
      ],
    },
    pieChart: {
      title: `Paid vs unpaid in ${scopeLabel}`,
      data: [
        {
          name: byLanguage(language, {
            en: 'Paid',
            hi: 'Paid',
            mr: 'Paid',
          }),
          value: paidCount,
          color: '#10b981',
        },
        {
          name: byLanguage(language, {
            en: 'Unpaid / Partial',
            hi: 'Unpaid / Partial',
            mr: 'Unpaid / Partial',
          }),
          value: outstandingCount,
          color: '#ef4444',
        },
      ],
    },
    map: buildWardHeatMapData(mapProperties, scopeLabel, focusWard),
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

function matchesAny(normalizedQuery: string, values: string[]): boolean {
  return values.some((value) => normalizedQuery.includes(value));
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

function extractTopLimit(userQuery: string): number | null {
  const match = userQuery.match(/\btop\s+(\d+)\b/i);
  return match ? Number(match[1]) : null;
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

function formatCurrency(value: number): string {
  return `INR ${value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatPropertyLabel(ownerName: string, propertyId: number): string {
  const trimmedOwnerName = ownerName.trim();
  const shortenedName =
    trimmedOwnerName.length > 16
      ? `${trimmedOwnerName.slice(0, 16)}...`
      : trimmedOwnerName;

  return `${shortenedName} #${propertyId}`;
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
  focusWard: string | null
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
    .map(([wardName, totals]) => {
      const coordinates = getWardCoordinates(wardName);

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
    title: 'Ward-wise pending tax heatmap',
    subtitle: focusWard
      ? `Red areas indicate higher pending tax across all wards. ${focusWard} is highlighted for comparison.`
      : `Red areas indicate higher pending tax across ${scopeLabel}.`,
    center,
    zoom: 13,
    wards,
  };
}

function getWardCoordinates(ward: string): [number, number] {
  const wardCoordinates: Record<string, [number, number]> = {
    'Ward 1': [18.536, 73.847],
    'Ward 2': [18.531, 73.862],
    'Ward 3': [18.525, 73.878],
    'Ward 4': [18.514, 73.869],
    'Ward 5': [18.518, 73.849],
  };

  return wardCoordinates[ward] ?? [18.521, 73.857];
}

function calculateMapCenter(
  wards: Array<{ lat: number; lng: number }>
): [number, number] {
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
