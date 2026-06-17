'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { humanizeStatus, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  Users, FileText, Shield, CreditCard, CheckCircle, TrendingUp,
  Award, AlertCircle, ArrowRight, Activity,
} from 'lucide-react';

type Stats = {
  totalStudents: number;
  totalApplications: number;
  completedAttestations: number;
  blockchainConfirmed: number;
  totalRevenue: number;
  pendingPayment: number;
  generatedCertificates: number;
  byStatus: Record<string, number>;
  recentApplications: {
    id: string;
    trackingNumber: string;
    status: string;
    createdAt: string;
    student: { email: string };
    degreeDetail: { universityName?: string; degreeName?: string } | null;
  }[];
};

const STATUS_PIPELINE = [
  { key: 'DRAFT',             label: 'Draft',             color: 'bg-slate-400' },
  { key: 'SUBMITTED',         label: 'Submitted',         color: 'bg-blue-400' },
  { key: 'PAYMENT_PENDING',   label: 'Awaiting Payment',  color: 'bg-amber-400' },
  { key: 'PAYMENT_SUBMITTED', label: 'Payment Submitted', color: 'bg-orange-400' },
  { key: 'PAYMENT_VERIFIED',  label: 'Processing',        color: 'bg-purple-400' },
  { key: 'COMPLETED',         label: 'Completed',         color: 'bg-green-500' },
  { key: 'REJECTED',          label: 'Rejected',          color: 'bg-red-400' },
];

