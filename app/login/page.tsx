'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch (err) {
      console.error('Supabase initialization error:', err);
      return null;
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabase) {
      setErrorMsg('Supabase client failed to load.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 font-sans text-black">
      <div className="w-full max-w-md bg-white border-2 border-black rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Banner */}
        <div className="bg-black text-white p-6 border-b-4 border-red-600 text-center">
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">
            Wedding Portal
          </h1>
          <p className="text-xs text-red-500 font-bold tracking-widest uppercase mt-1">
            Digital Invitation Dashboard
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5">
          {errorMsg && (
            <div className="bg-red-50 border-2 border-red-600 text-red-600 p-3 rounded-xl text-xs font-bold text-center">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-2.5 border-2 border-black rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-red-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 border-2 border-black rounded-xl text-sm font-bold text-black focus:ring-2 focus:ring-red-600 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl uppercase text-xs tracking-wider transition border-2 border-black shadow-lg disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In To Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}