'use client';

import React, { FormEvent, useMemo, useState } from 'react';
import { LockKeyhole, Search, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  authenticateEmployee,
  createEmployeeAccount,
  CreateEmployeeErrorCode,
  EmployeeDirectoryEntry,
  EmployeeRole,
  EmployeeSession,
  getEmployeeDirectory,
  getEmployeeRoleLabel,
  getEmployeeScopeLabel,
} from '@/lib/employee-auth';
import { AppLanguage } from '@/lib/language';

interface LoginPanelProps {
  language: AppLanguage;
  onLogin: (employee: EmployeeSession) => void;
}

type PanelMode = 'login' | 'register';

const WARD_OPTIONS = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5'];
const ZONE_OPTIONS = ['Zone A', 'Zone B', 'Zone C'];

export default function LoginPanel({ language, onLogin }: LoginPanelProps) {
  const [mode, setMode] = useState<PanelMode>('login');
  const [directorySearch, setDirectorySearch] = useState('');
  const [employees, setEmployees] = useState<EmployeeDirectoryEntry[]>(() =>
    getEmployeeDirectory()
  );

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerForm, setRegisterForm] = useState({
    displayName: '',
    employeeId: '',
    password: '',
    role: 'officer' as EmployeeRole,
    primaryWard: '',
    primaryZone: '',
  });

  const copy = getLoginCopy(language);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = directorySearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return employees;
    }

    return employees.filter((employee) =>
      [
        employee.displayName,
        employee.employeeId,
        employee.primaryWard,
        employee.primaryZone,
        employee.role,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [directorySearch, employees]);

  const customEmployeeCount = useMemo(
    () => employees.filter((employee) => employee.isCustom).length,
    [employees]
  );

  const handleDirectorySelect = (employee: EmployeeDirectoryEntry) => {
    setMode('login');
    setEmployeeId(employee.employeeId);
    setPassword(employee.isCustom ? '' : getSuggestedPassword(employee.role));
    setLoginError('');
    setRegisterError('');
    setNotice(employee.isCustom ? copy.customAccountSelected : copy.demoFilled);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setLoginError('');

    const session = authenticateEmployee(employeeId, password);
    if (!session) {
      setSubmitting(false);
      setNotice('');
      setLoginError(copy.invalidCredentials);
      return;
    }

    onLogin(session);
    setSubmitting(false);
  };

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegistering(true);
    setRegisterError('');
    setNotice('');

    const result = createEmployeeAccount(registerForm);
    if (!result.success) {
      setRegistering(false);
      setRegisterError(getCreateEmployeeErrorMessage(result.code, copy));
      return;
    }

    setEmployees(getEmployeeDirectory());
    setMode('login');
    setEmployeeId(result.session.employeeId);
    setPassword(registerForm.password);
    setRegisterForm({
      displayName: '',
      employeeId: '',
      password: '',
      role: 'officer',
      primaryWard: '',
      primaryZone: '',
    });
    setRegisterError('');
    setLoginError('');
    setNotice(copy.accountCreated);
    setRegistering(false);
  };

  const isOfficerRegistration = registerForm.role === 'officer';

  return (
    <div className="flex h-full items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-7xl gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[30px] border border-sky-100 bg-[linear-gradient(135deg,rgba(20,90,103,0.96),rgba(11,34,58,0.94))] p-6 text-white shadow-[0_30px_80px_rgba(15,23,42,0.2)] sm:p-8">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90">
                  <ShieldCheck className="h-4 w-4" />
                  {copy.workspaceBadge}
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                    {copy.title}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-50/88 sm:text-base">
                    {copy.description}
                  </p>
                </div>
              </div>

              <div className="grid min-w-[220px] gap-3 sm:grid-cols-3 xl:min-w-[300px] xl:grid-cols-1">
                <StatCard icon={<Users className="h-4 w-4" />} label={copy.totalEmployeesLabel} value={String(employees.length)} />
                <StatCard icon={<UserPlus className="h-4 w-4" />} label={copy.customEmployeesLabel} value={String(customEmployeeCount)} />
                <StatCard icon={<LockKeyhole className="h-4 w-4" />} label={copy.loginModesLabel} value={copy.loginModesValue} />
              </div>
            </div>

            <div className="rounded-[26px] border border-white/14 bg-white/8 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{copy.directoryTitle}</h3>
                  <p className="mt-1 text-sm text-sky-50/75">{copy.directorySubtitle}</p>
                </div>
                <div className="relative w-full max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-100/70" />
                  <Input
                    value={directorySearch}
                    onChange={(event) => setDirectorySearch(event.target.value)}
                    placeholder={copy.searchPlaceholder}
                    className="border-white/10 bg-white/10 pl-9 text-white placeholder:text-sky-100/60"
                  />
                </div>
              </div>

              <div className="mt-4 grid max-h-[420px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {filteredEmployees.length ? (
                  filteredEmployees.map((employee) => (
                    <button
                      key={employee.employeeId}
                      type="button"
                      onClick={() => handleDirectorySelect(employee)}
                      className="rounded-2xl border border-white/14 bg-white/8 px-4 py-4 text-left transition hover:border-white/28 hover:bg-white/12"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{employee.displayName}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-sky-100/70">{employee.employeeId}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="rounded-full border border-white/16 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-50/90">
                            {getEmployeeRoleLabel(employee.role, language)}
                          </span>
                          {employee.isCustom ? (
                            <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                              {copy.newJoinerBadge}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-sky-50/80">{getEmployeeScopeLabel(employee, language)}</p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/20 bg-white/6 px-4 py-6 text-sm text-sky-50/80 sm:col-span-2">
                    {copy.noEmployeesFound}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] sm:p-8">
          <div className="mx-auto max-w-md">
            <div className="mb-6 flex gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setRegisterError('');
                  setNotice('');
                }}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {copy.signInTab}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setLoginError('');
                  setNotice('');
                }}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {copy.registerTab}
              </button>
            </div>

            {mode === 'login' ? (
              <>
                <div className="mb-8">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{copy.formTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{copy.formSubtitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Field label={copy.employeeIdLabel}>
                    <Input
                      value={employeeId}
                      onChange={(event) => setEmployeeId(event.target.value.toUpperCase())}
                      placeholder={copy.employeeIdPlaceholder}
                      autoComplete="username"
                    />
                  </Field>

                  <Field label={copy.passwordLabel}>
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={copy.passwordPlaceholder}
                      autoComplete="current-password"
                    />
                  </Field>

                  {notice ? <Banner tone="success">{notice}</Banner> : null}
                  {loginError ? <Banner tone="error">{loginError}</Banner> : null}

                  <Button
                    type="submit"
                    className="h-11 w-full bg-sky-700 text-white hover:bg-sky-800"
                    disabled={submitting || !employeeId.trim() || !password.trim()}
                  >
                    {submitting ? copy.signingIn : copy.signIn}
                  </Button>
                </form>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">{copy.demoAccessTitle}</p>
                  <p className="mt-2">{copy.demoAccessDescription}</p>
                  <p className="mt-2">{copy.demoPasswordOfficer}</p>
                  <p className="mt-1">{copy.demoPasswordAdmin}</p>
                  <p className="mt-1">{copy.demoPasswordAnalyst}</p>
                </div>
              </>
            ) : (
              <>
                <div className="mb-8">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{copy.registerTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{copy.registerSubtitle}</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <Field label={copy.nameLabel}>
                    <Input
                      value={registerForm.displayName}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, displayName: event.target.value }))}
                      placeholder={copy.namePlaceholder}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={copy.employeeIdLabel}>
                      <Input
                        value={registerForm.employeeId}
                        onChange={(event) => setRegisterForm((current) => ({ ...current, employeeId: event.target.value.toUpperCase() }))}
                        placeholder={copy.newEmployeeIdPlaceholder}
                      />
                    </Field>

                    <Field label={copy.passwordLabel}>
                      <Input
                        type="password"
                        value={registerForm.password}
                        onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                        placeholder={copy.newPasswordPlaceholder}
                      />
                    </Field>
                  </div>

                  <Field label={copy.roleLabel}>
                    <select
                      value={registerForm.role}
                      onChange={(event) => {
                        const nextRole = event.target.value as EmployeeRole;
                        setRegisterForm((current) => ({
                          ...current,
                          role: nextRole,
                          primaryWard: nextRole === 'officer' ? current.primaryWard : '',
                          primaryZone: nextRole === 'officer' ? current.primaryZone : '',
                        }));
                      }}
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="officer">{getEmployeeRoleLabel('officer', language)}</option>
                      <option value="analyst">{getEmployeeRoleLabel('analyst', language)}</option>
                      <option value="admin">{getEmployeeRoleLabel('admin', language)}</option>
                    </select>
                  </Field>

                  {isOfficerRegistration ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={copy.wardLabel}>
                        <select
                          value={registerForm.primaryWard}
                          onChange={(event) => setRegisterForm((current) => ({ ...current, primaryWard: event.target.value }))}
                          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        >
                          <option value="">{copy.selectWardPlaceholder}</option>
                          {WARD_OPTIONS.map((ward) => (
                            <option key={ward} value={ward}>
                              {ward}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label={copy.zoneLabel}>
                        <select
                          value={registerForm.primaryZone}
                          onChange={(event) => setRegisterForm((current) => ({ ...current, primaryZone: event.target.value }))}
                          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        >
                          <option value="">{copy.selectZonePlaceholder}</option>
                          {ZONE_OPTIONS.map((zone) => (
                            <option key={zone} value={zone}>
                              {zone}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={copy.wardLabel}>
                        <Input value={copy.allWardsValue} disabled />
                      </Field>
                      <Field label={copy.zoneLabel}>
                        <Input value={copy.allZonesValue} disabled />
                      </Field>
                    </div>
                  )}

                  {registerError ? <Banner tone="error">{registerError}</Banner> : null}

                  <Button type="submit" className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700" disabled={registering}>
                    {registering ? copy.creatingAccount : copy.createAccount}
                  </Button>
                </form>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">{copy.registerInfoTitle}</p>
                  <p className="mt-2">{copy.registerInfoBody}</p>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: 'success' | 'error';
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl px-4 py-3 text-sm ${
        tone === 'success'
          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border border-rose-200 bg-rose-50 text-rose-700'
      }`}
    >
      {children}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/14 bg-white/8 px-4 py-3">
      <div className="flex items-center gap-2 text-sky-100/85">{icon}</div>
      <p className="mt-3 text-xs uppercase tracking-[0.14em] text-sky-100/70">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function getSuggestedPassword(role: EmployeeRole): string {
  if (role === 'admin') {
    return 'admin123';
  }

  if (role === 'analyst') {
    return 'analyst123';
  }

  return 'taxbot123';
}

function getCreateEmployeeErrorMessage(
  code: CreateEmployeeErrorCode,
  copy: ReturnType<typeof getLoginCopy>
): string {
  switch (code) {
    case 'display_name_required':
      return copy.nameRequired;
    case 'employee_id_required':
      return copy.idRequired;
    case 'employee_id_invalid':
      return copy.idInvalid;
    case 'employee_id_taken':
      return copy.idTaken;
    case 'password_too_short':
      return copy.passwordTooShort;
    case 'ward_required':
      return copy.wardRequired;
    case 'zone_required':
      return copy.zoneRequired;
    default:
      return copy.invalidCredentials;
  }
}

function getLoginCopy(language: AppLanguage) {
  const base = {
    workspaceBadge: 'Secure Employee Workspace',
    title: 'Flexible TaxBot access for current staff and new joiners',
    description:
      'Employees can still sign in before opening TaxBot, and now new users can be added from the same screen as your team grows.',
    totalEmployeesLabel: 'Total employees',
    customEmployeesLabel: 'New joiners',
    loginModesLabel: 'Access modes',
    loginModesValue: 'Sign in + Add user',
    directoryTitle: 'Employee directory',
    directorySubtitle:
      'Search the directory, autofill a user card, or add more employees as your team grows.',
    searchPlaceholder: 'Search by name, ID, ward, or zone',
    noEmployeesFound:
      'No matching employee was found. Open the Add Employee tab to create a new account.',
    newJoinerBadge: 'New',
    signInTab: 'Sign In',
    registerTab: 'Add Employee',
    formTitle: 'Employee Login',
    formSubtitle:
      'Enter your employee ID and password. After a successful login, the current TaxBot window will open.',
    employeeIdLabel: 'Employee ID',
    employeeIdPlaceholder: 'For example ADMIN01 or OFC101',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    invalidCredentials: 'The employee ID or password is incorrect.',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    demoAccessTitle: 'Quick Access',
    demoAccessDescription:
      'Click any default employee card on the left to autofill the correct ID and a suggested password.',
    demoPasswordOfficer: 'Officer password: taxbot123',
    demoPasswordAdmin: 'Admin password: admin123',
    demoPasswordAnalyst: 'Analyst password: analyst123',
    registerTitle: 'Add a new employee',
    registerSubtitle:
      'Create a local employee account so another team member can also log in and use the current TaxBot workspace.',
    nameLabel: 'Full name',
    namePlaceholder: 'For example Neha Sharma',
    newEmployeeIdPlaceholder: 'For example OFC220',
    newPasswordPlaceholder: 'At least 6 characters',
    roleLabel: 'Role',
    wardLabel: 'Ward',
    zoneLabel: 'Zone',
    selectWardPlaceholder: 'Select a ward',
    selectZonePlaceholder: 'Select a zone',
    allWardsValue: 'All Wards',
    allZonesValue: 'All Zones',
    createAccount: 'Create account',
    creatingAccount: 'Creating account...',
    registerInfoTitle: 'Flexible onboarding',
    registerInfoBody:
      'New employee accounts are stored in this browser so the same machine can support more staff logins without editing code each time.',
    accountCreated:
      'New employee added. The new credentials are filled in for you. Sign in to continue.',
    customAccountSelected:
      'Custom employee selected. Enter the password you created for this account.',
    demoFilled:
      'The employee ID and a suggested password were filled in for quick sign in.',
    nameRequired: 'Employee name is required.',
    idRequired: 'Employee ID is required.',
    idInvalid:
      'Employee ID must be 4-20 uppercase letters, numbers, underscores, or hyphens.',
    idTaken: 'That employee ID is already in use.',
    passwordTooShort: 'Password must be at least 6 characters long.',
    wardRequired: 'Please choose a ward for an officer account.',
    zoneRequired: 'Please choose a zone for an officer account.',
  };

  if (language === 'hi') {
    return {
      ...base,
      workspaceBadge: 'सुरक्षित कर्मचारी कार्यक्षेत्र',
      title: 'Flexible TaxBot access नए और मौजूदा कर्मचारियों के लिए',
      description:
        'कर्मचारी पहले login कर सकते हैं और अब उसी screen से नए users भी जोड़े जा सकते हैं.',
      totalEmployeesLabel: 'कुल कर्मचारी',
      customEmployeesLabel: 'नए user',
      searchPlaceholder: 'नाम, ID, ward या zone खोजें',
      noEmployeesFound: 'कोई matching employee नहीं मिला। Add Employee tab से नया user जोड़ें.',
      newJoinerBadge: 'नया',
      formSubtitle:
        'Employee ID और password दर्ज करें। सफल login के बाद current TaxBot window खुलेगी.',
      employeeIdPlaceholder: 'जैसे ADMIN01 या OFC101',
      passwordPlaceholder: 'अपना password दर्ज करें',
      invalidCredentials: 'Employee ID या password सही नहीं है.',
      signIn: 'Login करें',
      signingIn: 'Login हो रहा है...',
      registerTitle: 'नया employee जोड़ें',
      registerSubtitle:
        'नया local account बनाइए ताकि दूसरा user भी अपने login से TaxBot खोल सके.',
      namePlaceholder: 'जैसे Neha Sharma',
      newEmployeeIdPlaceholder: 'जैसे OFC220',
      newPasswordPlaceholder: 'कम से कम 6 characters',
      selectWardPlaceholder: 'Ward चुनें',
      selectZonePlaceholder: 'Zone चुनें',
      createAccount: 'Account बनाएं',
      creatingAccount: 'Account बन रहा है...',
      accountCreated: 'नया employee जोड़ दिया गया है। Login के लिए details भर दी गई हैं.',
      customAccountSelected: 'Custom employee चुना गया है। इस account का बनाया हुआ password दर्ज करें.',
      demoFilled: 'Quick login के लिए employee ID और suggested password भर दिया गया है.',
      nameRequired: 'Employee name जरूरी है.',
      idRequired: 'Employee ID जरूरी है.',
      idTaken: 'यह Employee ID पहले से use हो रही है.',
      passwordTooShort: 'Password कम से कम 6 characters का होना चाहिए.',
      wardRequired: 'Officer account के लिए ward चुनना जरूरी है.',
      zoneRequired: 'Officer account के लिए zone चुनना जरूरी है.',
    };
  }

  if (language === 'mr') {
    return {
      ...base,
      workspaceBadge: 'सुरक्षित कर्मचारी कार्यक्षेत्र',
      title: 'Flexible TaxBot access नवीन आणि सध्याच्या कर्मचाऱ्यांसाठी',
      description:
        'कर्मचारी आधी login करू शकतात आणि आता त्याच screen वर नवीन users देखील जोडता येतात.',
      totalEmployeesLabel: 'एकूण कर्मचारी',
      customEmployeesLabel: 'नवीन user',
      searchPlaceholder: 'नाव, ID, ward किंवा zone शोधा',
      noEmployeesFound: 'जुळणारा employee सापडला नाही. Add Employee tab मधून नवीन user जोडा.',
      newJoinerBadge: 'नवीन',
      formSubtitle:
        'Employee ID आणि password टाका. यशस्वी login नंतर current TaxBot window उघडेल.',
      employeeIdPlaceholder: 'उदा. ADMIN01 किंवा OFC101',
      passwordPlaceholder: 'तुमचा password टाका',
      invalidCredentials: 'Employee ID किंवा password चुकीचा आहे.',
      signIn: 'Login करा',
      signingIn: 'Login सुरू आहे...',
      registerTitle: 'नवीन employee जोडा',
      registerSubtitle:
        'नवीन local account तयार करा जेणेकरून दुसरा user देखील आपल्या login ने TaxBot उघडू शकेल.',
      namePlaceholder: 'उदा. Neha Sharma',
      newEmployeeIdPlaceholder: 'उदा. OFC220',
      newPasswordPlaceholder: 'किमान 6 characters',
      selectWardPlaceholder: 'Ward निवडा',
      selectZonePlaceholder: 'Zone निवडा',
      createAccount: 'Account तयार करा',
      creatingAccount: 'Account तयार होत आहे...',
      accountCreated: 'नवीन employee जोडला आहे. Login साठी details भरल्या आहेत.',
      customAccountSelected: 'Custom employee निवडला आहे. या account साठी तयार केलेला password टाका.',
      demoFilled: 'Quick login साठी employee ID आणि suggested password भरला आहे.',
      nameRequired: 'Employee name आवश्यक आहे.',
      idRequired: 'Employee ID आवश्यक आहे.',
      idTaken: 'हा Employee ID आधीपासून वापरात आहे.',
      passwordTooShort: 'Password किमान 6 characters चा हवा.',
      wardRequired: 'Officer account साठी ward निवडणे आवश्यक आहे.',
      zoneRequired: 'Officer account साठी zone निवडणे आवश्यक आहे.',
    };
  }

  return base;
}
