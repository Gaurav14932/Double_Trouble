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
      hi: 'Give full report of Ward 5',
      mr: 'Give full report of Ward 5',
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
      hi: 'Show ward-wise heatmap',
      mr: 'Show ward-wise heatmap',
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
      'Ask about payment status, predictive defaulters, integrated taxes, or analytics charts.',
    welcomeMessage:
      'Welcome to the AI Property Tax Assistant. You can ask in English, Hindi, or Marathi, track payment status, explore predictive defaulter insights, combine municipal taxes, and view charts instantly.',
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
      'भुगतान स्थिति, पूर्वानुमानित बकायेदार, एकीकृत कर या विश्लेषण चार्ट के बारे में पूछें।',
    welcomeMessage:
      'AI प्रॉपर्टी टैक्स असिस्टेंट में आपका स्वागत है। आप अंग्रेज़ी, हिंदी या मराठी में पूछ सकते हैं, भुगतान स्थिति देख सकते हैं, संभावित बकायेदारों का विश्लेषण पा सकते हैं, कई नगर कर जोड़कर देख सकते हैं और तुरंत चार्ट देख सकते हैं।',
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
      'पेमेंट स्थिती, अंदाजाधारित थकबाकीदार, एकत्रित कर किंवा विश्लेषण चार्टबद्दल विचारा.',
    welcomeMessage:
      'AI मालमत्ता कर सहाय्यकात आपले स्वागत आहे. तुम्ही इंग्रजी, हिंदी किंवा मराठीत विचारू शकता, पेमेंट स्थिती पाहू शकता, उच्च-जोखीम थकबाकीदारांचे अंदाज मिळवू शकता, विविध महानगरपालिका कर एकत्र पाहू शकता आणि त्वरित चार्ट पाहू शकता.',
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
