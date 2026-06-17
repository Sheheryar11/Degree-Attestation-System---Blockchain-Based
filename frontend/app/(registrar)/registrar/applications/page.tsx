'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { applicationsApi } from '@/lib/api/applications';
import { humanizeStatus } from '@/lib/utils';
import { ClipboardList } from 'lucide-react';

const REGISTRAR_STATUSES = [
  'OFFICER_APPROVED',
  'REGISTRAR_REVIEW',
  'REGISTRAR_APPROVED',
  'REGISTRAR_REJECTED',
  'PAYMENT_PENDING',
  'PAYMENT_SUBMITTED',
  'PAYMENT_VERIFIED',
  'COMPLETED',
];

export default function RegistrarApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState('OFFICER_APPROVED');

  const { data, isLoading } = useQuery({
    queryKey: ['applications', 'all', statusFilter],
    queryFn: () => applicationsApi.listAll({ status: statusFilter }),
  });

  const apps = data?.data?.data ?? [];

  return (
    <div className="flex flex-col h-full">
      <Header title="Applications" />
      <div className="flex-1 overflow-auto p-6 space-y-4">

        <div className="flex gap-2 flex-wrap">
          {REGISTRAR_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-accent'
              }`}
            >
              {humanizeStatus(s)}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
            ) : apps.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">No applications in this status</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tracking #</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fee</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitted</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {apps.map((app: {
                    id: string;
                    trackingNumber: string;
                    student?: { email: string };
                    attestationType: string;
                    totalFee?: number;
                    status: string;
                    submittedAt?: string;
                    createdAt: string;
                  }) => (
                    <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{app.trackingNumber ?? app.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{app.student?.email ?? '—'}</td>
                      <td className="px-4 py-3">{app.attestationType?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {app.totalFee ? `PKR ${app.totalFee.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{humanizeStatus(app.status)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(app.submittedAt ?? app.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/registrar/applications/${app.id}`}>Review</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
