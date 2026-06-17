'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { ShieldCheck, ShieldX, Loader2, Search, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { verificationApi } from '@/lib/api/verification';

const degreeIdSchema = z.object({ degreeId: z.string().min(3, 'Enter a valid Degree ID') });
const cnicSchema = z.object({ cnic: z.string().min(5, 'Enter a valid CNIC') });

type DegreeResult = {
  degreeId: string;
  status: string;
  university?: string;
  degree?: string;
  graduationYear?: number;
  registeredAt?: string;
  txHash?: string | null;
};

function ResultCard({ result }: { result: DegreeResult }) {
  const isValid = result.status === 'CONFIRMED';
  const isRevoked = result.status === 'REVOKED';

  return (
    <Card className={isValid ? 'border-green-400' : isRevoked ? 'border-red-400' : 'border-amber-400'}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <ShieldCheck className={`h-9 w-9 shrink-0 ${isValid ? 'text-green-600' : isRevoked ? 'text-red-500' : 'text-amber-500'}`} />
          <div>
            <CardTitle className="text-lg">
              {isValid ? 'Degree Verified ✓' : isRevoked ? 'Degree Revoked' : 'Degree Registered — Pending Confirmation'}
            </CardTitle>
            <Badge variant={isValid ? 'default' : isRevoked ? 'destructive' : 'secondary'} className="mt-1">
              {result.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
          <Row label="Degree ID" value={result.degreeId} mono />
          {result.university && <Row label="University" value={result.university} />}
          {result.degree && <Row label="Degree" value={result.degree} />}
          {result.graduationYear && <Row label="Graduation Year" value={String(result.graduationYear)} />}
          {result.registeredAt && <Row label="Attested On" value={new Date(result.registeredAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })} />}
        </div>

        {result.txHash && (
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Blockchain Transaction</p>
            <p className="font-mono text-xs break-all">{result.txHash}</p>
            {result.txHash.startsWith('0x') && (
              <a
                href={`https://amoy.polygonscan.com/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline pt-1"
              >
                <Link2 className="h-3 w-3" /> View on PolygonScan
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NotFoundCard() {
  return (
    <Card className="border-destructive">
      <CardContent className="pt-6 flex items-center gap-3">
        <ShieldX className="h-9 w-9 text-destructive shrink-0" />
        <div>
          <p className="font-semibold text-destructive">Degree Not Found</p>
          <p className="text-sm text-muted-foreground mt-1">
            No record exists for this ID. It may be invalid or not yet registered on the blockchain.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  const [results, setResults] = useState<DegreeResult[] | null>(null);
  const [notFound, setNotFound] = useState(false);

  const clear = () => { setResults(null); setNotFound(false); };

  const degreeIdForm = useForm({ resolver: zodResolver(degreeIdSchema), defaultValues: { degreeId: '' } });
  const cnicForm = useForm({ resolver: zodResolver(cnicSchema), defaultValues: { cnic: '' } });

  const { mutate: verifyById, isPending: pendingId } = useMutation({
    mutationFn: ({ degreeId }: { degreeId: string }) =>
      verificationApi.byDegreeId(degreeId).then((r) => r.data),
    onSuccess: (data) => { setResults([data]); setNotFound(false); },
    onError: () => { setResults(null); setNotFound(true); },
  });

  const { mutate: verifyCnic, isPending: pendingCnic } = useMutation({
    mutationFn: ({ cnic }: { cnic: string }) =>
      verificationApi.byCnic(cnic).then((r) => r.data),
    onSuccess: (data) => { setResults(Array.isArray(data) ? data : [data]); setNotFound(false); },
    onError: () => { setResults(null); setNotFound(true); },
  });

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Nav */}
      <nav className="border-b bg-background px-6 h-14 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <span className="font-semibold">HEC Degree Verification Portal</span>
        <span className="ml-auto text-xs text-muted-foreground">Powered by Polygon Blockchain</span>
      </nav>

      <div className="container mx-auto max-w-lg px-4 py-14">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Verify a Degree</h1>
          <p className="text-muted-foreground text-sm">
            Instantly verify any HEC-attested degree using its Degree ID or the student&apos;s CNIC
          </p>
        </div>

        <Tabs defaultValue="degreeId" onValueChange={clear}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="degreeId">By Degree ID</TabsTrigger>
            <TabsTrigger value="cnic">By CNIC</TabsTrigger>
          </TabsList>

          <TabsContent value="degreeId">
            <Form {...degreeIdForm}>
              <form onSubmit={degreeIdForm.handleSubmit((d) => { clear(); verifyById(d); })} className="flex gap-2">
                <FormField control={degreeIdForm.control} name="degreeId" render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="sr-only">Degree ID</FormLabel>
                    <FormControl>
                      <Input placeholder="DAS-2026-AB12CD" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={pendingId}>
                  {pendingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="cnic">
            <Form {...cnicForm}>
              <form onSubmit={cnicForm.handleSubmit((d) => { clear(); verifyCnic(d); })} className="flex gap-2">
                <FormField control={cnicForm.control} name="cnic" render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="sr-only">CNIC</FormLabel>
                    <FormControl>
                      <Input placeholder="XXXXX-XXXXXXX-X" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={pendingCnic}>
                  {pendingCnic ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        <div className="mt-8 space-y-4">
          {notFound && <NotFoundCard />}
          {results?.map((r) => <ResultCard key={r.degreeId} result={r} />)}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`font-medium text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
