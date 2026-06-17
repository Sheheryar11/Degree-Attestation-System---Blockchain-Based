'use client';

import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { certificatesApi } from '@/lib/api/certificates';
import { Award, Download, ExternalLink, ShieldCheck } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001';

// pdfUrl may be a full Cloudinary URL or a local /uploads/... path
function resolvePdfUrl(pdfUrl: string) {
  return pdfUrl.startsWith('http') ? pdfUrl : `${API_BASE}${pdfUrl}`;
}

type Certificate = {
  id: string;
  pdfUrl: string;
  qrCodeUrl: string | null;
  generatedAt: string;
  application: {
    trackingNumber: string;
    attestationType: string;
    degreeDetail: { universityName?: string; degreeName?: string; graduationYear?: number } | null;
    blockchainRecord: { degreeId: string; status: string; txHash: string | null } | null;
  };
};

export default function StudentCertificatesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['certificates', 'mine'],
    queryFn: () => certificatesApi.mine(),
  });

  const certs: Certificate[] = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="My Certificates" />
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="My Certificates" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {certs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-muted-foreground gap-3">
            <Award className="h-10 w-10" />
            <p className="text-sm">No certificates yet. Complete an attestation to receive your blockchain-verified certificate.</p>
          </div>
        ) : (
          certs.map((cert) => (
            <Card key={cert.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                      {cert.application.degreeDetail?.degreeName ?? 'Degree Certificate'}
                    </CardTitle>
                    <CardDescription>
                      {cert.application.degreeDetail?.universityName} · {cert.application.degreeDetail?.graduationYear}
                    </CardDescription>
                  </div>
                  <Badge variant="default">Attested</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Tracking Number</p>
                    <p className="font-mono font-medium">{cert.application.trackingNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Degree ID</p>
                    <p className="font-mono font-medium text-xs">{cert.application.blockchainRecord?.degreeId ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Attestation Type</p>
                    <p className="font-medium">{cert.application.attestationType.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Generated On</p>
                    <p className="font-medium">{new Date(cert.generatedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {cert.application.blockchainRecord?.txHash && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                    <p className="text-muted-foreground font-medium">Blockchain Transaction</p>
                    <p className="font-mono break-all">{cert.application.blockchainRecord.txHash}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <Button asChild size="sm" className="gap-2">
                    <a href={resolvePdfUrl(cert.pdfUrl)} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-4 w-4" />
                      Download Certificate
                    </a>
                  </Button>
                  {cert.application.blockchainRecord?.degreeId && (
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <a href={`/verify?degreeId=${cert.application.blockchainRecord.degreeId}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Verify Online
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
