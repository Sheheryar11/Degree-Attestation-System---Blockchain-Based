'use client';

import { useEffect } from 'react';
import { useForm, useWatch, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { applicationsApi } from '@/lib/api/applications';
import { formatCurrency } from '@/lib/utils';

const schema = z.object({
  attestationType: z.enum(['DOMESTIC', 'INTERNATIONAL', 'DUPLICATE', 'TRANSCRIPT', 'MIGRATION']),
  priority: z.enum(['NORMAL', 'URGENT', 'EXPRESS']).optional(),
  deliveryMethod: z.enum(['SELF_PICKUP', 'COURIER_DOMESTIC', 'COURIER_INTERNATIONAL']).optional(),
  numberOfCopies: z.coerce.number().int().min(1).max(10).optional(),
  destinationCountry: z.string().optional(),
  purposeOfAttestation: z.string().optional(),
  employerName: z.string().optional(),
  deliveryAddress: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const FEE_BASE: Record<string, number> = { DOMESTIC: 3000, INTERNATIONAL: 8000, DUPLICATE: 5000, TRANSCRIPT: 2500, MIGRATION: 4000 };
const FEE_PRIORITY: Record<string, number> = { NORMAL: 0, URGENT: 2000, EXPRESS: 5000 };
const FEE_DELIVERY: Record<string, number> = { SELF_PICKUP: 0, COURIER_DOMESTIC: 500, COURIER_INTERNATIONAL: 3000 };

const DEFAULT_VALUES: FormValues = {
  attestationType: 'DOMESTIC',
  priority: 'NORMAL',
  deliveryMethod: 'SELF_PICKUP',
  numberOfCopies: 1,
  destinationCountry: '',
  purposeOfAttestation: '',
  employerName: '',
  deliveryAddress: '',
};

// Isolated fee preview — only re-renders when fee-related fields change
function FeePreview({ control }: { control: Control<FormValues> }) {
  const attestationType = useWatch({ control, name: 'attestationType' }) ?? 'DOMESTIC';
  const numberOfCopies = useWatch({ control, name: 'numberOfCopies' }) ?? 1;
  const priority = useWatch({ control, name: 'priority' }) ?? 'NORMAL';
  const deliveryMethod = useWatch({ control, name: 'deliveryMethod' }) ?? 'SELF_PICKUP';

  const fee = (FEE_BASE[attestationType] ?? 3000) * (numberOfCopies || 1)
    + (FEE_PRIORITY[priority] ?? 0)
    + (FEE_DELIVERY[deliveryMethod] ?? 0);

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Estimated Total Fee</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatCurrency(FEE_BASE[attestationType] ?? 3000)} × {numberOfCopies || 1} copies
              {priority !== 'NORMAL' ? ` + ${formatCurrency(FEE_PRIORITY[priority] ?? 0)} priority` : ''}
              {deliveryMethod !== 'SELF_PICKUP' ? ` + ${formatCurrency(FEE_DELIVERY[deliveryMethod] ?? 0)} delivery` : ''}
            </p>
          </div>
          <p className="text-2xl font-bold text-primary">{formatCurrency(fee)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AttestationDetailsForm({ applicationId, onComplete }: { applicationId: string; onComplete: () => void }) {
  const qc = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ['attestation-detail', applicationId],
    queryFn: () => applicationsApi.getAttestationDetail(applicationId),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  // Sync server data into form once loaded
  useEffect(() => {
    if (existing?.data) {
      form.reset({
        ...DEFAULT_VALUES,
        ...existing.data,
        destinationCountry: existing.data.destinationCountry ?? '',
        purposeOfAttestation: existing.data.purposeOfAttestation ?? '',
        employerName: existing.data.employerName ?? '',
        deliveryAddress: existing.data.deliveryAddress ?? '',
      });
    }
  }, [existing?.data, form]);

  // Watch only the field that controls conditional rendering
  const attestationType = useWatch({ control: form.control, name: 'attestationType' });
  const deliveryMethod = useWatch({ control: form.control, name: 'deliveryMethod' });
  const isInternational = attestationType === 'INTERNATIONAL';

  const mutation = useMutation({
    mutationFn: (values: FormValues) => applicationsApi.upsertAttestationDetail(applicationId, values),
    onSuccess: () => {
      toast.success('Attestation details saved');
      qc.invalidateQueries({ queryKey: ['attestation-detail', applicationId] });
      qc.invalidateQueries({ queryKey: ['applications', applicationId] });
      onComplete();
    },
    onError: () => toast.error('Failed to save attestation details'),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="attestationType" render={({ field }) => (
            <FormItem>
              <FormLabel>Attestation Type <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="DOMESTIC">Domestic (PKR 3,000 base)</SelectItem>
                  <SelectItem value="INTERNATIONAL">International (PKR 8,000 base)</SelectItem>
                  <SelectItem value="DUPLICATE">Duplicate Degree (PKR 5,000 base)</SelectItem>
                  <SelectItem value="TRANSCRIPT">Transcript (PKR 2,500 base)</SelectItem>
                  <SelectItem value="MIGRATION">Migration (PKR 4,000 base)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="priority" render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal (No surcharge)</SelectItem>
                  <SelectItem value="URGENT">Urgent (+PKR 2,000)</SelectItem>
                  <SelectItem value="EXPRESS">Express (+PKR 5,000)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="deliveryMethod" render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery Method</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="SELF_PICKUP">Self Pickup (Free)</SelectItem>
                  <SelectItem value="COURIER_DOMESTIC">Domestic Courier (+PKR 500)</SelectItem>
                  <SelectItem value="COURIER_INTERNATIONAL">International Courier (+PKR 3,000)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="numberOfCopies" render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Copies</FormLabel>
              <FormControl>
                <Input type="number" min={1} max={10} {...field} value={field.value ?? 1} />
              </FormControl>
              <FormDescription>Each copy is charged at the base rate</FormDescription>
              <FormMessage />
            </FormItem>
          )} />

          {isInternational && (
            <FormField control={form.control} name="destinationCountry" render={({ field }) => (
              <FormItem>
                <FormLabel>Destination Country</FormLabel>
                <FormControl><Input placeholder="e.g. United Kingdom" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}

          <FormField control={form.control} name="purposeOfAttestation" render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose of Attestation</FormLabel>
              <FormControl><Input placeholder="Employment / Higher Education / Immigration" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="employerName" render={({ field }) => (
            <FormItem>
              <FormLabel>Employer / Institution Name</FormLabel>
              <FormControl><Input placeholder="If for employment or admission" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {deliveryMethod !== 'SELF_PICKUP' && (
          <FormField control={form.control} name="deliveryAddress" render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery Address</FormLabel>
              <FormControl><Input placeholder="Full address for courier delivery" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}

        <FeePreview control={form.control} />

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
