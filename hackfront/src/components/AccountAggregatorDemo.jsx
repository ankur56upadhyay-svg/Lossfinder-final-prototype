import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

const PHONE_DEMO_CODE = '123456';
const BANK_DEMO_CODES = { 'demo-daily': '654321', 'demo-digital': '246810' };
const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-[#E2E5EA] dark:border-[#2A3040] bg-[#F5F6F8] dark:bg-[#0F1419] text-[#0B1F3A] dark:text-[#E8ECF1] text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40';

export default function AccountAggregatorDemo() {
  const { aaDemoAccounts, loadAccountAggregatorDemo } = useApp();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [available, setAvailable] = useState([]);
  const [selected, setSelected] = useState([]);
  const [bankCodes, setBankCodes] = useState({});
  const [error, setError] = useState('');

  function close() {
    setOpen(false);
    setStep('phone');
    setPhone('');
    setPhoneCode('');
    setAvailable([]);
    setSelected([]);
    setBankCodes({});
    setError('');
  }

  function continueFromPhone(event) {
    event.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.');
      return;
    }
    setError('');
    setStep('phone-otp');
  }

  function verifyPhoneCode(event) {
    event.preventDefault();
    if (phoneCode !== PHONE_DEMO_CODE) {
      setError('That is not the demo phone OTP. Enter 123456 to continue.');
      return;
    }
    // The last digit assigns one or two fictional accounts for this simulation only.
    const assigned = Number(phone.at(-1)) % 2 === 0 ? aaDemoAccounts : aaDemoAccounts.slice(0, 1);
    setAvailable(assigned);
    setSelected(assigned.map(account => account.id));
    setError('');
    setStep('banks');
  }

  function toggleBank(id) {
    setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
    setError('');
  }

  function continueFromBanks() {
    if (!selected.length) { setError('Select at least one fictional bank account.'); return; }
    setError('');
    setStep('bank-otp');
  }

  function verifyBankCodes(event) {
    event.preventDefault();
    if (selected.some(id => bankCodes[id] !== BANK_DEMO_CODES[id])) {
      setError('Enter the displayed demo bank OTP for each selected account.');
      return;
    }
    try {
      loadAccountAggregatorDemo(selected);
    } catch (cause) {
      setError(cause.message || 'Could not load the fictional bank accounts.');
    }
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="af-btn af-btn-secondary lf-aa-compact w-full mt-4">
    <span className="material-symbols-outlined text-base" aria-hidden="true">smartphone</span>
    Try phone login demo
    <span className="lf-aa-fictional">Fictional data</span>
  </button>;

  return <section className="af-card mt-5 text-left" aria-labelledby="phone-demo-title">
    <div className="flex items-start gap-3">
      <span className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-xl" aria-hidden="true">smartphone</span>
      </span>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="phone-demo-title" className="font-semibold text-sm">Phone login demo</h2>
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Fictional data</span>
        </div>
        <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-1">This simulates phone and bank verification. No SMS is sent, no bank is contacted, and no account is created. Never enter a real OTP here.</p>
      </div>
    </div>

    <button type="button" onClick={close} className="af-btn af-btn-secondary mt-4 w-full py-2.5 text-sm">Close demo</button>

    <div className="mt-4 border-t border-[#E2E5EA] dark:border-[#2A3040] pt-4 space-y-4">
      {step === 'phone' && <form onSubmit={continueFromPhone} className="space-y-3">
        <label htmlFor="demo-phone" className="block text-sm font-semibold">Mobile number for demo</label>
        <input id="demo-phone" type="tel" inputMode="numeric" autoComplete="off" maxLength={10} value={phone} onChange={event => { setPhone(event.target.value.replace(/\D/g, '')); setError(''); }} placeholder="10-digit Indian mobile number" className={inputClass} />
        <p className="text-xs text-[#5A6B80] dark:text-[#8899AA]">The number is used only to choose fictional bank options on this screen. It is not sent or stored.</p>
        <button type="submit" className="af-btn af-btn-primary w-full">Continue to demo OTP</button>
      </form>}

      {step === 'phone-otp' && <form onSubmit={verifyPhoneCode} className="space-y-3">
        <div><h3 className="text-sm font-semibold">Enter demo phone OTP</h3><p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-1">No SMS was sent. Demo code: <strong>123456</strong>.</p></div>
        <input type="text" inputMode="numeric" autoComplete="off" maxLength={6} value={phoneCode} onChange={event => { setPhoneCode(event.target.value.replace(/\D/g, '')); setError(''); }} aria-label="Demo phone OTP" className={inputClass} />
        <div className="flex gap-2"><button type="button" onClick={() => { setStep('phone'); setError(''); }} className="af-btn af-btn-secondary">Back</button><button type="submit" className="af-btn af-btn-primary flex-1">Verify demo OTP</button></div>
      </form>}

      {step === 'banks' && <div className="space-y-3">
        <div><h3 className="text-sm font-semibold">Choose demo bank accounts</h3><p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-1">This number shows {available.length} fictional {available.length === 1 ? 'account' : 'accounts'} for the demo. These are not banks linked to your real number.</p></div>
        <div className="space-y-2" role="group" aria-label="Fictional bank accounts">{available.map(account => <label key={account.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#E2E5EA] dark:border-[#2A3040] cursor-pointer"><input type="checkbox" checked={selected.includes(account.id)} onChange={() => toggleBank(account.id)} className="accent-blue-600" /><span className="text-xs"><strong className="block text-sm">{account.bank}</strong>{account.account}</span></label>)}</div>
        <div className="flex gap-2"><button type="button" onClick={() => { setStep('phone-otp'); setError(''); }} className="af-btn af-btn-secondary">Back</button><button type="button" onClick={continueFromBanks} disabled={!selected.length} className="af-btn af-btn-primary flex-1 disabled:opacity-50">Continue to demo bank OTP</button></div>
      </div>}

      {step === 'bank-otp' && <form onSubmit={verifyBankCodes} className="space-y-3">
        <div><h3 className="text-sm font-semibold">Enter demo bank OTPs</h3><p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-1">These codes are displayed here for testing. No real bank OTP is requested or verified.</p></div>
        {available.filter(account => selected.includes(account.id)).map(account => <div key={account.id}><label htmlFor={`demo-bank-code-${account.id}`} className="block text-xs font-semibold mb-1">{account.bank} demo OTP · {BANK_DEMO_CODES[account.id]}</label><input id={`demo-bank-code-${account.id}`} type="text" inputMode="numeric" autoComplete="off" maxLength={6} value={bankCodes[account.id] || ''} onChange={event => { setBankCodes(current => ({ ...current, [account.id]: event.target.value.replace(/\D/g, '') })); setError(''); }} className={inputClass} /></div>)}
        <div className="flex gap-2"><button type="button" onClick={() => { setStep('banks'); setError(''); }} className="af-btn af-btn-secondary">Back</button><button type="submit" className="af-btn af-btn-primary flex-1">View fictional analysis</button></div>
      </form>}

      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <p className="text-[11px] text-[#5A6B80] dark:text-[#8899AA] text-center">Demo only. A real phone sign-in or bank connection needs a verified provider integration.</p>
    </div>
  </section>;
}
