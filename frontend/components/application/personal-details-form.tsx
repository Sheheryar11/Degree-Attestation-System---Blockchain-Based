'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';

const schema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  fatherName: z.string().min(2, "Father's name is required"),
  cnic: z.string().regex(/^\d{5}-\d{7}-\d$/, 'CNIC must be in format 00000-0000000-0'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']).optional(),
  nationality: z.string().optional(),
  domicileProvince: z.string().optional(),
  permanentAddress: z.string().optional(),
  currentAddress: z.string().optional(),
  phoneNumber: z.string().optional(),
  whatsappNumber: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function PersonalDetailsForm({ onComplete }: { onComplete: () => void }) {
  const qc = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ['personal-details', 'me'],
    queryFn: () => apiClient.get('/personal-details/me'),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      fatherName: '',
      cnic: '',
      dateOfBirth: '',
      gender: 'MALE',
      maritalStatus: undefined,
      nationality: '',
      domicileProvince: '',
      permanentAddress: '',
      currentAddress: '',
      phoneNumber: '',
      whatsappNumber: '',
    },
    values: existing?.data ? {
      fullName: existing.data.fullName ?? '',
      fatherName: existing.data.fatherName ?? '',
      cnic: existing.data.cnic ?? '',
      dateOfBirth: existing.data.dateOfBirth ? existing.data.dateOfBirth.split('T')[0] : '',
      gender: existing.data.gender ?? 'MALE',
      maritalStatus: existing.data.maritalStatus ?? undefined,
      nationality: existing.data.nationality ?? '',
      domicileProvince: existing.data.domicileProvince ?? '',
      permanentAddress: existing.data.permanentAddress ?? '',
      currentAddress: existing.data.currentAddress ?? '',
      phoneNumber: existing.data.phoneNumber ?? '',
      whatsappNumber: existing.data.whatsappNumber ?? '',
    } : undefined,
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => apiClient.put('/personal-details/me', values),
    onSuccess: () => {
      toast.success('Personal details saved');
      qc.invalidateQueries({ queryKey: ['personal-details', 'me'] });
      onComplete();
    },
    onError: () => toast.error('Failed to save personal details'),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="fullName" render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
              <FormControl><Input placeholder="As on CNIC" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="fatherName" render={({ field }) => (
            <FormItem>
              <FormLabel>Father&apos;s Name <span className="text-destructive">*</span></FormLabel>
              <FormControl><Input placeholder="As on CNIC" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="cnic" render={({ field }) => (
            <FormItem>
              <FormLabel>CNIC <span className="text-destructive">*</span></FormLabel>
              <FormControl><Input placeholder="00000-0000000-0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth <span className="text-destructive">*</span></FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="gender" render={({ field }) => (
            <FormItem>
              <FormLabel>Gender <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="maritalStatus" render={({ field }) => (
            <FormItem>
              <FormLabel>Marital Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="SINGLE">Single</SelectItem>
                  <SelectItem value="MARRIED">Married</SelectItem>
                  <SelectItem value="DIVORCED">Divorced</SelectItem>
                  <SelectItem value="WIDOWED">Widowed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="nationality" render={({ field }) => (
            <FormItem>
              <FormLabel>Nationality</FormLabel>
              <FormControl><Input placeholder="Pakistani" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="domicileProvince" render={({ field }) => (
            <FormItem>
              <FormLabel>Domicile Province</FormLabel>
              <FormControl><Input placeholder="Punjab" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="phoneNumber" render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl><Input placeholder="+92 300 0000000" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="whatsappNumber" render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp Number</FormLabel>
              <FormControl><Input placeholder="+92 300 0000000" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="permanentAddress" render={({ field }) => (
          <FormItem>
            <FormLabel>Permanent Address</FormLabel>
            <FormControl><Input placeholder="House #, Street, City, Province" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="currentAddress" render={({ field }) => (
          <FormItem>
            <FormLabel>Current Address</FormLabel>
            <FormControl><Input placeholder="Same as permanent if identical" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
