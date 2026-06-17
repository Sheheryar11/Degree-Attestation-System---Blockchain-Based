'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

const schema = z.object({ email: z.string().email('Enter a valid email address') });
type ForgotPasswordInput = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: (values: ForgotPasswordInput) => authApi.forgotPassword(values.email),
    onSuccess: () => {
      toast.success('Reset link sent — check your inbox.');
    },
    onError: () => toast.error('Failed to send reset email. Please try again.'),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Forgot Password</h1>
          <p className="text-sm text-muted-foreground text-center">
            Enter your registered email address and we&apos;ll send you a reset link.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {mutation.isSuccess ? (
              <div className="text-center space-y-3">
                <p className="text-sm font-medium text-green-600">Email sent!</p>
                <p className="text-sm text-muted-foreground">
                  Check <span className="font-medium">{form.getValues('email')}</span> for a password reset link. It expires in 1 hour.
                </p>
                <Button variant="outline" asChild className="w-full mt-2">
                  <Link href="/login">Back to Login</Link>
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        <Link href="/login" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>
      </div>
    </div>
  );
}
