import { AppLanguage } from './language';

interface InterfaceLabels {
  noResultsTitle: string;
  noResultsDescription: string;
  noDataToDisplay: string;
  noDataToVisualize: string;
  demoData: string;
  export: string;
  exporting: string;
  exportAsPdf: string;
  exportAsExcel: string;
  exportReadyTitle: (format: 'pdf' | 'excel') => string;
  exportReadyDescription: string;
  exportFailedTitle: string;
  viewAnalyticsLogic: string;
  viewGeneratedQuery: string;
  distribution: string;
  averageLabel: string;
  summaryInsights: string;
  previous: string;
  next: string;
  yes: string;
  no: string;
  processingQuery: string;
  updatingLanguage: string;
  highestPendingWard: string;
  wardsVisible: string;
  totalPendingTax: string;
  averagePerWard: string;
  heatScale: string;
  low: string;
  high: string;
  heatScaleHint: string;
  focus: string;
  focusHint: string;
  pendingTax: string;
  propertiesCovered: string;
  highlightedReportArea: string;
  recordsFound: (count: number) => string;
  showingResults: (start: number, end: number, total: number) => string;
  viewDetailedData: (count: number) => string;
}

const INTERFACE_LABELS: Record<AppLanguage, InterfaceLabels> = {
  en: {
    noResultsTitle: 'No results found',
    noResultsDescription: 'Try adjusting your query parameters',
    noDataToDisplay: 'No data to display',
    noDataToVisualize: 'No data to visualize',
    demoData: 'Demo data',
    export: 'Export',
    exporting: 'Exporting...',
    exportAsPdf: 'Export as PDF',
    exportAsExcel: 'Export as Excel',
    exportReadyTitle: (format) => `${format.toUpperCase()} export ready`,
    exportReadyDescription: 'Your download should start automatically.',
    exportFailedTitle: 'Export failed',
    viewAnalyticsLogic: 'View Analytics Logic',
    viewGeneratedQuery: 'View Generated Query',
    distribution: 'Distribution',
    averageLabel: 'Avg',
    summaryInsights: 'Summary Insights',
    previous: 'Previous',
    next: 'Next',
    yes: 'Yes',
    no: 'No',
    processingQuery: 'Processing your query...',
    updatingLanguage: 'Updating the current conversation language...',
    highestPendingWard: 'Highest Pending Ward',
    wardsVisible: 'Wards Visible',
    totalPendingTax: 'Total Pending Tax',
    averagePerWard: 'Average Per Ward',
    heatScale: 'Heat Scale',
    low: 'Low',
    high: 'High',
    heatScaleHint:
      'Larger glowing markers mean more pending tax. Ward tags show live dues.',
    focus: 'Focus',
    focusHint: 'Dark outline marks the active report ward.',
    pendingTax: 'Pending tax',
    propertiesCovered: 'Properties covered',
    highlightedReportArea: 'Highlighted report area',
    recordsFound: (count) => `${count} records found`,
    showingResults: (start, end, total) =>
      `Showing ${start} to ${end} of ${total} results`,
    viewDetailedData: (count) => `View Detailed Data (${count} records)`,
  },
  hi: {
    noResultsTitle: 'कोई परिणाम नहीं मिला',
    noResultsDescription: 'कृपया अपने प्रश्न के मान बदलकर फिर प्रयास करें',
    noDataToDisplay: 'दिखाने के लिए कोई डेटा नहीं है',
    noDataToVisualize: 'दृश्य रूप में दिखाने के लिए कोई डेटा नहीं है',
    demoData: 'डेमो डेटा',
    export: 'एक्सपोर्ट',
    exporting: 'एक्सपोर्ट हो रहा है...',
    exportAsPdf: 'PDF में एक्सपोर्ट करें',
    exportAsExcel: 'Excel में एक्सपोर्ट करें',
    exportReadyTitle: (format) =>
      format === 'pdf' ? 'PDF एक्सपोर्ट तैयार है' : 'Excel एक्सपोर्ट तैयार है',
    exportReadyDescription: 'आपका डाउनलोड अपने आप शुरू होना चाहिए।',
    exportFailedTitle: 'एक्सपोर्ट विफल हुआ',
    viewAnalyticsLogic: 'विश्लेषण लॉजिक देखें',
    viewGeneratedQuery: 'जनरेट की गई क्वेरी देखें',
    distribution: 'वितरण',
    averageLabel: 'औसत',
    summaryInsights: 'मुख्य अंतर्दृष्टियां',
    previous: 'पिछला',
    next: 'अगला',
    yes: 'हाँ',
    no: 'नहीं',
    processingQuery: 'आपके प्रश्न पर काम हो रहा है...',
    updatingLanguage: 'मौजूदा बातचीत की भाषा अपडेट की जा रही है...',
    highestPendingWard: 'सबसे अधिक बकाया वाला वार्ड',
    wardsVisible: 'दिख रहे वार्ड',
    totalPendingTax: 'कुल बकाया कर',
    averagePerWard: 'प्रति वार्ड औसत',
    heatScale: 'हीट स्केल',
    low: 'कम',
    high: 'अधिक',
    heatScaleHint:
      'बड़े चमकदार मार्कर अधिक बकाया कर दिखाते हैं। वार्ड टैग लाइव बकाया राशि दिखाते हैं।',
    focus: 'फोकस',
    focusHint: 'गहरी आउटलाइन सक्रिय रिपोर्ट वाले वार्ड को दिखाती है।',
    pendingTax: 'बकाया कर',
    propertiesCovered: 'कवर की गई संपत्तियां',
    highlightedReportArea: 'हाइलाइट किया गया रिपोर्ट क्षेत्र',
    recordsFound: (count) => `${count} रिकॉर्ड मिले`,
    showingResults: (start, end, total) =>
      `${total} में से ${start} से ${end} परिणाम दिखाए जा रहे हैं`,
    viewDetailedData: (count) => `विस्तृत डेटा देखें (${count} रिकॉर्ड)`,
  },
  mr: {
    noResultsTitle: 'कोणतेही निकाल सापडले नाहीत',
    noResultsDescription: 'कृपया तुमचे क्वेरी पॅरामीटर्स बदलून पुन्हा प्रयत्न करा',
    noDataToDisplay: 'दाखवण्यासाठी डेटा उपलब्ध नाही',
    noDataToVisualize: 'दृश्यरूपात दाखवण्यासाठी डेटा उपलब्ध नाही',
    demoData: 'डेमो डेटा',
    export: 'एक्सपोर्ट',
    exporting: 'एक्सपोर्ट सुरू आहे...',
    exportAsPdf: 'PDF मध्ये एक्सपोर्ट करा',
    exportAsExcel: 'Excel मध्ये एक्सपोर्ट करा',
    exportReadyTitle: (format) =>
      format === 'pdf' ? 'PDF एक्सपोर्ट तयार आहे' : 'Excel एक्सपोर्ट तयार आहे',
    exportReadyDescription: 'तुमचा डाउनलोड आपोआप सुरू झाला पाहिजे.',
    exportFailedTitle: 'एक्सपोर्ट अयशस्वी झाला',
    viewAnalyticsLogic: 'विश्लेषण लॉजिक पहा',
    viewGeneratedQuery: 'निर्माण केलेली क्वेरी पहा',
    distribution: 'वितरण',
    averageLabel: 'सरासरी',
    summaryInsights: 'मुख्य निरीक्षणे',
    previous: 'मागील',
    next: 'पुढील',
    yes: 'होय',
    no: 'नाही',
    processingQuery: 'तुमच्या प्रश्नावर प्रक्रिया सुरू आहे...',
    updatingLanguage: 'सध्याच्या संभाषणाची भाषा अपडेट होत आहे...',
    highestPendingWard: 'सर्वाधिक थकबाकी असलेला वॉर्ड',
    wardsVisible: 'दिसणारे वॉर्ड',
    totalPendingTax: 'एकूण थकीत कर',
    averagePerWard: 'प्रति वॉर्ड सरासरी',
    heatScale: 'हीट स्केल',
    low: 'कमी',
    high: 'जास्त',
    heatScaleHint:
      'मोठे चमकदार मार्कर अधिक थकीत कर दर्शवतात. वॉर्ड टॅग लाईव्ह थकबाकी दाखवतात.',
    focus: 'फोकस',
    focusHint: 'गडद बाह्यरेषा सक्रिय अहवालातील वॉर्ड दर्शवते.',
    pendingTax: 'थकीत कर',
    propertiesCovered: 'समाविष्ट मालमत्ता',
    highlightedReportArea: 'हायलाइट केलेले अहवाल क्षेत्र',
    recordsFound: (count) => `${count} नोंदी सापडल्या`,
    showingResults: (start, end, total) =>
      `${total} पैकी ${start} ते ${end} निकाल दाखवले जात आहेत`,
    viewDetailedData: (count) => `तपशीलवार डेटा पहा (${count} नोंदी)`,
  },
};

