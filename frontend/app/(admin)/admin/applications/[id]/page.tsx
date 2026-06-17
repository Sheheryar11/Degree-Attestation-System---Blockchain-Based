'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { applicationsApi } from '@/lib/api/applications';
import { humanizeStatus, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, Shield, Link2, CheckCircle } from 'lucide-react';

type Payment = {
  id: string;
  status: string;
  method: string;
  amount: number;
  transactionId: string | null;
  bankName: string | null;
  paymentDate: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

type AppDetail = {
  id: string;
  trackingNumber: string;
  status: string;
  totalFee: number | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  student: { id: string; email: string };
  degreeDetail: { universityName?: string; degreeName?: string; degreeProgram?: string; graduationYear?: number } | null;
  attestationDetail: { attestationType?: string; numberOfCopies?: number; priority?: string; deliveryMethod?: string } | null;
  voucher: { voucherNumber: string; amount: number; expiresAt: string } | null;
  payments: Payment[];
  blockchainRecord: { degreeId: string; degreeHash: string | null; txHash: string | null; blockNumber: number | null; status: string; registeredAt: string | null } | null;
  documents: { id: string; type: string; originalFilename: string; cloudinaryUrl: string }[];
};

export default function AdminApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationsApi.getById(id),
  });

  const app: AppDetail | undefined = data?.data;
  const latestPayment = app?.payments?.[0] ?? null;

  const rejectMutation = useMutation({
    mutationFn: () => applicationsApi.adminReject(id, rejectReason),
    onSuccess: () => {
      toast.success('Application rejected');
      qc.invalidateQueries({ queryKey: ['application', id] });
      setRejectReason('');
    },
    onError: () => toast.error('Failed to reject application'),
  });

  const forceCompleteMutation = useMutation({
    mutationFn: () => applicationsApi.adminComplete(id),
    onSuccess: () => {
      toast.success('Approved — blockchain registration triggered');
      qc.invalidateQueries({ queryKey: ['application', id] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'Failed to approve'),
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (!app) return <div className="flex h-screen items-center justify-center text-muted-foreground">Application not found</div>;

  return (
    <div className="flex flex-col h-screen">
      <Header title={`Application ${app.trackingNumber}`} />
      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* Back button + Status bar */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Student</p>
            <p className="font-medium">{app.student.email}</p>
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Total Fee</p>
            <p className="font-medium">{app.totalFee ? formatCurrency(app.totalFee) : '—'}</p>
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Submitted</p>
            <p className="font-medium">{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'}</p>
          </div>
          <Badge className="text-sm px-3 py-1">{humanizeStatus(app.status)}</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Degree Details */}
          <Card>
            <CardHeader><CardTitle className="text-base">Degree Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="University" value={app.degreeDetail?.universityName} />
              <Row label="Degree" value={app.degreeDetail?.degreeName} />
              <Row label="Program" value={app.degreeDetail?.degreeProgram} />
              <Row label="Graduation Year" value={app.degreeDetail?.graduationYear?.toString()} />
            </CardContent>
          </Card>

          {/* Attestation Details */}
          <Card>
            <CardHeader><CardTitle className="text-base">Attestation Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Type" value={app.attestationDetail?.attestationType} />
              <Row label="Copies" value={app.attestationDetail?.numberOfCopies?.toString()} />
              <Row label="Priority" value={app.attestationDetail?.priority} />
              <Row label="Delivery" value={app.attestationDetail?.deliveryMethod} />
            </CardContent>
          </Card>

          {/* Voucher */}
          {app.voucher && (
            <Card>
              <CardHeader><CardTitle className="text-base">Payment Voucher</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Voucher No." value={app.voucher.voucherNumber} />
                <Row label="Amount" value={formatCurrency(app.voucher.amount)} />
                <Row label="Expires" value={new Date(app.voucher.expiresAt).toLocaleDateString()} />
              </CardContent>
            </Card>
          )}

          {/* Payment record */}
          {latestPayment && (
            <Card>
              <CardHeader><CardTitle className="text-base">Payment Record</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Method" value={latestPayment.method?.replace(/_/g, ' ')} />
                <Row label="Transaction ID" value={latestPayment.transactionId} mono />
                <Row label="Bank / Network" value={latestPayment.bankName} />
                <Row label="Amount" value={formatCurrency(latestPayment.amount)} />
                <Row label="Status" value={latestPayment.status} />
                <Row label="Payment Date" value={latestPayment.paymentDate ? new Date(latestPayment.paymentDate).toLocaleDateString() : undefined} />
              </CardContent>
            </Card>
          )}

          {/* Blockchain Record */}
          {app.blockchainRecord && (
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Blockchain Record</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Degree ID" value={app.blockchainRecord.degreeId} mono />
                {app.blockchainRecord.degreeHash && <Row label="Degree Hash" value={app.blockchainRecord.degreeHash} mono />}
                <Row label="Tx Hash" value={app.blockchainRecord.txHash ?? 'Pending'} mono />
                {app.blockchainRecord.blockNumber && <Row label="Block #" value={String(app.blockchainRecord.blockNumber)} />}
                <Row label="Status" value={app.blockchainRecord.status} />
                {app.blockchainRecord.registeredAt && <Row label="Registered" value={new Date(app.blockchainRecord.registeredAt).toLocaleString()} />}
                {app.blockchainRecord.txHash?.startsWith('0x') && (
                  <a
                    href={`https://amoy.polygonscan.com/tx/${app.blockchainRecord.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline pt-1"
                  >
                    <Link2 className="h-3 w-3" /> View on PolygonScan
                  </a>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Documents */}
        {app.documents.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Uploaded Documents</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {app.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.cloudinaryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent transition-colors text-sm"
                  >
                    <span className="font-medium">{doc.type.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground truncate text-xs">{doc.originalFilename}</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin approve — shown for any application waiting on payment verification */}
        {['PAYMENT_SUBMITTED', 'PAYMENT_PENDING'].includes(app.status) && latestPayment && (
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" /> Verify Payment & Register on Blockchain
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Student has submitted payment proof. Click below to verify the payment, trigger blockchain registration, and auto-generate the attestation certificate.
              </p>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => forceCompleteMutation.mutate()}
                disabled={forceCompleteMutation.isPending}
              >
                {forceCompleteMutation.isPending ? 'Processing…' : 'Verify Payment & Complete Attestation'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Admin Reject Application */}
        {!['COMPLETED', 'REJECTED', 'WITHDRAWN'].includes(app.status) && (
          <Card className="border-destructive/30">
            <CardHeader><CardTitle className="text-base text-destructive">Reject Application</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {app.rejectionReason && (
                <p className="text-sm text-destructive">Previous reason: {app.rejectionReason}</p>
              )}
              <Textarea
                placeholder="Reason for rejection…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
              />
              <Button
                variant="destructive"
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
              >
                Reject Application
              </Button>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${mono ? 'font-mono text-xs break-all text-right' : ''}`}>{value ?? '—'}</span>
    </div>
  );
}
