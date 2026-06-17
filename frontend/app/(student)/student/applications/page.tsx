'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { applicationsApi } from '@/lib/api/applications';
import { humanizeStatus, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';

export default function MyApplicationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['applications', 'mine'],
    queryFn: () => applicationsApi.list(),
  });

  const apps = data?.data?.data ?? [];

  return (
    <div className="flex flex-col h-full">
      <Header title="My Applications" />
      <div className="flex-1 overflow-auto p-6 space-y-4">
        <div className="flex justify-end">
          <Button asChild size="sm">
            <Link href="/student/applications/new"><Plus className="mr-2 h-4 w-4" />New Application</Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Loading applications...</div>
            ) : apps.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">No applications found</p>
                <Button asChild className="mt-4" size="sm">
                  <Link href="/student/applications/new">Submit First Application</Link>
                </Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tracking #</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Attestation Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fee</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitted</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {apps.map((app: { id: string; trackingNumber: string; attestationType: string; status: string; totalFee?: number; createdAt: string }) => (
                    <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{app.trackingNumber ?? app.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">{app.attestationType?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">
                        <Badge variant={app.status === 'COMPLETED' ? 'default' : app.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                          {humanizeStatus(app.status)}
                        </Badge>
                      </td>
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
