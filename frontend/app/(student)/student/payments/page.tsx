'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { applicationsApi } from '@/lib/api/applications';
import { paymentsApi, type PaymentMethodOption } from '@/lib/api/payments';
import apiClient from '@/lib/api/client';
import { humanizeStatus, formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ReceiptText, CreditCard, CheckCircle, Loader2, Link2, Shield } from 'lucide-react';

const PAYMENT_METHODS: { value: PaymentMethodOption; label: string; description: string; icon: string }[] = [
  { value: 'BANK_CHALLAN', label: 'Bank Challan', description: 'HBL / UBL / MCB deposit', icon: '🏦' },
  { value: 'EASYPAISA', label: 'EasyPaisa', description: 'Mobile wallet transfer', icon: '💚' },
  { value: 'JAZZCASH', label: 'JazzCash', description: 'Mobile wallet transfer', icon: '🟠' },
  { value: 'BLOCKCHAIN', label: 'Blockchain (MATIC)', description: 'Polygon Amoy Testnet', icon: '⛓️' },
];

const PAYMENT_INSTRUCTIONS: Record<PaymentMethodOption, { title: string; detail: string; txLabel: string; txPlaceholder: string }> = {
  BANK_CHALLAN: {
    title: 'Bank Account Details',
    detail: 'Deposit to: HBL — Account No. 01234567890123 (HEC Attestation Fund)',
    txLabel: 'Bank Transaction ID',
    txPlaceholder: 'TXN123456',
  },
  EASYPAISA: {
    title: 'EasyPaisa Account',
    detail: 'Send to: 0300-1234567 (HEC Official)',
    txLabel: 'EasyPaisa Transaction ID',
    txPlaceholder: 'EP123456789',
  },
  JAZZCASH: {
    title: 'JazzCash Account',
    detail: 'Send to: 0300-7654321 (HEC Official)',
    txLabel: 'JazzCash Transaction ID',
    txPlaceholder: 'JC123456789',
  },
  CARD: {
    title: 'Card Payment Reference',
    detail: 'Pay via HEC online portal and enter the reference number below.',
    txLabel: 'Payment Reference',
    txPlaceholder: 'REF123456',
  },
  BLOCKCHAIN: {
    title: 'Blockchain Wallet (Polygon Amoy)',
    detail: 'Send MATIC to the HEC wallet address:',
    txLabel: 'Blockchain Tx Hash',
    txPlaceholder: '0xabc123...',
  },
};

const paymentSchema = z.object({
  method: z.enum(['BANK_CHALLAN', 'EASYPAISA', 'JAZZCASH', 'CARD', 'BLOCKCHAIN']),
  transactionId: z.string().min(1, 'Transaction ID / Hash is required'),
  bankName: z.string().optional(),
  paymentDate: z.string().min(1, 'Payment date is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
});
type PaymentForm = z.infer<typeof paymentSchema>;

type BlockchainRecord = {
  degreeId: string;
  degreeHash: string | null;
  txHash: string | null;
  blockNumber: number | null;
  status: string;
  registeredAt: string | null;
};

type AppWithVoucher = {
  id: string;
  trackingNumber: string;
  status: string;
  totalFee?: number;
  attestationType: string;
  voucher?: {
    voucherNumber: string;
    amount: number;
    expiresAt: string;
  } | null;
  payments?: {
    id: string;
    transactionId: string | null;
    bankName: string | null;
    amount: number;
    method: string;
    paymentDate: string | null;
    status: string;
    createdAt: string;
  }[];
  blockchainRecord?: BlockchainRecord | null;
};

export default function StudentPaymentsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['applications', 'me'],
    queryFn: () => applicationsApi.list(),
    refetchOnMount: 'always',
    // Poll every 3s while any app is in-progress (no blockchain record yet, or awaiting confirmation)
    refetchInterval: (query) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: AppWithVoucher[] = (query.state.data as any)?.data?.data ?? [];
      const inProgress = items.some(
        (a) =>
          (['PAYMENT_PENDING', 'PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED'].includes(a.status) && !a.blockchainRecord) ||
          (a.status === 'PAYMENT_VERIFIED') ||
          (a.blockchainRecord?.status === 'PENDING'),
      );
      return inProgress ? 3000 : false;
    },
  });

  const apps: AppWithVoucher[] = (data?.data?.data ?? []).filter(
    (a: AppWithVoucher) => ['SUBMITTED', 'PAYMENT_PENDING', 'PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'COMPLETED'].includes(a.status),
  );

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Payments" />
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Payments" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground gap-3">
            <CreditCard className="h-10 w-10" />
            <p className="text-sm">No pending payments. Submit an application first to generate a payment voucher.</p>
          </div>
        ) : (
          apps.map((app) => (
            <PaymentCard key={app.id} app={app} onSubmit={() => qc.invalidateQueries({ queryKey: ['applications', 'me'] })} />
          ))
        )}
      </div>
    </div>
  );
}

