'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { applicationsApi } from '@/lib/api/applications';
import { humanizeStatus, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { FileText, CreditCard, Award, Clock, Plus } from 'lucide-react';

export default function StudentDashboard() {
  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications', 'mine'],
    queryFn: () => applicationsApi.list(),
  });

  const apps = applications?.data?.data ?? [];
  const pending = apps.filter((a: { status: string }) => !['COMPLETED', 'REJECTED', 'WITHDRAWN'].includes(a.status));
  const completed = apps.filter((a: { status: string }) => a.status === 'COMPLETED');

  return (
    <div className="flex flex-col h-full">
      <Header title="Student Dashboard" />
      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="Total Applications" value={apps.length} color="text-blue-500" />
          <StatCard icon={Clock} label="In Progress" value={pending.length} color="text-amber-500" />
          <StatCard icon={Award} label="Completed" value={completed.length} color="text-green-500" />
          <StatCard icon={CreditCard} label="Pending Payment" value={apps.filter((a: { status: string }) => a.status === 'PAYMENT_PENDING').length} color="text-red-500" />
        </div>

        {/* Quick action */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent Applications</h2>
          <Button asChild size="sm">
            <Link href="/student/applications/new"><Plus className="mr-2 h-4 w-4" />New Application</Link>
          </Button>
        </div>

        {/* Applications table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
            ) : apps.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">No applications yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start by submitting a new degree attestation request.</p>
                <Button asChild className="mt-4" size="sm">
                  <Link href="/student/applications/new">Get Started</Link>
                </Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Application ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fee</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {apps.slice(0, 10).map((app: { id: string; trackingNumber: string; attestationType: string; status: string; totalFee?: number; createdAt: string }) => (
                    <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{app.trackingNumber ?? app.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">{app.attestationType?.replace('_', ' ')}</td>
                      <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                      <td className="px-4 py-3">{app.totalFee ? formatCurrency(app.totalFee) : '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(app.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/student/applications/${app.id}`}>View</Link>
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

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'COMPLETED' ? 'default' :
    status === 'REJECTED' ? 'destructive' :
    status === 'PAYMENT_PENDING' ? 'destructive' :
    'secondary';
  return <Badge variant={variant}>{humanizeStatus(status)}</Badge>;
}
