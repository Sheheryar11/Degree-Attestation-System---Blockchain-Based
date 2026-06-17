'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { applicationsApi } from '@/lib/api/applications';
import { humanizeStatus, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { FileText, CheckCircle, XCircle, Eye } from 'lucide-react';

const STATUS_TABS = [
  { label: 'Needs Action', value: 'PAYMENT_SUBMITTED', description: 'Payment submitted — awaiting your approval' },
  { label: 'All',          value: '',                  description: 'Every application in the system' },
  { label: 'In Progress',  value: 'PAYMENT_PENDING',   description: 'Voucher issued, student yet to pay' },
  { label: 'Completed',    value: 'COMPLETED',          description: 'Fully attested' },
  { label: 'Rejected',     value: 'REJECTED',           description: 'Rejected applications' },
];

type Application = {
  id: string;
  trackingNumber: string;
  status: string;
  attestationType: string;
  totalFee: number | null;
  submittedAt: string | null;
  createdAt: string;
  student: { id: string; email: string };
  degreeDetail: { universityName?: string; degreeName?: string } | null;
};

export default function AdminApplicationsPage() {
  const [activeTab, setActiveTab] = useState('PAYMENT_SUBMITTED');
  const [rejectTarget, setRejectTarget] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-applications', activeTab],
    queryFn: () => applicationsApi.listAll({ status: activeTab || undefined, take: 100 }),
  });

  // Separate count query for the "Needs Action" badge
  const { data: actionData } = useQuery({
    queryKey: ['admin-applications', 'PAYMENT_SUBMITTED'],
    queryFn: () => applicationsApi.listAll({ status: 'PAYMENT_SUBMITTED', take: 100 }),
    refetchInterval: 15000,
  });
  const needsActionCount = actionData?.data?.data?.length ?? 0;

  const apps: Application[] = data?.data?.data ?? [];

  const completeMutation = useMutation({
    mutationFn: (id: string) => applicationsApi.adminComplete(id),
    onSuccess: () => {
      toast.success('Application approved — blockchain registration triggered');
      qc.invalidateQueries({ queryKey: ['admin-applications'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      applicationsApi.adminReject(id, reason),
    onSuccess: () => {
      toast.success('Application rejected');
      setRejectTarget(null);
      setRejectReason('');
      qc.invalidateQueries({ queryKey: ['admin-applications'] });
    },
    onError: () => toast.error('Failed to reject'),
  });

  const currentTab = STATUS_TABS.find((t) => t.value === activeTab)!;

  return (
    <div className="flex flex-col h-screen">
      <Header title="Applications" />
      <div className="flex-1 overflow-auto p-6 space-y-4">

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map((t) => {
            const isActive = activeTab === t.value;
            const count = t.value === 'PAYMENT_SUBMITTED' ? needsActionCount : undefined;
            return (
              <button
                key={t.value}
                onClick={() => setActiveTab(t.value)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                {t.label}
                {count !== undefined && count > 0 && (
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                    isActive ? 'bg-white text-primary' : 'bg-destructive text-white'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab description */}
        <p className="text-xs text-muted-foreground">{currentTab.description}</p>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {activeTab === 'PAYMENT_SUBMITTED' ? 'No applications need action right now.' : 'No applications found.'}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tracking No.</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Degree / University</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fee</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Submitted</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {apps.map((app) => {
                  const needsApproval = app.status === 'PAYMENT_SUBMITTED';
                  return (
                    <tr key={app.id} className={`hover:bg-muted/30 transition-colors ${needsApproval ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs">{app.trackingNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{app.student.email}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-xs">{app.degreeDetail?.degreeName ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{app.degreeDetail?.universityName ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">{app.totalFee ? formatCurrency(app.totalFee) : '—'}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            app.status === 'COMPLETED'          ? 'default' :
                            app.status === 'REJECTED'            ? 'destructive' :
                            app.status === 'PAYMENT_SUBMITTED'   ? 'destructive' : 'secondary'
                          }
                          className="text-xs"
                        >
                          {humanizeStatus(app.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {needsApproval && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white text-xs gap-1"
                                onClick={() => completeMutation.mutate(app.id)}
                                disabled={completeMutation.isPending}
                              >
                                <CheckCircle className="h-3 w-3" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={() => { setRejectTarget(app); setRejectReason(''); }}
                              >
                                <XCircle className="h-3 w-3" />
                                Reject
                              </Button>
                            </>
                          )}
                          <Link href={`/admin/applications/${app.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                              <Eye className="h-3 w-3" /> View
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Rejecting <span className="font-mono font-medium">{rejectTarget?.trackingNumber}</span> for student{' '}
            <span className="font-medium">{rejectTarget?.student.email}</span>.
          </p>
          <Textarea
            placeholder="Reason for rejection (required)…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => rejectMutation.mutate({ id: rejectTarget!.id, reason: rejectReason })}
            >
              {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
