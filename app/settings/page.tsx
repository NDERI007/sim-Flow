'use client';

import { useEffect, useState } from 'react';
import SetupMfa from '../components/MFA-comp/SetUp';
import VerifyMfa from '../components/MFA-comp/verifyMFA';

import {
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { supabase } from '../lib/supabase/BrowserClient';
import { toast } from 'sonner';
import { generateRecoveryCodes } from '../lib/mfa/generateCodes';

export default function MfaSettings() {
  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [step, setStep] = useState<'setup' | 'verify' | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [ConfirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('users')
        .select('mfa_enabled')
        .eq('id', user.id)
        .single();

      setMfaEnabled(data?.mfa_enabled ?? false);
      setLoading(false);
    };

    checkStatus();
  }, []);

  const handleDisableMfa = async () => {
    setDisabling(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('users')
      .update({ mfa_enabled: false, totp_secret: null })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to disable MFA');
    } else {
      toast.success('MFA disabled');
      setMfaEnabled(false);
    }

    setDisabling(false);
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-2xl px-4">
        <Card
          sx={{
            backgroundColor: '#1e1b2e',
            color: 'white',
            borderRadius: '16px',
            p: 3,
          }}
          elevation={4}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Multi-Factor Authentication
            </Typography>

            {step === 'setup' && <SetupMfa onNext={() => setStep('verify')} />}
            {step === 'verify' && (
              <VerifyMfa
                onComplete={() => {
                  setMfaEnabled(true);
                  setStep(null);
                }}
              />
            )}

            {!step && (
              <>
                {mfaEnabled ? (
                  <>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={handleDisableMfa}
                      disabled={disabling}
                      fullWidth
                      style={{ marginBottom: 12 }}
                    >
                      {disabling ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        'Disable MFA'
                      )}
                    </Button>

                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => setConfirmOpen(true)}
                      disabled={regenerating}
                      fullWidth
                    >
                      {regenerating ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        'Regenerate Recovery Codes'
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setStep('setup')}
                    fullWidth
                  >
                    Enable MFA
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={ConfirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Regenerate Recovery Codes</DialogTitle>
        <DialogContent>
          <Typography>
            This will replace your existing recovery codes. You won&apos;t be
            able to use the old ones. Do you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setConfirmOpen(false);
              setRegenerating(true);
              const result = await generateRecoveryCodes();

              if (result.success && result.codes) {
                const blob = new Blob([result.codes.join('\n')], {
                  type: 'text/plain',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'recovery-codes.txt';
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Recovery codes regenerated');
              } else {
                toast.error(result.error || 'Something went wrong');
              }

              setRegenerating(false);
            }}
            color="primary"
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