const COLUMN_LABELS: Record<string, Record<AppLanguage, string>> = {
  rank: { en: 'Rank', hi: 'रैंक', mr: 'क्रमांक' },
  property_id: { en: 'Property ID', hi: 'प्रॉपर्टी ID', mr: 'प्रॉपर्टी ID' },
  owner_name: { en: 'Owner Name', hi: 'मालिक का नाम', mr: 'मालकाचे नाव' },
  ward: { en: 'Ward', hi: 'वार्ड', mr: 'वॉर्ड' },
  zone: { en: 'Zone', hi: 'ज़ोन', mr: 'झोन' },
  collection_officer: {
    en: 'Collection Officer',
    hi: 'वसूली अधिकारी',
    mr: 'वसुली अधिकारी',
  },
  assigned_wards: {
    en: 'Assigned Wards',
    hi: 'सौंपे गए वार्ड',
    mr: 'नेमलेले वॉर्ड',
  },
  property_address: { en: 'Property Address', hi: 'संपत्ति का पता', mr: 'मालमत्तेचा पत्ता' },
  tax_amount: { en: 'Tax Amount', hi: 'कर राशि', mr: 'कर रक्कम' },
  due_amount: { en: 'Due Amount', hi: 'देय राशि', mr: 'देय रक्कम' },
  water_tax_due: { en: 'Water Tax Due', hi: 'जल कर देय', mr: 'पाणी कर देय' },
  sewerage_tax_due: {
    en: 'Sewerage Tax Due',
    hi: 'सीवरेज कर देय',
    mr: 'सांडपाणी कर देय',
  },
  solid_waste_tax_due: {
    en: 'Solid Waste Tax Due',
    hi: 'ठोस अपशिष्ट कर देय',
    mr: 'घनकचरा कर देय',
  },
  outstanding_amount: {
    en: 'Outstanding Amount',
    hi: 'बकाया राशि',
    mr: 'थकबाकी रक्कम',
  },
  total_due_all_taxes: {
    en: 'Total Due All Taxes',
    hi: 'सभी करों की कुल देय राशि',
    mr: 'सर्व करांची एकूण देय रक्कम',
  },
  payment_status: { en: 'Payment Status', hi: 'भुगतान स्थिति', mr: 'पेमेंट स्थिती' },
  last_payment_date: {
    en: 'Last Payment Date',
    hi: 'अंतिम भुगतान तिथि',
    mr: 'शेवटची पेमेंट तारीख',
  },
  risk_score: { en: 'Risk Score', hi: 'जोखिम स्कोर', mr: 'जोखीम गुणांकन' },
  risk_band: { en: 'Risk Band', hi: 'जोखिम स्तर', mr: 'जोखीम पातळी' },
  recovery_priority: {
    en: 'Recovery Priority',
    hi: 'वसूली प्राथमिकता',
    mr: 'वसुली प्राधान्य',
  },
  days_since_last_payment: {
    en: 'Days Since Last Payment',
    hi: 'अंतिम भुगतान से दिन',
    mr: 'शेवटच्या पेमेंटपासून दिवस',
  },
  total_properties: {
    en: 'Total Properties',
    hi: 'कुल संपत्तियां',
    mr: 'एकूण मालमत्ता',
  },
  total_tax: { en: 'Total Tax', hi: 'कुल कर', mr: 'एकूण कर' },
  total_due: { en: 'Total Due', hi: 'कुल देय', mr: 'एकूण देय' },
  total_collected: {
    en: 'Total Collected',
    hi: 'कुल वसूली',
    mr: 'एकूण वसुली',
  },
  paid_count: { en: 'Paid Count', hi: 'भुगतान पूर्ण संख्या', mr: 'भरलेल्या खात्यांची संख्या' },
  unpaid_count: { en: 'Unpaid Count', hi: 'अवैतनिक संख्या', mr: 'न भरलेल्या खात्यांची संख्या' },
  partial_count: { en: 'Partial Count', hi: 'आंशिक भुगतान संख्या', mr: 'आंशिक पेमेंट संख्या' },
  unpaid_properties: {
    en: 'Unpaid Properties',
    hi: 'अवैतनिक संपत्तियां',
    mr: 'न भरलेल्या मालमत्ता',
  },
  partial_properties: {
    en: 'Partial Properties',
    hi: 'आंशिक भुगतान संपत्तियां',
    mr: 'आंशिक पेमेंट मालमत्ता',
  },
  property_count: { en: 'Property Count', hi: 'संपत्ति संख्या', mr: 'मालमत्ता संख्या' },
  collection_efficiency_pct: {
    en: 'Collection Efficiency %',
    hi: 'वसूली दक्षता %',
    mr: 'वसुली कार्यक्षमता %',
  },
  predicted_default_likelihood_pct: {
    en: 'Default Likelihood %',
    hi: 'डिफॉल्ट संभावना %',
    mr: 'डिफॉल्ट शक्यता %',
  },
  prediction_signal: {
    en: 'Prediction Signal',
    hi: 'पूर्वानुमान संकेत',
    mr: 'भाकीत संकेत',
  },
  key_risk_factors: {
    en: 'Key Risk Factors',
    hi: 'मुख्य जोखिम कारक',
    mr: 'मुख्य जोखीम घटक',
  },
  outstanding_ratio_pct: {
    en: 'Outstanding Ratio %',
    hi: 'बकाया अनुपात %',
    mr: 'थकबाकी गुणोत्तर %',
  },
  segment: { en: 'Segment', hi: 'खंड', mr: 'विभाग' },
  outstanding_before_waiver: {
    en: 'Outstanding Before Waiver',
    hi: 'छूट से पहले बकाया',
    mr: 'सवलतीपूर्वीची थकबाकी',
  },
  estimated_recovery_without_waiver: {
    en: 'Recovery Without Waiver',
    hi: 'छूट बिना अनुमानित वसूली',
    mr: 'सवलतीशिवाय अंदाजित वसुली',
  },
  estimated_recovery_with_waiver: {
    en: 'Recovery With Waiver',
    hi: 'छूट के बाद अनुमानित वसूली',
    mr: 'सवलतीनंतर अंदाजित वसुली',
  },
  net_recovery_uplift: {
    en: 'Net Recovery Uplift',
    hi: 'शुद्ध वसूली बढ़ोतरी',
    mr: 'निव्वळ वसुली वाढ',
  },
  estimated_waiver_cost: {
    en: 'Waiver Cost',
    hi: 'छूट लागत',
    mr: 'सवलत खर्च',
  },
  recovery_uplift_pct: {
    en: 'Recovery Uplift %',
    hi: 'वसूली बढ़ोतरी %',
    mr: 'वसुली वाढ %',
  },
  payment_month: { en: 'Payment Month', hi: 'भुगतान महीना', mr: 'पेमेंट महिना' },
  payment_year: { en: 'Payment Year', hi: 'भुगतान वर्ष', mr: 'पेमेंट वर्ष' },
  payment_events: { en: 'Payment Events', hi: 'भुगतान घटनाएं', mr: 'पेमेंट घटना' },
  collected_amount: { en: 'Collected Amount', hi: 'वसूली राशि', mr: 'वसूल रक्कम' },
  outstanding_due: { en: 'Outstanding Due', hi: 'बकाया देय', mr: 'थकीत देय' },
  month_on_month_change_pct: {
    en: 'Month-on-Month Change %',
    hi: 'माह-दर-माह बदलाव %',
    mr: 'महिना-वर-महिना बदल %',
  },
  payment_event_change_pct: {
    en: 'Payment Event Change %',
    hi: 'भुगतान घटना बदलाव %',
    mr: 'पेमेंट घटना बदल %',
  },
  anomaly_score: {
    en: 'Anomaly Score',
    hi: 'विसंगति स्कोर',
    mr: 'विसंगती गुण',
  },
  is_anomaly: {
    en: 'Anomaly Flag',
    hi: 'विसंगति चिन्ह',
    mr: 'विसंगती चिन्ह',
  },
  possible_reason: {
    en: 'Possible Reason',
    hi: 'संभावित कारण',
    mr: 'संभाव्य कारण',
  },
  average_collection_per_payment: {
    en: 'Average Collection Per Payment',
    hi: 'प्रति भुगतान औसत वसूली',
    mr: 'प्रति पेमेंट सरासरी वसुली',
  },
  high_risk_accounts: {
    en: 'High Risk Accounts',
    hi: 'उच्च जोखिम खाते',
    mr: 'उच्च जोखीम खाती',
  },
  average_risk_score: {
    en: 'Average Risk Score',
    hi: 'औसत जोखिम स्कोर',
    mr: 'सरासरी जोखीम गुणांकन',
  },
  top_risk_band: {
    en: 'Top Risk Band',
    hi: 'प्रमुख जोखिम स्तर',
    mr: 'प्रमुख जोखीम स्तर',
  },
  performance_label: {
    en: 'Performance Label',
    hi: 'प्रदर्शन लेबल',
    mr: 'कामगिरी लेबल',
  },
  efficiency_gap_pct: {
    en: 'Efficiency Gap %',
    hi: 'दक्षता अंतर %',
    mr: 'कार्यक्षमता अंतर %',
  },
  estimated_previous_year_due: {
    en: 'Estimated Previous Year Due',
    hi: 'अनुमानित पिछले वर्ष की देय राशि',
    mr: 'अंदाजित मागील वर्षाची देय रक्कम',
  },
  due_increase_amount: {
    en: 'Due Increase Amount',
    hi: 'देय वृद्धि राशि',
    mr: 'देय वाढ रक्कम',
  },
  due_increase_pct: {
    en: 'Due Increase %',
    hi: 'देय वृद्धि %',
    mr: 'देय वाढ %',
  },
  needs_audit_review: {
    en: 'Needs Audit Review',
    hi: 'ऑडिट समीक्षा आवश्यक',
    mr: 'ऑडिट पुनरावलोकन आवश्यक',
  },
  tax_category: { en: 'Tax Category', hi: 'कर श्रेणी', mr: 'कर प्रकार' },
  account: { en: 'Account', hi: 'खाता', mr: 'खाते' },
};

export function getInterfaceLabels(language: AppLanguage): InterfaceLabels {
  return INTERFACE_LABELS[language];
}

export function getLocale(language: AppLanguage): string {
  if (language === 'hi') {
    return 'hi-IN';
  }

  if (language === 'mr') {
    return 'mr-IN';
  }

  return 'en-IN';
}

export function getColumnLabel(column: string, language: AppLanguage): string {
  return COLUMN_LABELS[column]?.[language] ?? humanizeColumn(column);
}

function humanizeColumn(column: string): string {
  return column
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