function PaymentCard({ app, onSubmit }: { app: AppWithVoucher; onSubmit: () => void }) {
  const latestPayment = app.payments?.[0] ?? null;

  const generateMutation = useMutation({
    mutationFn: () => apiClient.post(`/applications/${app.id}/voucher/generate`),
    onSuccess: onSubmit,
  });

  useEffect(() => {
    if (app.status === 'SUBMITTED' && !app.voucher) {
      generateMutation.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.id, app.status, app.voucher]);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodOption>('BANK_CHALLAN');

  const form = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      method: 'BANK_CHALLAN',
      transactionId: '',
      bankName: '',
      paymentDate: new Date().toISOString().split('T')[0],
      amount: app.totalFee ?? 0,
    },
  });

  const submitMutation = useMutation({
    mutationFn: (values: PaymentForm) => {
      const autoBank =
        values.method === 'BLOCKCHAIN' ? 'Polygon Amoy' :
        values.method === 'EASYPAISA' ? 'EasyPaisa' :
        values.method === 'JAZZCASH' ? 'JazzCash' :
        values.bankName;
      return paymentsApi.submit(app.id, {
        method: values.method,
        transactionId: values.transactionId,
        bankName: autoBank,
        paymentDate: values.paymentDate,
        amount: values.amount,
      });
    },
    onSuccess: () => {
      toast.success('Payment submitted! Registering your degree on the blockchain…');
      onSubmit();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'Submission failed'),
  });

  const isSubmittable = app.status === 'PAYMENT_PENDING';
  const isCompleted = app.status === 'COMPLETED';
  const instruction = PAYMENT_INSTRUCTIONS[selectedMethod];

  if (app.status === 'SUBMITTED' && !app.voucher) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating your payment voucher…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{app.trackingNumber}</CardTitle>
            <CardDescription>{app.attestationType?.replace(/_/g, ' ')}</CardDescription>
          </div>
          <Badge variant={
            isCompleted ? 'default' :
            app.status === 'PAYMENT_REJECTED' ? 'destructive' : 'secondary'
          }>
            {humanizeStatus(app.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Voucher details */}
        {app.voucher && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium mb-3">
              <ReceiptText className="h-4 w-4" />
              Payment Voucher
            </div>
            <VoucherRow label="Voucher #" value={app.voucher.voucherNumber} />
            <VoucherRow label="Amount Due" value={formatCurrency(app.voucher.amount)} />
            <VoucherRow label="Valid Until" value={new Date(app.voucher.expiresAt).toLocaleDateString()} />
          </div>
        )}

        {/* Submitted payment info */}
        {latestPayment && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium mb-3">
              <CreditCard className="h-4 w-4" />
              Payment Submitted
            </div>
            <VoucherRow label="Method" value={latestPayment.method?.replace(/_/g, ' ')} />
            <VoucherRow label="Transaction ID" value={latestPayment.transactionId ?? '—'} />
            {latestPayment.bankName && <VoucherRow label="Bank / Network" value={latestPayment.bankName} />}
            <VoucherRow label="Amount" value={formatCurrency(latestPayment.amount)} />
            <VoucherRow label="Payment Date" value={latestPayment.paymentDate ? new Date(latestPayment.paymentDate).toLocaleDateString() : '—'} />
          </div>
        )}

        {/* Status banners */}
        {app.status === 'PAYMENT_SUBMITTED' && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            Payment proof submitted. Pending admin verification — you will be notified once your degree is registered.
          </div>
        )}

        {app.status === 'PAYMENT_VERIFIED' && !isCompleted && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            Payment received. Registering your degree on the blockchain…
          </div>
        )}

        {/* Blockchain record */}
        {app.blockchainRecord && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium mb-3 text-blue-800">
              <Shield className="h-4 w-4" />
              Blockchain Certificate Record
            </div>
            <VoucherRow label="Degree ID" value={app.blockchainRecord.degreeId} />
            {app.blockchainRecord.degreeHash && (
              <div className="flex justify-between text-sm gap-4">
                <span className="text-muted-foreground shrink-0">Degree Hash</span>
                <span className="font-mono text-xs break-all text-right">{app.blockchainRecord.degreeHash}</span>
              </div>
            )}
            {app.blockchainRecord.txHash && (
              <div className="flex justify-between text-sm gap-4">
                <span className="text-muted-foreground shrink-0">Tx Hash</span>
                <span className="font-mono text-xs break-all text-right">{app.blockchainRecord.txHash}</span>
              </div>
            )}
            {app.blockchainRecord.blockNumber && (
              <VoucherRow label="Block #" value={String(app.blockchainRecord.blockNumber)} />
            )}
            <VoucherRow
              label="Status"
              value={
                app.blockchainRecord.status === 'CONFIRMED' ? '✓ Confirmed' :
                app.blockchainRecord.status === 'PENDING' ? '⏳ Pending...' :
                app.blockchainRecord.status
              }
            />
            {app.blockchainRecord.registeredAt && (
              <VoucherRow label="Registered" value={new Date(app.blockchainRecord.registeredAt).toLocaleString()} />
            )}
            {app.blockchainRecord.txHash && app.blockchainRecord.txHash.startsWith('0x') && (
              <a
                href={`https://amoy.polygonscan.com/tx/${app.blockchainRecord.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline pt-1"
              >
                <Link2 className="h-3 w-3" />
                View on PolygonScan
              </a>
            )}
          </div>
        )}

        {/* Completed banner */}
        {isCompleted && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-800">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Attestation completed. Your degree has been registered on the blockchain.
            </div>
            <a
              href="/student/certificates"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 underline underline-offset-2"
            >
              View &amp; Download Your Attestation Certificate →
            </a>
          </div>
        )}

        {/* Payment form */}
        {isSubmittable && !latestPayment && (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => submitMutation.mutate(v))}
              className="space-y-5 pt-2 border-t"
            >
              <p className="text-sm font-medium pt-2">Submit Payment Proof</p>

              {/* Method selector */}
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(m.value);
                      form.setValue('method', m.value);
                    }}
                    className={cn(
                      'flex items-start gap-2 rounded-lg border p-3 text-left text-sm transition-colors',
                      selectedMethod === m.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:bg-accent',
                    )}
                  >
                    <span className="text-base">{m.icon}</span>
                    <span>
                      <span className="block font-medium">{m.label}</span>
                      <span className="block text-xs text-muted-foreground">{m.description}</span>
                    </span>
                  </button>
                ))}
              </div>

              {/* Payment instructions box */}
              <div className={cn(
                'rounded-lg border p-3 text-xs space-y-1',
                selectedMethod === 'BLOCKCHAIN' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'bg-muted/30',
              )}>
                <p className="font-medium text-sm">{instruction.title}</p>
                <p>{instruction.detail}</p>
                {selectedMethod === 'BLOCKCHAIN' && (
                  <p className="font-mono break-all pt-1 select-all">0x742d35Cc6634C0532925a3b8D4C0f29f7b39fa1</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="transactionId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{instruction.txLabel}</FormLabel>
                    <FormControl><Input placeholder={instruction.txPlaceholder} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {selectedMethod === 'BANK_CHALLAN' && (
                  <FormField control={form.control} name="bankName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl><Input placeholder="HBL / UBL / MCB" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="paymentDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Paid (PKR)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Button type="submit" disabled={submitMutation.isPending} className="w-full">
                {submitMutation.isPending ? 'Submitting...' : 'Submit Payment Proof'}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}

function VoucherRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? '—'}</span>
    </div>
  );
}
