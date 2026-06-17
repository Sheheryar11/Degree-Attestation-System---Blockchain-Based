# Next.js 15 Frontend — Folder Structure & Key Pages

## 1. Folder Structure

```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          // Landing page
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── verify-email/[token]/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/[token]/page.tsx
│   ├── (student)/
│   │   ├── dashboard/page.tsx
│   │   ├── applications/
│   │   │   ├── page.tsx                  // list
│   │   │   ├── new/
│   │   │   │   ├── page.tsx              // multi-step wizard shell
│   │   │   │   ├── personal-details/page.tsx
│   │   │   │   ├── degree-details/page.tsx
│   │   │   │   ├── attestation-details/page.tsx
│   │   │   │   ├── documents/page.tsx
│   │   │   │   └── review/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx              // status tracker
│   │   │       ├── voucher/page.tsx
│   │   │       ├── payment/page.tsx
│   │   │       └── certificate/page.tsx
│   │   └── profile/page.tsx
│   ├── (officer)/
│   │   ├── officer/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── applications/page.tsx
│   │   │   └── applications/[id]/page.tsx  // review screen w/ OCR vs entered diff
│   ├── (registrar)/
│   │   ├── registrar/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── applications/[id]/page.tsx
│   │   │   ├── applications/[id]/generate-certificate/page.tsx
│   │   │   └── applications/[id]/blockchain/page.tsx
│   ├── (admin)/
│   │   ├── admin/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   ├── users/[id]/page.tsx
│   │   │   ├── applications/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   └── audit-logs/page.tsx
│   ├── verify/
│   │   ├── page.tsx                      // public verification portal
│   │   └── [degreeId]/page.tsx           // direct deep link result
│   └── api/
│       └── (optional Next.js route handlers, e.g. for QR scan camera proxy)
├── components/
│   ├── ui/                               // shadcn components (button, card, input...)
│   ├── forms/
│   │   ├── PersonalDetailsForm.tsx
│   │   ├── DegreeDetailsForm.tsx
│   │   ├── AttestationDetailsForm.tsx
│   │   └── DocumentUploadForm.tsx
│   ├── application/
│   │   ├── ApplicationStatusTracker.tsx
│   │   ├── ApplicationCard.tsx
│   │   └── ValidationReport.tsx
│   ├── voucher/VoucherPreview.tsx
│   ├── payment/PaymentForm.tsx
│   ├── certificate/CertificatePreview.tsx
│   ├── verification/VerificationResultCard.tsx
│   ├── qr/QrScanner.tsx
│   └── layout/
│       ├── Navbar.tsx
│       ├── Sidebar.tsx
│       └── RoleGuard.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts                     // axios/fetch instance with JWT interceptor
│   │   ├── auth.ts
│   │   ├── applications.ts
│   │   ├── documents.ts
│   │   ├── payments.ts
│   │   ├── certificates.ts
│   │   ├── blockchain.ts
│   │   └── verification.ts
│   ├── validators/                       // Zod schemas mirroring backend DTOs
│   │   ├── personal-details.schema.ts
│   │   ├── degree-details.schema.ts
│   │   ├── attestation.schema.ts
│   │   └── auth.schema.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useApplications.ts            // TanStack Query hooks
│   │   └── useApplicationStatus.ts
│   ├── stores/
│   │   └── auth-store.ts                 // zustand or context for session
│   └── utils/
│       ├── format.ts
│       └── fee-calculator.ts             // mirrors backend logic for live preview
├── middleware.ts                          // route protection by role (reads JWT cookie)
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

## 2. Key Page Responsibilities

| Route | Role | Purpose |
|---|---|---|
| `/` | Public | Landing, links to login/register/verify |
| `/login`, `/register` | Public | Auth forms (RHF + Zod) |
| `/dashboard` | Student | List applications, quick "New Application" CTA |
| `/applications/new/*` | Student | 5-step wizard: Personal → Degree → Attestation → Documents → Review |
| `/applications/[id]` | Student | Status tracker (mirrors state machine), shows voucher/payment/certificate links as they unlock |
| `/officer/applications` | Officer | Queue of `SUBMITTED`/`UNDER_REVIEW` apps, filter/sort |
| `/officer/applications/[id]` | Officer | Side-by-side OCR vs entered data, validation score, approve/reject |
| `/registrar/applications/[id]` | Registrar | Final review, "Generate Certificate" → "Register on Blockchain" → QR |
| `/admin/*` | Admin | User management, reports, audit logs |
| `/verify` | Public | Search by Degree ID / CNIC, or "Scan QR" button |
| `/verify/[degreeId]` | Public | Verification result card: name, degree, university, status, issue date |

## 3. Multi-Step Application Wizard (React Hook Form + Zod + TanStack Query)

```tsx
// app/(student)/applications/new/personal-details/page.tsx
'use client';

const schema = personalDetailsSchema; // zod

export default function PersonalDetailsStep() {
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const router = useRouter();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (data: PersonalDetailsInput) => api.personalDetails.upsert(data),
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    await mutateAsync(data);
    router.push('/applications/new/degree-details');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Shadcn FormField components for each input */}
        <StepProgress current={1} total={5} />
        <Button type="submit" disabled={isPending}>Continue</Button>
      </form>
    </Form>
  );
}
```

## 4. Application Status Tracker Component

```tsx
const STEPS = [
  'SUBMITTED', 'UNDER_REVIEW', 'APPROVED_BY_OFFICER', 'VOUCHER_GENERATED',
  'PAYMENT_VERIFIED', 'REGISTRAR_APPROVED', 'CERTIFICATE_GENERATED',
  'BLOCKCHAIN_REGISTERED', 'QR_GENERATED', 'COMPLETED',
];

