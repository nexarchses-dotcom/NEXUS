import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-toastify';
import Logo from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfig } from '../context/ConfigContext.jsx';

export default function Login() {
  const { loginWithGoogle } = useAuth();
  const { config } = useConfig();
  const [busy, setBusy] = useState(false);

  async function handleCredential(resp) {
    setBusy(true);
    try {
      await loginWithGoogle(resp.credential);
      toast.success('Signed in');
    } catch (e) {
      toast.error(e.code === 'UNAUTHENTICATED' ? 'No account for this Google email.' : e.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          {/* node mark on white needs the dark wordmark, so render mark only here */}
          <div className="bg-primary rounded-lg p-3"><Logo showWordmark={false} height={36} /></div>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">{config.AppName || 'NEXUS Trade & Enterprise'}</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">Sign in to continue</p>
        <div className="flex justify-center">
          {busy
            ? <span className="text-sm text-gray-500">Signing in…</span>
            : <GoogleLogin onSuccess={handleCredential} onError={() => toast.error('Google sign-in failed')} />}
        </div>
        <p className="text-xs text-gray-400 mt-8">Powered by CYRABELL</p>
      </div>
    </div>
  );
}
