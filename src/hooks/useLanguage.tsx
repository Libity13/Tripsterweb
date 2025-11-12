import { useState, useEffect, createContext, useContext } from 'react';

export type Language = 'th' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation keys
const translations = {
  th: {
    'app.title': 'Tripster',
    'app.subtitle': 'ผู้ช่วยวางแผนทริปอัจฉริยะ',
    'chat.placeholder': 'บอกผมว่าคุณอยากไปที่ไหน...',
    'chat.send': 'ส่ง',
    'chat.thinking': 'กำลังคิด...',
    'language.switch': 'เปลี่ยนภาษา',
    'language.thai': 'ไทย',
    'language.english': 'English',
    'features.search': 'ค้นหาสถานที่',
    'features.recommend': 'แนะนำสถานที่',
    'features.plan': 'วางแผนทริป',
    'error.network': 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
    'error.ai': 'ระบบ AI ขัดข้องชั่วคราว',
    'success.saved': 'บันทึกเรียบร้อยแล้ว',
    'success.shared': 'แชร์เรียบร้อยแล้ว'
  },
  en: {
    'app.title': 'Tripster',
    'app.subtitle': 'Your Intelligent Travel Planning Assistant',
    'chat.placeholder': 'Tell me where you want to go...',
    'chat.send': 'Send',
    'chat.thinking': 'Thinking...',
    'language.switch': 'Switch Language',
    'language.thai': 'ไทย',
    'language.english': 'English',
    'features.search': 'Search Places',
    'features.recommend': 'Recommend Places',
    'features.plan': 'Plan Trip',
    'error.network': 'Network connection error',
    'error.ai': 'AI system temporarily down',
    'success.saved': 'Saved successfully',
    'success.shared': 'Shared successfully'
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('th');

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('travelmate-language') as Language;
    if (savedLanguage && (savedLanguage === 'th' || savedLanguage === 'en')) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Save language to localStorage when changed
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('travelmate-language', lang);
  };

  // Translation function
  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Language switcher component
export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setLanguage('th')}
        className={`px-3 py-1 rounded text-sm ${
          language === 'th' 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        {t('language.thai')}
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 rounded text-sm ${
          language === 'en' 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        {t('language.english')}
      </button>
    </div>
  );
}
