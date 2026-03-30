import Image from 'next/image';
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
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Image
              src="/taxbot-icon.svg"
              alt="TaxBot logo"
              width={64}
              height={64}
              priority
              className="h-12 w-12 shrink-0 rounded-2xl sm:h-14 sm:w-14"
            />
            <div className="min-w-0">
              <h1 className="flex items-baseline gap-1 leading-none">
                <span className="text-3xl font-black tracking-tight text-[#145A67] sm:text-4xl">
                  Tax
                </span>
                <span className="text-3xl font-black tracking-tight text-[#7ECF5A] sm:text-4xl">
                  Bot
                </span>
              </h1>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-xs">
                {uiCopy.headerTitle}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-600">{uiCopy.headerSubtitle}</p>
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
