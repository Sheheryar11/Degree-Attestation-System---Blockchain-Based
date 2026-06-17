'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PersonalDetailsForm } from '@/components/application/personal-details-form';
import { DegreeDetailsForm } from '@/components/application/degree-details-form';
import { AttestationDetailsForm } from '@/components/application/attestation-details-form';
import { DocumentUploadForm } from '@/components/application/document-upload-form';
import { applicationsApi } from '@/lib/api/applications';
import { humanizeStatus, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { CheckCircle, Circle, ChevronRight } from 'lucide-react';

const STEPS = [
  { id: 0, label: 'Personal Details',    description: 'Your identity information' },
  { id: 1, label: 'Degree Details',      description: 'Academic credentials' },
  { id: 2, label: 'Attestation Options', description: 'Type, priority & delivery' },
  { id: 3, label: 'Documents',           description: 'Upload supporting documents' },
  { id: 4, label: 'Review & Submit',     description: 'Confirm and submit' },
];

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [step, setStep] = useState(0);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['applications', id],
    queryFn: () => applicationsApi.getById(id),
  });

  const app = data?.data;
  const isEditable = !app || ['DRAFT', 'RETURNED'].includes(app.status);

  const submitMutation = useMutation({
    mutationFn: () => applicationsApi.submit(id),
    onSuccess: () => {
      toast.success('Application submitted! A payment voucher has been generated.');
      qc.invalidateQueries({ queryKey: ['applications', id] });
      qc.invalidateQueries({ queryKey: ['applications', 'me'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'Submission failed'),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Application" />
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Application Not Found" />
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Application not found.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={`Application — ${app.trackingNumber}`} />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Status banner */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={app.status === 'COMPLETED' ? 'default' : app.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                {humanizeStatus(app.status)}
              </Badge>
              {app.totalFee && (
                <span className="text-sm text-muted-foreground">Total fee: <span className="font-medium">{formatCurrency(app.totalFee)}</span></span>
              )}
            </div>
            {app.rejectionReason && (
              <p className="text-sm text-destructive">Reason: {app.rejectionReason}</p>
            )}
          </div>

          {/* Stepper + content */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            {/* Sidebar steps */}
            <nav className="space-y-1">
              {STEPS.map((s) => {
                const isActive = step === s.id;
                const isDone = step > s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => isEditable && setStep(s.id)}
                    className={`w-full flex items-start gap-3 rounded-lg p-3 text-left transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                    disabled={!isEditable && !isDone}
                  >
                    <span className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : isActive ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4 opacity-40" />
                      )}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{s.label}</span>
                      <span className={`block text-xs ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{s.description}</span>
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Step content */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{STEPS[step].label}</CardTitle>
                <CardDescription>{STEPS[step].description}</CardDescription>
              </CardHeader>
              <CardContent>
                {step === 0 && (
                  <PersonalDetailsForm onComplete={() => setStep(1)} />
                )}
                {step === 1 && (
                  <DegreeDetailsForm applicationId={id} onComplete={() => setStep(2)} />
                )}
                {step === 2 && (
                  <AttestationDetailsForm applicationId={id} onComplete={() => setStep(3)} />
                )}
                {step === 3 && (
                  <DocumentUploadForm applicationId={id} onComplete={() => setStep(4)} />
                )}
                {step === 4 && (
                  <ReviewStep app={app} onSubmit={() => submitMutation.mutate()} isPending={submitMutation.isPending} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  app,
  onSubmit,
  isPending,
}: {
  app: { status: string; totalFee?: number; attestationType: string; degreeDetail?: { universityName?: string; degreeName?: string } | null };
  onSubmit: () => void;
  isPending: boolean;
}) {
  const canSubmit = ['DRAFT', 'RETURNED'].includes(app.status);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <ReviewRow label="Attestation Type" value={app.attestationType?.replace(/_/g, ' ')} />
        <ReviewRow label="University" value={app.degreeDetail?.universityName ?? '—'} />
        <ReviewRow label="Degree" value={app.degreeDetail?.degreeName ?? '—'} />
        <ReviewRow label="Total Fee" value={app.totalFee ? formatCurrency(app.totalFee) : '—'} />
        <ReviewRow label="Status" value={humanizeStatus(app.status)} />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Before submitting:</strong> Ensure all documents are uploaded and all information matches your official documents. A payment voucher will be generated automatically after submission.
      </div>

      {canSubmit ? (
        <Button className="w-full" onClick={onSubmit} disabled={isPending}>
          {isPending ? 'Submitting...' : 'Submit Application'}
        </Button>
      ) : (
        <p className="text-sm text-center text-muted-foreground">
          This application has already been submitted (status: {humanizeStatus(app.status)}).
        </p>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? '—'}</span>
    </div>
  );
}
