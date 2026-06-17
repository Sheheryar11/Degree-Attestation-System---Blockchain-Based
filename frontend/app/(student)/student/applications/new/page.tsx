'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMutation } from '@tanstack/react-query';
import { applicationsApi } from '@/lib/api/applications';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, Globe, Building2, ArrowRight } from 'lucide-react';

const TYPES = [
  {
    id: 'DOMESTIC',
    label: 'Domestic Attestation',
    description: 'For use within Pakistan. Verified by HEC for local employment and further education.',
    icon: Building2,
    fee: 'PKR 3,000',
  },
  {
    id: 'INTERNATIONAL',
    label: 'International Attestation',
    description: 'For use abroad. Full attestation chain: University → HEC → MOFA → Embassy.',
    icon: Globe,
    fee: 'PKR 8,000',
  },
  {
    id: 'DUPLICATE',
    label: 'Duplicate Degree',
    description: 'Replacement for a lost or damaged original degree certificate.',
    icon: FileText,
    fee: 'PKR 5,000',
  },
] as const;

export default function NewApplicationPage() {
  const router = useRouter();

  const createMutation = useMutation({
    mutationFn: (attestationType: string) => applicationsApi.create({ attestationType }),
    onSuccess: (data) => {
      toast.success('Application created — please complete all sections.');
      router.push(`/student/applications/${data.data.id}`);
    },
    onError: () => toast.error('Failed to create application. Please try again.'),
  });

  return (
    <div className="flex flex-col h-full">
      <Header title="New Application" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Choose Attestation Type</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select the type of degree attestation you need. You can save your progress and return later.
            </p>
          </div>

          <div className="grid gap-4">
            {TYPES.map((type) => (
              <Card key={type.id} className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg border bg-muted p-3">
                      <type.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{type.label}</CardTitle>
                        <Badge variant="secondary">{type.fee}</Badge>
                      </div>
                      <CardDescription className="mt-1">{type.description}</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => createMutation.mutate(type.id)}
                      disabled={createMutation.isPending}
                    >
                      Start <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            * Fees shown are base fees. Additional charges may apply for priority processing or courier delivery.
          </p>
        </div>
      </div>
    </div>
  );
}
