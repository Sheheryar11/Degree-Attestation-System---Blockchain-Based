'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const mutation = useMutation({
    mutationFn: () => authApi.verifyEmail(token),
    onSuccess: () => setStatus('success'),
    onError: () => setStatus('error'),
  });

  useEffect(() => {
    if (token) mutation.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <Card>
      <CardContent className="pt-6 text-center space-y-4">
        {status === 'idle' && (
          <p className="text-sm text-muted-foreground">Verifying your email address...</p>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
            <p className="text-sm font-medium text-green-600">Email verified successfully!</p>
            <p className="text-sm text-muted-foreground">Your account is now active. Please log in to continue.</p>
            <Button asChild className="w-full">
              <Link href="/login">Log In</Link>
            </Button>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <p className="text-sm font-medium text-destructive">Verification failed</p>
            <p className="text-sm text-muted-foreground">The link may be invalid or expired. Please contact support.</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Back to Login</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Email Verification</h1>
        </div>
        <Suspense fallback={<Card><CardContent className="pt-6 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
