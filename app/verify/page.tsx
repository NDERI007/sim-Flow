'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { useAuthStore } from '../lib/AuthStore';
import { supabase } from '../lib/supabase';
import RegistrationForm from '../components/registrationForm';

export default function VerifyPage() {
  const { accessToken } = useAuthStore();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<
    'checking' | 'expired' | 'valid' | 'error'
  >('checking');
  const [email, setEmail] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    const checkToken = async () => {
      try {
        const { data, error } = await supabase
          .from('pending_registrations')
          .select('email')
          .eq('token', token)
          .lte('token_expires_at', new Date().toISOString()) // Ensure it hasn't expired
          .single();

        if (error || !data) {
          setStatus('expired');
        } else {
          setEmail(data.email);
          setStatus('valid');
        }
      } catch {
        setStatus('error');
      }
    };

    checkToken();
  }, [token]);

  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown === 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleResend = async () => {
    try {
      await axios.post(
        '/api/resend-handler',
        { email },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      setResendSuccess(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (status === 'checking') return <p>Verifying token...</p>;

  if (status === 'valid') {
    return <RegistrationForm />;
  }

  if (status === 'expired') {
    return (
      <div className="mt-10 space-y-4 text-center">
        <p className="text-red-600">This verification link has expired.</p>

        {resendSuccess ? (
          <p className="text-green-600">
            A new link has been sent to your email.
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            className={`rounded px-4 py-2 text-white ${
              cooldown > 0
                ? 'cursor-not-allowed bg-gray-400'
                : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Link'}
          </button>
        )}
      </div>
    );
  }

  return <p className="text-red-600">Invalid or missing verification token.</p>;
}
