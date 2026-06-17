'use client';

import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { blockchainApi } from '@/lib/api/blockchain';
import { humanizeStatus } from '@/lib/utils';
import { Shield } from 'lucide-react';

type BlockchainRecord = {
  id: string;
  degreeId: string;
  degreeHash: string | null;
  txHash: string | null;
  blockNumber: number | null;
  status: string;
  registeredAt: string | null;
  createdAt: string;
  application: {
    trackingNumber: string;
    student: { email: string };
    degreeDetail: { universityName?: string; degreeName?: string } | null;
  };
};

export default function AdminBlockchainPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'blockchain-records'],
    queryFn: () => blockchainApi.listAll(),
  });

  const records: BlockchainRecord[] = data?.data ?? [];

  return (
    <div className="flex flex-col h-full">
      <Header title="Blockchain Records" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-8 rounded bg-muted animate-pulse" />)}
              </div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center">
                <Shield className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">No blockchain records yet</p>
                <p className="text-xs text-muted-foreground mt-1">Records appear here once an application's payment is approved and degree registration begins.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Degree ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tracking #</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Degree</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tx Hash</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Block</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{r.degreeId}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.application.trackingNumber}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.application.student.email}</td>
                      <td className="px-4 py-3 text-xs">{r.application.degreeDetail?.degreeName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            r.status === 'CONFIRMED' ? 'default' :
                            r.status === 'FAILED' || r.status === 'REVOKED' ? 'destructive' :
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {humanizeStatus(r.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs max-w-[160px] truncate" title={r.txHash ?? ''}>{r.txHash ?? '—'}</td>
                      <td className="px-4 py-3 text-xs">{r.blockNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.registeredAt ? new Date(r.registeredAt).toLocaleDateString() : '—'}
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
