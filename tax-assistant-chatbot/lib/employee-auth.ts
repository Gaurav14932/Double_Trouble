import { AppLanguage } from './language';

export type EmployeeRole = 'admin' | 'officer' | 'analyst';

export interface EmployeeSession {
  employeeId: string;
  displayName: string;
  role: EmployeeRole;
  primaryWard: string;
  primaryZone: string;
}

export interface EmployeeDirectoryEntry extends EmployeeSession {
  isCustom: boolean;
}

interface EmployeeCredential extends EmployeeSession {
  password: string;
}

export interface CreateEmployeeInput {
  employeeId: string;
  displayName: string;
  password: string;
  role: EmployeeRole;
  primaryWard: string;
  primaryZone: string;
}

export type CreateEmployeeErrorCode =
  | 'display_name_required'
  | 'employee_id_required'
  | 'employee_id_invalid'
  | 'employee_id_taken'
  | 'password_too_short'
  | 'ward_required'
  | 'zone_required';

export type CreateEmployeeResult =
  | { success: true; session: EmployeeSession }
  | { success: false; code: CreateEmployeeErrorCode };

export const EMPLOYEE_SESSION_STORAGE_KEY = 'taxbot-employee-session';
export const EMPLOYEE_DIRECTORY_STORAGE_KEY = 'taxbot-employee-directory';

const DEFAULT_EMPLOYEE_DIRECTORY: EmployeeCredential[] = [
  {
    employeeId: 'ADMIN01',
    displayName: 'Aditi Deshmukh',
    role: 'admin',
    primaryWard: 'All Wards',
    primaryZone: 'All Zones',
    password: 'admin123',
  },
  {
    employeeId: 'OFC101',
    displayName: 'Officer Anita Patil',
    role: 'officer',
    primaryWard: 'Ward 1',
    primaryZone: 'Zone A',
    password: 'taxbot123',
  },
  {
    employeeId: 'OFC102',
    displayName: 'Officer Rahul More',
    role: 'officer',
    primaryWard: 'Ward 2',
    primaryZone: 'Zone B',
    password: 'taxbot123',
  },
  {
    employeeId: 'OFC103',
    displayName: 'Officer Sneha Kulkarni',
    role: 'officer',
    primaryWard: 'Ward 3',
    primaryZone: 'Zone C',
    password: 'taxbot123',
  },
  {
    employeeId: 'OFC104',
    displayName: 'Officer Vijay Shinde',
    role: 'officer',
    primaryWard: 'Ward 4',
    primaryZone: 'Zone A',
    password: 'taxbot123',
  },
  {
    employeeId: 'OFC105',
    displayName: 'Officer Pooja Jadhav',
    role: 'officer',
    primaryWard: 'Ward 5',
    primaryZone: 'Zone C',
    password: 'taxbot123',
  },
  {
    employeeId: 'ANL201',
    displayName: 'Sameer Pawar',
    role: 'analyst',
    primaryWard: 'All Wards',
    primaryZone: 'All Zones',
    password: 'analyst123',
  },
];

const DEFAULT_EMPLOYEE_IDS = new Set(
  DEFAULT_EMPLOYEE_DIRECTORY.map((employee) => employee.employeeId.toUpperCase())
);

export function getEmployeeDirectory(): EmployeeDirectoryEntry[] {
  return getMergedEmployeeDirectory().map((employee) => ({
    ...toSession(employee),
    isCustom: !DEFAULT_EMPLOYEE_IDS.has(employee.employeeId.toUpperCase()),
  }));
}

export function authenticateEmployee(
  employeeId: string,
  password: string
): EmployeeSession | null {
  const normalizedId = employeeId.trim().toUpperCase();
  const credential = getMergedEmployeeDirectory().find(
    (employee) =>
      employee.employeeId.toUpperCase() === normalizedId &&
      employee.password === password
  );

  return credential ? toSession(credential) : null;
}

export function createEmployeeAccount(
  input: CreateEmployeeInput
): CreateEmployeeResult {
  const displayName = input.displayName.trim();
  const normalizedId = input.employeeId.trim().toUpperCase();
  const password = input.password.trim();
  const role = input.role;
  const primaryWard =
    role === 'officer'
      ? input.primaryWard.trim()
      : input.primaryWard.trim() || 'All Wards';
  const primaryZone =
    role === 'officer'
      ? input.primaryZone.trim()
      : input.primaryZone.trim() || 'All Zones';

  if (!displayName) {
    return { success: false, code: 'display_name_required' };
  }

  if (!normalizedId) {
    return { success: false, code: 'employee_id_required' };
  }

  if (!/^[A-Z0-9_-]{4,20}$/.test(normalizedId)) {
    return { success: false, code: 'employee_id_invalid' };
  }

  const existingDirectory = getMergedEmployeeDirectory();
  if (
    existingDirectory.some(
      (employee) => employee.employeeId.toUpperCase() === normalizedId
    )
  ) {
    return { success: false, code: 'employee_id_taken' };
  }

  if (password.length < 6) {
    return { success: false, code: 'password_too_short' };
  }

  if (role === 'officer' && !primaryWard) {
    return { success: false, code: 'ward_required' };
  }

  if (role === 'officer' && !primaryZone) {
    return { success: false, code: 'zone_required' };
  }

  const nextEmployee: EmployeeCredential = {
    employeeId: normalizedId,
    displayName,
    password,
    role,
    primaryWard,
    primaryZone,
  };

  const customEmployees = getCustomEmployeeDirectory();
  customEmployees.unshift(nextEmployee);
  persistCustomEmployeeDirectory(customEmployees);

  return {
    success: true,
    session: toSession(nextEmployee),
  };
}

