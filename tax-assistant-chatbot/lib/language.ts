export type AppLanguage = 'en' | 'hi' | 'mr';

export interface QuerySuggestion {
  id: string;
  prompt: string;
  labels: Record<AppLanguage, string>;
}

export const LANGUAGE_OPTIONS: Array<{
  value: AppLanguage;
  label: string;
}> = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'mr', label: 'Marathi' },
];

export const FEATURED_QUERIES: QuerySuggestion[] = [
  {
    id: 'defaulters',
    prompt: 'Show top 10 defaulters in Ward 5',
    labels: {
      en: 'Show top 10 defaulters in Ward 5',
      hi: 'वार्ड 5 के शीर्ष 10 बकायेदार दिखाएं',
      mr: 'वॉर्ड 5 मधील शीर्ष 10 थकबाकीदार दाखवा',
    },
  },
  {
    id: 'payment-status',
    prompt: 'Check payment status of property ID 1',
    labels: {
      en: 'Check payment status of property ID 1',
      hi: 'प्रॉपर्टी ID 1 की भुगतान स्थिति देखें',
      mr: 'प्रॉपर्टी ID 1 ची पेमेंट स्थिती तपासा',
    },
  },
  {
    id: 'full-dashboard',
    prompt: 'Give full report of Ward 5',
    labels: {
      en: 'Give full report of Ward 5',
      hi: 'वार्ड 5 की पूरी रिपोर्ट दें',
      mr: 'वॉर्ड 5 चा संपूर्ण अहवाल द्या',
    },
  },
  {
    id: 'integrated-tax',
    prompt: 'Show integrated tax summary for Ward 2',
    labels: {
      en: 'Show integrated tax summary for Ward 2',
      hi: 'वार्ड 2 के लिए एकीकृत कर सारांश दिखाएं',
      mr: 'वॉर्ड 2 साठी एकत्रित कर सारांश दाखवा',
    },
  },
  {
    id: 'predictive-risk',
    prompt: 'Predict high-risk defaulters in Zone B',
    labels: {
      en: 'Predict high-risk defaulters in Zone B',
      hi: 'ज़ोन B में उच्च जोखिम वाले बकायेदारों का पूर्वानुमान दें',
      mr: 'झोन B मधील उच्च-जोखीम थकबाकीदारांचा अंदाज द्या',
    },
  },
  {
    id: 'payment-chart',
    prompt: 'Show payment status distribution chart',
    labels: {
      en: 'Show payment status distribution chart',
      hi: 'भुगतान स्थिति वितरण चार्ट दिखाएं',
      mr: 'पेमेंट स्थिती वितरण चार्ट दाखवा',
    },
  },
  {
    id: 'ward-heatmap',
    prompt: 'Show ward-wise heatmap',
    labels: {
      en: 'Show ward-wise heatmap',
      hi: 'वार्ड-वार हीटमैप दिखाएं',
      mr: 'वॉर्डनिहाय हीटमॅप दाखवा',
    },
  },
  {
    id: 'collection-report',
    prompt: 'Generate ward-wise collection report',
    labels: {
      en: 'Generate ward-wise collection report',
      hi: 'वार्ड-वार कलेक्शन रिपोर्ट बनाएं',
      mr: 'वॉर्डनिहाय संकलन अहवाल तयार करा',
    },
  },
  {
    id: 'highest-outstanding',
    prompt: 'Which ward has the highest outstanding tax?',
    labels: {
      en: 'Which ward has the highest outstanding tax?',
      hi: 'किस वार्ड में सबसे अधिक बकाया कर है?',
      mr: 'कोणत्या वॉर्डमध्ये सर्वाधिक थकीत कर आहे?',
    },
  },
  {
    id: 'collection-efficiency',
    prompt: 'Compare collection efficiency across zones',
    labels: {
      en: 'Compare collection efficiency across zones',
      hi: 'ज़ोनों में वसूली दक्षता की तुलना करें',
      mr: 'झोननिहाय वसुली कार्यक्षमता तुलना करा',
    },
  },
  {
    id: 'recovery-priority',
    prompt: 'Which accounts should officers target first for recovery?',
    labels: {
      en: 'Which accounts should officers target first for recovery?',
      hi: 'वसूली के लिए अधिकारियों को पहले किन खातों पर ध्यान देना चाहिए?',
      mr: 'वसुलीसाठी अधिकाऱ्यांनी आधी कोणत्या खात्यांवर लक्ष द्यावे?',
    },
  },
  {
    id: 'stale-accounts',
    prompt: 'Show stale accounts with no payment in the last year',
    labels: {
      en: 'Show stale accounts with no payment in the last year',
      hi: 'पिछले एक साल में बिना भुगतान वाले पुराने खाते दिखाएं',
      mr: 'मागील एक वर्षात पेमेंट नसलेली जुनी खाती दाखवा',
    },
  },
  {
    id: 'default-prediction-next-year',
    prompt: 'Predict which properties in Ward 5 are most likely to default next year',
    labels: {
      en: 'Predict which properties in Ward 5 are most likely to default next year',
      hi: 'अनुमान लगाएं कि Ward 5 में कौन-सी संपत्तियां अगले साल सबसे अधिक डिफॉल्ट कर सकती हैं',
      mr: 'Ward 5 मधील कोणत्या मालमत्ता पुढील वर्षी सर्वाधिक डिफॉल्ट होऊ शकतात याचा अंदाज द्या',
    },
  },
  {
    id: 'penalty-waiver-simulation',
    prompt: 'If we waive 10% penalty for Zone B defaulters, how much revenue could we recover?',
    labels: {
      en: 'If we waive 10% penalty for Zone B defaulters, how much revenue could we recover?',
      hi: 'अगर हम Zone B के बकायेदारों के लिए 10% पेनल्टी माफ करें, तो कितनी राजस्व वसूली हो सकती है?',
      mr: 'Zone B मधील थकबाकीदारांसाठी 10% दंड माफ केल्यास किती महसूल वसूल होऊ शकतो?',
    },
  },
  {
    id: 'trend-anomaly',
    prompt: 'Show month-on-month collection trend for last 12 months and flag months with sudden drops',
    labels: {
      en: 'Show month-on-month collection trend for last 12 months and flag months with sudden drops',
      hi: 'पिछले 12 महीनों का माह-दर-माह कलेक्शन ट्रेंड दिखाएं और अचानक गिरावट वाले महीनों को चिन्हित करें',
      mr: 'मागील 12 महिन्यांचा महिना-वर-महिना वसुली कल दाखवा आणि अचानक घसरण झालेल्या महिन्यांना चिन्हांकित करा',
    },
  },
  {
    id: 'officer-best-worst',
    prompt: 'Which ward officer is performing best and worst based on their collection rate?',
    labels: {
      en: 'Which ward officer is performing best and worst based on their collection rate?',
      hi: 'कौन-सा वार्ड अधिकारी अपनी कलेक्शन दर के आधार पर सबसे अच्छा और सबसे कमजोर प्रदर्शन कर रहा है?',
      mr: 'कोणता वॉर्ड अधिकारी आपल्या वसुली दराच्या आधारावर सर्वोत्तम आणि सर्वात कमकुवत कामगिरी करत आहे?',
    },
  },
  {
    id: 'reassessment-spike',
    prompt: 'Find properties where due amount increased sharply - possible reassessment errors',
    labels: {
      en: 'Find properties where due amount increased sharply - possible reassessment errors',
      hi: 'ऐसी संपत्तियां खोजें जिनकी देय राशि तेज़ी से बढ़ी है - संभावित पुनर्मूल्यांकन त्रुटियां',
      mr: 'ज्या मालमत्तांची देय रक्कम झपाट्याने वाढली आहे अशा मालमत्ता शोधा - संभाव्य पुनर्मूल्यांकन चुका',
    },
  },
];

