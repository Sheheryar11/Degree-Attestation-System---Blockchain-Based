import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, FileText, QrCode, Lock } from 'lucide-react';

const features = [
  { icon: FileText, title: 'Online Application', description: 'Submit attestation requests entirely online with document upload and OCR auto-extraction.' },
  { icon: ShieldCheck, title: 'Blockchain Verified', description: 'Degree certificates are anchored on Polygon blockchain, making them tamper-proof forever.' },
  { icon: QrCode, title: 'Instant Verification', description: 'Employers scan a QR code to verify your degree in seconds, no phone calls needed.' },
  { icon: Lock, title: 'Secure & Paperless', description: 'End-to-end encrypted, fully digital workflow. No physical documents required.' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Nav */}
      <nav className="border-b bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">DegreeAttest</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" asChild><Link href="/verify">Verify Degree</Link></Button>
            <Button variant="outline" asChild><Link href="/login">Sign In</Link></Button>
            <Button asChild><Link href="/register">Register</Link></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <Badge variant="secondary" className="mb-4">Powered by Polygon Blockchain</Badge>
        <h1 className="text-5xl font-bold tracking-tight mb-6 max-w-3xl mx-auto">
          Degree Attestation,<br />
          <span className="text-primary">Made Trustworthy</span>
        </h1>
        <p className="text-muted-foreground text-xl max-w-2xl mx-auto mb-10">
          A fully digital, blockchain-backed degree attestation system. Apply, get verified,
          and share a QR-code that any employer can scan to confirm your credentials instantly.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button size="lg" asChild><Link href="/register">Start Application</Link></Button>
          <Button size="lg" variant="outline" asChild><Link href="/verify">Verify a Degree</Link></Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 pb-24">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <Icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>Degree Attestation System · Blockchain-Powered</p>
      </footer>
    </main>
  );
}