export function restoreEmployeeSession(value: unknown): EmployeeSession | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<EmployeeSession>;
  if (
    typeof candidate.employeeId !== 'string' ||
    typeof candidate.displayName !== 'string' ||
    typeof candidate.role !== 'string' ||
    typeof candidate.primaryWard !== 'string' ||
    typeof candidate.primaryZone !== 'string'
  ) {
    return null;
  }

  const knownEmployee = getMergedEmployeeDirectory().find(
    (employee) => employee.employeeId === candidate.employeeId
  );

  return knownEmployee ? toSession(knownEmployee) : null;
}

export function getEmployeeRoleLabel(
  role: EmployeeRole,
  language: AppLanguage
): string {
  if (role === 'admin') {
    return byLanguage(language, {
      en: 'Admin',
      hi: 'प्रशासक',
      mr: 'प्रशासक',
    });
  }

  if (role === 'analyst') {
    return byLanguage(language, {
      en: 'Revenue Analyst',
      hi: 'राजस्व विश्लेषक',
      mr: 'महसूल विश्लेषक',
    });
  }

  return byLanguage(language, {
    en: 'Collection Officer',
    hi: 'वसूली अधिकारी',
    mr: 'वसुली अधिकारी',
  });
}

export function getEmployeeScopeLabel(
  employee: EmployeeSession,
  language: AppLanguage
): string {
  return byLanguage(language, {
    en: `${employee.primaryWard} • ${employee.primaryZone}`,
    hi: `${localizeArea(employee.primaryWard, language)} • ${localizeArea(employee.primaryZone, language)}`,
    mr: `${localizeArea(employee.primaryWard, language)} • ${localizeArea(employee.primaryZone, language)}`,
  });
}

function getMergedEmployeeDirectory(): EmployeeCredential[] {
  return [...getCustomEmployeeDirectory(), ...DEFAULT_EMPLOYEE_DIRECTORY];
}

function getCustomEmployeeDirectory(): EmployeeCredential[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(
      EMPLOYEE_DIRECTORY_STORAGE_KEY
    );

    if (!storedValue) {
      return [];
    }

    const parsed = JSON.parse(storedValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(sanitizeEmployeeCredential)
      .filter((employee): employee is EmployeeCredential => employee !== null)
      .filter(
        (employee) =>
          !DEFAULT_EMPLOYEE_IDS.has(employee.employeeId.toUpperCase())
      );
  } catch {
    window.localStorage.removeItem(EMPLOYEE_DIRECTORY_STORAGE_KEY);
    return [];
  }
}

function persistCustomEmployeeDirectory(directory: EmployeeCredential[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    EMPLOYEE_DIRECTORY_STORAGE_KEY,
    JSON.stringify(directory)
  );
}

function sanitizeEmployeeCredential(value: unknown): EmployeeCredential | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<EmployeeCredential>;
  if (
    typeof candidate.employeeId !== 'string' ||
    typeof candidate.displayName !== 'string' ||
    typeof candidate.password !== 'string' ||
    typeof candidate.role !== 'string' ||
    typeof candidate.primaryWard !== 'string' ||
    typeof candidate.primaryZone !== 'string'
  ) {
    return null;
  }

  if (
    candidate.role !== 'admin' &&
    candidate.role !== 'officer' &&
    candidate.role !== 'analyst'
  ) {
    return null;
  }

  const employeeId = candidate.employeeId.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{4,20}$/.test(employeeId)) {
    return null;
  }

  return {
    employeeId,
    displayName: candidate.displayName.trim(),
    password: candidate.password,
    role: candidate.role,
    primaryWard: candidate.primaryWard.trim() || 'All Wards',
    primaryZone: candidate.primaryZone.trim() || 'All Zones',
  };
}

function toSession(employee: EmployeeCredential): EmployeeSession {
  const { password: _password, ...session } = employee;
  return session;
}

function localizeArea(value: string, language: AppLanguage): string {
  if (language === 'en') {
    return value;
  }

  if (/^Ward\s+\d+$/i.test(value)) {
    const suffix = value.replace(/^Ward\s+/i, '');
    return `${language === 'hi' ? 'वार्ड' : 'वॉर्ड'} ${suffix}`;
  }

  if (/^Zone\s+[A-Z]$/i.test(value)) {
    const suffix = value.replace(/^Zone\s+/i, '');
    return `${language === 'hi' ? 'ज़ोन' : 'झोन'} ${suffix}`;
  }

  if (value === 'All Wards') {
    return language === 'hi' ? 'सभी वार्ड' : 'सर्व वॉर्ड';
  }

  if (value === 'All Zones') {
    return language === 'hi' ? 'सभी ज़ोन' : 'सर्व झोन';
  }

  return value;
}

function byLanguage<T>(
  language: AppLanguage,
  values: Record<AppLanguage, T>
): T {
  return values[language];
}
