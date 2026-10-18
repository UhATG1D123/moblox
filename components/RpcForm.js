'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Generic admin form: calls a database function. The database checks permissions.
export default function RpcForm({ title, rpc, fields, button = 'Submit' }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const params = {};
    for (const f of fields) {
      let v = fd.get(f.name);
      if (f.type === 'checkbox') v = v === 'on';
      else if (v === '' || v === null) v = null;
      else if (f.type === 'number') {
        v = Number(v);
        if (!Number.isSafeInteger(v)) { setMsg(`${f.label} must be a safe whole number.`); return; }
        if (f.min !== undefined && v < f.min) { setMsg(`${f.label} must be at least ${f.min}.`); return; }
        if (f.max !== undefined && v > f.max) { setMsg(`${f.label} must be no more than ${f.max}.`); return; }
      }
      params[f.param] = v;
    }
    setBusy(true); setMsg('');
    const { error } = await createClient().rpc(rpc, params);
    setBusy(false);
    if (error) setMsg('Error: ' + error.message);
    else { setMsg('Done.'); form.reset(); router.refresh(); }
  }

  return (
    <form onSubmit={submit} className="aform">
      <h3>{title}</h3>
      {fields.map((f) => (
        <label key={f.name}>
          <span>{f.label}</span>
          {f.options ? (
            <select name={f.name} required={f.required}>
              {f.options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          ) : f.type === 'checkbox' ? (
            <input name={f.name} type="checkbox" defaultChecked />
          ) : (
            <input name={f.name} type={f.type || 'text'} required={f.required} min={f.min} max={f.max} step={f.type === 'number' ? 1 : undefined} />
          )}
        </label>
      ))}
      <button className="btn primary" disabled={busy}>{busy ? 'Working...' : button}</button>
      {msg && <p className="note">{msg}</p>}
    </form>
  );
}
