import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../lib/api.js';
import Logo from '../components/Logo.jsx';

export default function Portal() {
  const [session, setSession] = useState(api.portalToken ? { token: api.portalToken } : null);
  const [tab, setTab] = useState('products');

  if (!session) return <PortalLogin onLogin={(s) => setSession(s)} />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary text-white">
        <div className="mx-auto max-w-4xl px-4 h-14 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            {['products', 'rfq', 'orders', 'help'].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded text-sm capitalize ${tab === t ? 'bg-white/15' : 'text-white/80 hover:bg-white/10'}`}>{t}</button>
            ))}
            <button onClick={() => { api.setPortalToken(''); setSession(null); }}
              className="px-3 py-1.5 rounded text-sm bg-white/10">Sign out</button>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-6">
        {tab === 'products' && <PortalProducts />}
        {tab === 'rfq' && <PortalRfq />}
        {tab === 'orders' && <PortalOrders />}
        {tab === 'help' && <PortalChat />}
      </main>
      <footer className="py-4 text-center text-xs text-gray-400">Powered by CYRABELL</footer>
    </div>
  );
}

function PortalLogin({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', reference: '', name: '', companyName: '', phone: '' });
  const [ref, setRef] = useState(null);

  async function submit() {
    try {
      if (mode === 'register') {
        const { data } = await api.portalRegister(form);
        setRef(data.reference); toast.success('Registered — save your reference code'); setMode('login');
      } else {
        const { data } = await api.portalLogin({ email: form.email, reference: form.reference });
        api.setPortalToken(data.token); onLogin({ token: data.token, user: data.user });
        toast.success('Welcome');
      }
    } catch (e) { toast.error(e.message); }
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-center mb-4"><div className="bg-primary rounded-lg p-3"><Logo showWordmark={false} height={32} /></div></div>
        <h1 className="text-lg font-semibold text-center">Customer Portal</h1>
        <p className="text-sm text-gray-500 text-center mb-5">{mode === 'login' ? 'Sign in with your email + reference' : 'Register for portal access'}</p>
        {ref && <p className="text-xs bg-green-50 text-green-700 p-2 rounded mb-3">Your reference: <b>{ref}</b> — keep it safe.</p>}
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded mb-2" />
        {mode === 'login'
          ? <input placeholder="Reference code" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded mb-3" />
          : <>
              <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded mb-2" />
              <input placeholder="Company" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded mb-3" />
            </>}
        <button onClick={submit} className="w-full px-4 py-2 text-sm rounded bg-primary text-white hover:bg-primary-dark mb-3">
          {mode === 'login' ? 'Sign in' : 'Register'}
        </button>
        <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="w-full text-sm text-primary hover:underline">
          {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}

function PortalProducts() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.portalProducts().then(({ data }) => setItems(data || [])).catch((e) => toast.error(e.message)); }, []);
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Product Catalogue</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.length === 0 && <p className="text-sm text-gray-400">No products available.</p>}
        {items.map((p) => (
          <div key={p.productId} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="font-medium">{p.name}</p>
            <p className="text-sm text-gray-500">{p.category} · {p.unit}</p>
            <p className="text-sm text-gray-600 mt-1">{p.priceRange}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PortalRfq() {
  const [form, setForm] = useState({ title: '', quantity: 1, unit: '', description: '' });
  async function submit() {
    try { await api.portalSubmitRfq(form); toast.success('RFQ submitted'); setForm({ title: '', quantity: 1, unit: '', description: '' }); }
    catch (e) { toast.error(e.message); }
  }
  return (
    <div className="max-w-md">
      <h2 className="text-xl font-semibold mb-4">Submit an RFQ</h2>
      <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded mb-2" />
      <div className="flex gap-2 mb-2">
        <input type="number" placeholder="Qty" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          className="w-24 px-3 py-2 text-sm border border-gray-300 rounded" />
        <input placeholder="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded" />
      </div>
      <textarea placeholder="Details" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded mb-3" rows={3} />
      <button onClick={submit} className="px-4 py-2 text-sm rounded bg-primary text-white hover:bg-primary-dark">Submit RFQ</button>
    </div>
  );
}

function PortalOrders() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { api.portalOrders().then(({ data }) => setOrders(data || [])).catch((e) => toast.error(e.message)); }, []);
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">My Orders</h2>
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-primary-soft text-left"><th className="px-3 py-2">Order</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Status</th></tr></thead>
          <tbody>
            {orders.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">No orders yet.</td></tr>}
            {orders.map((o) => (
              <tr key={o.orderId} className="border-t border-gray-100">
                <td className="px-3 py-2">{String(o.orderId).slice(0, 8)}</td><td className="px-3 py-2">{o.quantity}</td>
                <td className="px-3 py-2">{o.totalAmount}</td><td className="px-3 py-2">{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PortalChat() {
  const [msgs, setMsgs] = useState([{ from: 'bot', text: 'Hi! Ask me about orders, quotes, or payments.' }]);
  const [input, setInput] = useState('');
  async function send() {
    if (!input.trim()) return;
    const q = input; setMsgs((m) => [...m, { from: 'me', text: q }]); setInput('');
    try { const { data } = await api.portalChatbot(q); setMsgs((m) => [...m, { from: 'bot', text: data.response }]); }
    catch { setMsgs((m) => [...m, { from: 'bot', text: 'Sorry, something went wrong.' }]); }
  }
  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold mb-4">Help</h2>
      <div className="bg-white rounded-lg border border-gray-200 p-4 h-80 overflow-y-auto space-y-2 mb-3">
        {msgs.map((m, i) => (
          <div key={i} className={`text-sm ${m.from === 'me' ? 'text-right' : ''}`}>
            <span className={`inline-block px-3 py-1.5 rounded-lg ${m.from === 'me' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}>{m.text}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type a question…" className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded" />
        <button onClick={send} className="px-4 py-2 text-sm rounded bg-primary text-white hover:bg-primary-dark">Send</button>
      </div>
    </div>
  );
}
