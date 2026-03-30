import { AppLanguage, getUiCopy, LANGUAGE_OPTIONS } from '@/lib/language';

interface HeaderProps {
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
}

export default function Header({ language, onLanguageChange }: HeaderProps) {
  const uiCopy = getUiCopy(language);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{uiCopy.headerTitle}</h1>
          <p className="text-sm text-gray-600 mt-1">{uiCopy.headerSubtitle}</p>
        </div>

        <label className="flex items-center gap-3 text-sm text-gray-700">
          <span className="font-medium">{uiCopy.languageLabel}</span>
          <select
            value={language}
            onChange={(event) =>
              onLanguageChange(event.target.value as AppLanguage)
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