export default function AdminDashboard() {
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiClient.get('/users/stats').then((r) => r.data),
    refetchInterval: 30000,
  });

  const s = data;
  const totalInPipeline = s ? Object.values(s.byStatus).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="flex flex-col h-full">
      <Header title="Admin Dashboard" />
      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* Primary stats row 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users}       label="Registered Students"  value={s?.totalStudents ?? '—'}         color="text-blue-500"    isLoading={isLoading} />
          <StatCard icon={FileText}    label="Total Applications"   value={s?.totalApplications ?? '—'}     color="text-indigo-500"  isLoading={isLoading} />
          <StatCard icon={CheckCircle} label="Attestations Done"    value={s?.completedAttestations ?? '—'} color="text-green-600"   isLoading={isLoading} />
          <StatCard icon={Award}       label="Certificates Issued"  value={s?.generatedCertificates ?? '—'} color="text-emerald-500" isLoading={isLoading} />
        </div>

        {/* Primary stats row 2 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Shield}    label="Blockchain Confirmed" value={s?.blockchainConfirmed ?? '—'} color="text-purple-500" isLoading={isLoading} />
          <StatCard icon={CreditCard} label="Pending Payment"    value={s?.pendingPayment ?? '—'}      color="text-amber-500"  isLoading={isLoading} highlight={!!s?.pendingPayment} />
          <StatCard icon={TrendingUp} label="Total Revenue"      value={s ? formatCurrency(s.totalRevenue) : '—'} color="text-cyan-500" isLoading={isLoading} isText />
          <StatCard icon={Activity}   label="In Progress"
            value={s ? (s.byStatus['PAYMENT_VERIFIED'] ?? 0) + (s.byStatus['PAYMENT_SUBMITTED'] ?? 0) : '—'}
            color="text-orange-500" isLoading={isLoading} />
        </div>

        {/* Application pipeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Application Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-10 rounded bg-muted animate-pulse" />
            ) : totalInPipeline === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No applications yet</p>
            ) : (
              <div className="space-y-3">
                <div className="flex h-4 rounded-full overflow-hidden gap-px">
                  {STATUS_PIPELINE.map((st) => {
                    const count = s?.byStatus[st.key] ?? 0;
                    if (!count) return null;
                    const pct = (count / totalInPipeline) * 100;
                    return (
                      <div
                        key={st.key}
                        className={`${st.color} transition-all`}
                        style={{ width: `${pct}%` }}
                        title={`${st.label}: ${count}`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {STATUS_PIPELINE.map((st) => {
                    const count = s?.byStatus[st.key] ?? 0;
                    if (!count) return null;
                    return (
                      <div key={st.key} className="flex items-center gap-1.5 text-xs">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${st.color}`} />
                        <span className="text-muted-foreground">{st.label}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions + system status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ActionLink
                href="/admin/applications"
                label="View All Applications"
                description="Browse and manage every submission"
                icon={FileText}
                badge={s?.totalApplications}
              />
              <ActionLink
                href="/admin/applications"
                label="Pending Verifications"
                description="Payment submitted — awaiting your action"
                icon={AlertCircle}
                badge={s?.byStatus['PAYMENT_SUBMITTED']}
                badgeVariant="destructive"
              />
              <ActionLink
                href="/admin/applications"
                label="Awaiting Student Payment"
                description="Voucher issued, student hasn't paid yet"
                icon={CreditCard}
                badge={s?.pendingPayment}
                badgeVariant="outline"
              />
              <ActionLink
                href="/verify"
                label="Public Verification Portal"
                description="Verify any attested degree by ID or CNIC"
                icon={Shield}
                external
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusRow label="Blockchain Network"      value="Polygon Amoy Testnet"     status="ok"      detail={s ? `${s.blockchainConfirmed} confirmed on-chain` : undefined} />
              <StatusRow label="Certificate Generation"  value="PDFKit (server-side)"     status="ok"      detail={s ? `${s.generatedCertificates} PDFs issued` : undefined} />
              <StatusRow label="OCR Document Scanning"   value="Tesseract.js (client)"    status="ok"      detail="Auto-fills degree details from uploaded image" />
              <StatusRow label="Public Verification"     value="/verify (no login)"        status="ok"      detail="Degree ID or CNIC lookup" />
              <StatusRow label="Email Notifications"     value="Nodemailer / SMTP"         status="warn"    detail="Set SMTP_HOST in .env to enable" />
            </CardContent>
          </Card>
        </div>

        {/* Recent applications */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent Applications</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/applications">View All <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-8 rounded bg-muted animate-pulse" />)}
              </div>
            ) : !s?.recentApplications?.length ? (
              <div className="p-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">No applications yet</p>
                <p className="text-xs text-muted-foreground mt-1">Applications submitted by students will appear here.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tracking #</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Degree</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {s.recentApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{app.trackingNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{app.student.email}</td>
                      <td className="px-4 py-3 text-xs">{app.degreeDetail?.degreeName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            app.status === 'COMPLETED'         ? 'default' :
                            app.status === 'REJECTED'           ? 'destructive' :
                            app.status === 'PAYMENT_SUBMITTED'  ? 'destructive' : 'secondary'
                          }
                          className="text-xs"
                        >
                          {humanizeStatus(app.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(app.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/applications/${app.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Info footer */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-4 px-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground block mb-1">Attestation Certificate</span>
                Auto-generated as a PDF when payment is verified and blockchain registration completes. Students download from <span className="font-mono bg-muted px-1 rounded">/student/certificates</span>.
              </div>
              <div>
                <span className="font-semibold text-foreground block mb-1">OCR Scanning</span>
                On the Degree Details step of a new application, students can upload their degree image and Tesseract.js will auto-fill university, degree name, year, and CGPA.
              </div>
              <div>
                <span className="font-semibold text-foreground block mb-1">Public Verification</span>
                Share a degree&apos;s <span className="font-mono bg-muted px-1 rounded">degreeId</span> with any employer — they can verify it at <span className="font-mono bg-muted px-1 rounded">/verify</span> with no account needed.
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, color, isLoading, isText, highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  isLoading?: boolean;
  isText?: boolean;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-amber-300 bg-amber-50/40' : ''}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">{label}</CardTitle>
        <Icon className={`h-4 w-4 shrink-0 ${color}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-7 w-14 rounded bg-muted animate-pulse" />
        ) : (
          <p className={`font-bold ${isText ? 'text-lg' : 'text-2xl'}`}>{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ActionLink({
  href, label, description, icon: Icon, badge, badgeVariant = 'secondary', external,
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: number;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  external?: boolean;
}) {
  const inner = (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer group">
      <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {badge !== undefined && badge > 0 && (
          <Badge variant={badgeVariant} className="text-xs">{badge}</Badge>
        )}
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );

  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>
  ) : (
    <Link href={href}>{inner}</Link>
  );
}

function StatusRow({
  label, value, status, detail,
}: {
  label: string;
  value: string;
  status: 'ok' | 'warn' | 'error' | 'unknown';
  detail?: string;
}) {
  const dot =
    status === 'ok'    ? 'bg-green-500' :
    status === 'warn'  ? 'bg-amber-400' :
    status === 'error' ? 'bg-red-500'   : 'bg-slate-300';

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <span className="font-medium truncate">{label}</span>
      </div>
      <div className="text-right ml-3 shrink-0">
        <span className="text-muted-foreground text-xs">{value}</span>
        {detail && <span className="block text-xs text-muted-foreground/70">{detail}</span>}
      </div>
    </div>
  );
}