export function ApplicationStatusTracker({ status }: { status: ApplicationStatus }) {
  const currentIndex = STEPS.indexOf(status);
  return (
    <ol className="flex flex-col gap-2">
      {STEPS.map((step, i) => (
        <li key={step} className={cn(
          'flex items-center gap-2',
          i < currentIndex && 'text-green-600',
          i === currentIndex && 'text-blue-600 font-semibold',
          i > currentIndex && 'text-gray-400',
        )}>
          {i <= currentIndex ? <CheckCircle size={16} /> : <Circle size={16} />}
          {humanizeStatus(step)}
        </li>
      ))}
    </ol>
  );
}
```

## 5. Public Verification Portal

```tsx
// app/verify/page.tsx
export default function VerifyPortal() {
  const [tab, setTab] = useState<'degreeId' | 'cnic' | 'qr'>('degreeId');

  return (
    <div className="max-w-xl mx-auto py-12">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="degreeId">Degree ID</TabsTrigger>
          <TabsTrigger value="cnic">CNIC</TabsTrigger>
          <TabsTrigger value="qr">Scan QR</TabsTrigger>
        </TabsList>
        <TabsContent value="degreeId"><DegreeIdSearch /></TabsContent>
        <TabsContent value="cnic"><CnicSearch /></TabsContent>
        <TabsContent value="qr"><QrScanner onResult={handleQrResult} /></TabsContent>
      </Tabs>
    </div>
  );
}
```

## 6. Middleware-Based Route Protection

```ts
// middleware.ts
export function middleware(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value;
  const { pathname } = req.nextUrl;

  const roleRoutes: Record<string, Role[]> = {
    '/officer': ['VERIFICATION_OFFICER', 'ADMIN'],
    '/registrar': ['REGISTRAR', 'ADMIN'],
    '/admin': ['ADMIN'],
    '/dashboard': ['STUDENT'],
  };

  for (const [prefix, allowedRoles] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(prefix)) {
      if (!token) return NextResponse.redirect(new URL('/login', req.url));
      const { role } = decodeJwt(token);
      if (!allowedRoles.includes(role)) return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/officer/:path*', '/registrar/:path*', '/admin/:path*'] };
```

## 7. TanStack Query Setup

```ts
// lib/hooks/useApplications.ts
export function useApplication(id: string) {
  return useQuery({
    queryKey: ['application', id],
    queryFn: () => api.applications.getById(id),
    refetchInterval: (data) => isTerminalStatus(data?.status) ? false : 10_000, // poll while in progress
  });
}

export function useSubmitApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.applications.submit(id),
    onSuccess: (_, id) => qc.invalidateQueries({ queryKey: ['application', id] }),
  });
}
```