export function getUiCopy(language: AppLanguage) {
  return UI_COPY[language];
}

const UI_COPY = {
  en: {
    headerTitle: 'Property Tax Assistant',
    headerSubtitle: 'AI-powered insights for collections, analytics, and multilingual support',
    languageLabel: 'Language',
    emptyTitle: 'What can I help you with?',
    emptySubtitle:
      'Ask about payment status, predictive defaulters, collection efficiency, stale accounts, recovery priorities, simulations, anomaly trends, integrated taxes, or analytics charts.',
    welcomeMessage:
      'Welcome to the AI Property Tax Assistant. You can ask in English, Hindi, or Marathi, track payment status, explore predictive defaulter insights, compare ward and zone performance, run waiver simulations, spot anomaly months, find stale overdue accounts, identify recovery priorities, combine municipal taxes, and view charts instantly.',
    inputPlaceholder: 'Type or speak your property tax question...',
    listeningPlaceholder: 'Listening... speak your property tax question',
    voiceReadyHint: 'You can type or use the microphone to send your message.',
    voiceListeningHint:
      'Listening... speak your message and tap the stop button when you are done.',
    voiceUnsupportedHint:
      'Voice input is available in supported browsers like Chrome.',
    voiceStartLabel: 'Start voice input',
    voiceStopLabel: 'Stop voice input',
    sendLabel: 'Send message',
  },
  hi: {
    headerTitle: 'प्रॉपर्टी टैक्स असिस्टेंट',
    headerSubtitle: 'कलेक्शन, विश्लेषण और बहुभाषी सहायता के लिए AI-संचालित सहायता',
    languageLabel: 'भाषा',
    emptyTitle: 'मैं आपकी किस तरह मदद कर सकता हूँ?',
    emptySubtitle:
      'भुगतान स्थिति, पूर्वानुमानित बकायेदार, वसूली दक्षता, रिकवरी प्राथमिकता, सिमुलेशन, विसंगति ट्रेंड, एकीकृत कर या विश्लेषण चार्ट के बारे में पूछें।',
    welcomeMessage:
      'AI प्रॉपर्टी टैक्स असिस्टेंट में आपका स्वागत है। आप अंग्रेज़ी, हिंदी या मराठी में पूछ सकते हैं, भुगतान स्थिति देख सकते हैं, संभावित बकायेदारों का विश्लेषण पा सकते हैं, जोन और वार्ड प्रदर्शन की तुलना कर सकते हैं, वेवर सिमुलेशन चला सकते हैं, विसंगति वाले महीने पहचान सकते हैं, कई नगर कर जोड़कर देख सकते हैं और तुरंत चार्ट देख सकते हैं।',
    inputPlaceholder: 'अपना प्रॉपर्टी टैक्स प्रश्न टाइप करें या बोलें...',
    listeningPlaceholder: 'सुन रहा है... अपना प्रॉपर्टी टैक्स प्रश्न बोलें',
    voiceReadyHint: 'आप टाइप कर सकते हैं या माइक्रोफोन से संदेश भेज सकते हैं।',
    voiceListeningHint:
      'सुन रहा है... अपनी बात बोलें और पूरा होने पर स्टॉप बटन दबाएँ।',
    voiceUnsupportedHint:
      'वॉइस इनपुट Chrome जैसे समर्थित ब्राउज़र में उपलब्ध है।',
    voiceStartLabel: 'वॉइस इनपुट शुरू करें',
    voiceStopLabel: 'वॉइस इनपुट बंद करें',
    sendLabel: 'संदेश भेजें',
  },
  mr: {
    headerTitle: 'मालमत्ता कर सहाय्यक',
    headerSubtitle: 'वसुली, विश्लेषण आणि बहुभाषिक सहाय्यासाठी AI-आधारित मदत',
    languageLabel: 'भाषा',
    emptyTitle: 'मी तुम्हाला कशी मदत करू शकतो?',
    emptySubtitle:
      'पेमेंट स्थिती, अंदाजाधारित थकबाकीदार, वसुली कार्यक्षमता, प्राधान्य वसुली, सिम्युलेशन, विसंगती ट्रेंड, एकत्रित कर किंवा विश्लेषण चार्टबद्दल विचारा.',
    welcomeMessage:
      'AI मालमत्ता कर सहाय्यकात आपले स्वागत आहे. तुम्ही इंग्रजी, हिंदी किंवा मराठीत विचारू शकता, पेमेंट स्थिती पाहू शकता, उच्च-जोखीम थकबाकीदारांचे अंदाज मिळवू शकता, वॉर्ड आणि झोन कामगिरी तुलना करू शकता, सवलत सिम्युलेशन चालवू शकता, विसंगतीचे महिने ओळखू शकता, विविध महानगरपालिका कर एकत्र पाहू शकता आणि त्वरित चार्ट पाहू शकता.',
    inputPlaceholder: 'तुमचा मालमत्ता कर प्रश्न टाइप करा किंवा बोला...',
    listeningPlaceholder: 'ऐकत आहे... तुमचा मालमत्ता कर प्रश्न बोला',
    voiceReadyHint: 'तुम्ही टाइप करू शकता किंवा मायक्रोफोन वापरून संदेश पाठवू शकता.',
    voiceListeningHint:
      'ऐकत आहे... तुमचा संदेश बोला आणि पूर्ण झाल्यावर स्टॉप बटण दाबा.',
    voiceUnsupportedHint:
      'व्हॉइस इनपुट Chrome सारख्या समर्थित ब्राउझरमध्ये उपलब्ध आहे.',
    voiceStartLabel: 'व्हॉइस इनपुट सुरू करा',
    voiceStopLabel: 'व्हॉइस इनपुट थांबवा',
    sendLabel: 'संदेश पाठवा',
  },
} satisfies Record<
  AppLanguage,
  {
    headerTitle: string;
    headerSubtitle: string;
    languageLabel: string;
    emptyTitle: string;
    emptySubtitle: string;
    welcomeMessage: string;
    inputPlaceholder: string;
    listeningPlaceholder: string;
    voiceReadyHint: string;
    voiceListeningHint: string;
    voiceUnsupportedHint: string;
    voiceStartLabel: string;
    voiceStopLabel: string;
    sendLabel: string;
  }
>;
