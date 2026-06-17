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
import { FileText, User, GraduationCap, FileCheck, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

type App = {
  id: string;
  trackingNumber: string;
  status: string;
  attestationType: string;
  totalFee?: number;
  rejectionReason?: string;
  submittedAt?: string;
  createdAt: string;
  student?: { email: string };
  personalDetail?: {
    firstName?: string;
    lastName?: string;
    fatherName?: string;
    cnic?: string;
    phone?: string;
    address?: string;
  } | null;
  degreeDetail?: {
    universityName?: string;
    degreeName?: string;
    programName?: string;
    graduationYear?: number;
    rollNumber?: string;
    registrationNumber?: string;
  } | null;
  attestationDetail?: {
    numberOfCopies?: number;
    priority?: string;
    deliveryMethod?: string;
    destinationCountry?: string;
    purposeOfAttestation?: string;
  } | null;
  documents?: {
    id: string;
    documentType: string;
    fileName: string;
    fileUrl: string;
    createdAt: string;
  }[];
};

export default function OfficerApplicationReview() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['applications', id],
    queryFn: () => applicationsApi.getById(id),
  });

  const app: App | undefined = data?.data;

  const reviewMutation = useMutation({
    mutationFn: ({ decision, rejectionReason }: { decision: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) =>
      applicationsApi.officerReview(id, decision, rejectionReason),
    onSuccess: (_, { decision }) => {
      toast.success(`Application ${decision === 'APPROVED' ? 'approved' : 'rejected'}`);
      qc.invalidateQueries({ queryKey: ['applications', id] });
      router.push('/officer/applications');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'Review failed'),
  });

  const canReview = app?.status === 'SUBMITTED' || app?.status === 'UNDER_REVIEW';

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Review Application" />
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Not Found" />
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Application not found.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={`Review — ${app.trackingNumber}`} />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-3 ml-auto">
              <Badge variant={app.status === 'OFFICER_APPROVED' ? 'default' : app.status === 'OFFICER_REJECTED' ? 'destructive' : 'secondary'}>
                {humanizeStatus(app.status)}
              </Badge>
              {app.totalFee && (
                <span className="text-sm text-muted-foreground">Fee: <strong>{formatCurrency(app.totalFee)}</strong></span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Student Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" /> Student Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Email" value={app.student?.email} />
                <InfoRow label="Full Name" value={[app.personalDetail?.firstName, app.personalDetail?.lastName].filter(Boolean).join(' ')} />
                <InfoRow label="Father Name" value={app.personalDetail?.fatherName} />
                <InfoRow label="CNIC" value={app.personalDetail?.cnic} />
                <InfoRow label="Phone" value={app.personalDetail?.phone} />
                <InfoRow label="Address" value={app.personalDetail?.address} />
              </CardContent>
            </Card>

            {/* Degree Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" /> Degree Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="University" value={app.degreeDetail?.universityName} />
                <InfoRow label="Degree" value={app.degreeDetail?.degreeName} />
                <InfoRow label="Program" value={app.degreeDetail?.programName} />
                <InfoRow label="Graduation Year" value={app.degreeDetail?.graduationYear?.toString()} />
                <InfoRow label="Roll Number" value={app.degreeDetail?.rollNumber} />
                <InfoRow label="Registration #" value={app.degreeDetail?.registrationNumber} />
              </CardContent>
            </Card>

            {/* Attestation Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileCheck className="h-4 w-4" /> Attestation Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Type" value={app.attestationType?.replace(/_/g, ' ')} />
                <InfoRow label="Copies" value={app.attestationDetail?.numberOfCopies?.toString()} />
                <InfoRow label="Priority" value={app.attestationDetail?.priority} />
                <InfoRow label="Delivery" value={app.attestationDetail?.deliveryMethod?.replace(/_/g, ' ')} />
                <InfoRow label="Destination" value={app.attestationDetail?.destinationCountry} />
                <InfoRow label="Purpose" value={app.attestationDetail?.purposeOfAttestation} />
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Documents ({app.documents?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!app.documents?.length ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded.</p>
                ) : (
                  <ul className="space-y-2">
                    {app.documents.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{doc.documentType.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                        </div>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          View
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Review Actions */}
          {canReview && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Officer Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {showRejectBox ? (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Provide a reason for rejection (required)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={() => reviewMutation.mutate({ decision: 'REJECTED', rejectionReason: reason })}
                        disabled={!reason.trim() || reviewMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Confirm Rejection
                      </Button>
                      <Button variant="outline" onClick={() => setShowRejectBox(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => reviewMutation.mutate({ decision: 'APPROVED' })}
                      disabled={reviewMutation.isPending}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Application
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectBox(true)}
                      disabled={reviewMutation.isPending}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Application
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!canReview && app.rejectionReason && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <strong>Rejection Reason:</strong> {app.rejectionReason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value || '—'}</span>
    </div>
  );
}
