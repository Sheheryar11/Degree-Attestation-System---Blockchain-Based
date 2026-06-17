'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { applicationsApi } from '@/lib/api/applications';
import { humanizeStatus } from '@/lib/utils';
import Link from 'next/link';
import { ClipboardList, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function OfficerDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['applications', 'all', 'officer'],
    queryFn: () => applicationsApi.listAll({ status: 'UNDER_REVIEW' }),
  });

  const pending = data?.data?.data ?? [];

  return (
    <div className="flex flex-col h-full">
      <Header title="Officer Dashboard" />
      <div className="flex-1 overflow-auto p-6 space-y-6">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{pending.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">—</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected Today</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">—</p></CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Applications Awaiting Review</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/officer/applications">View All</Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
            ) : pending.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">No applications pending review</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tracking #</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitted</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pending.slice(0, 10).map((app: { id: string; trackingNumber: string; student?: { email: string }; attestationType: string; status: string; submittedAt?: string; createdAt: string }) => (
                    <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{app.trackingNumber ?? app.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">{app.student?.email ?? '—'}</td>
                      <td className="px-4 py-3">{app.attestationType?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3"><Badge variant="secondary">{humanizeStatus(app.status)}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(app.submittedAt ?? app.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/officer/applications/${app.id}`}>Review</Link>
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
