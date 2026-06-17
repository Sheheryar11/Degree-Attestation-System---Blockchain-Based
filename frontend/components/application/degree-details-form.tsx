'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { applicationsApi } from '@/lib/api/applications';
import { ScanText, Loader2, CheckCircle, Upload } from 'lucide-react';

const schema = z.object({
  universityName: z.string().min(2, 'University name is required'),
  degreeName: z.string().min(2, 'Degree name is required'),
  degreeProgram: z.string().optional(),
  degreeType: z.enum(['ATTESTATION', 'DUPLICATE_DEGREE', 'TRANSCRIPT']).optional(),
  rollNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  graduationYear: z.coerce.number().int().min(1950).max(2100).optional(),
  cgpa: z.string().optional(),
  division: z.string().optional(),
  degreeSerialNumber: z.string().optional(),
  degreeIssuanceDate: z.string().optional(),
  transcriptSerialNumber: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function parseOcrText(text: string): Partial<FormValues> {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let universityName = '';
  for (const line of lines) {
    if (/university|institute|college|academy|school of/i.test(line) && line.length > 6 && line.length < 120) {
      universityName = line.replace(/[^a-zA-Z0-9\s&().,'-]/g, '').trim();
      break;
    }
  }

  let degreeName = '';
  for (const line of lines) {
    if (/bachelor|master|doctor|phd|b\.?sc|m\.?sc|b\.?e\.?|b\.?tech|m\.?s|m\.?phil|engineering|computer science|business administration/i.test(line) && line.length < 120) {
      degreeName = line.replace(/[^a-zA-Z0-9\s&().,'-]/g, '').trim();
      break;
    }
  }

  // Graduation year — take the highest 4-digit year in range
  const yearMatches = text.match(/\b(19[6-9]\d|20[0-2]\d|2030)\b/g) ?? [];
  const graduationYear = yearMatches.length
    ? Math.max(...yearMatches.map(Number))
    : undefined;

  // CGPA — look for "CGPA: 3.72" or "3.72/4.00" or "GPA 3.72"
  const cgpaMatch =
    text.match(/(?:cgpa|gpa)[:\s]+(\d\.\d{1,2})/i) ??
    text.match(/(\d\.\d{2})\s*\/\s*4(?:\.0{1,2})?/i);
  const cgpa = cgpaMatch ? cgpaMatch[1] : undefined;

  // Roll number
  const rollMatch = text.match(/roll\s*(?:no|number|#)?[:\s]+([A-Z0-9/-]+)/i);
  const rollNumber = rollMatch ? rollMatch[1].trim() : undefined;

  // Registration number
  const regMatch = text.match(/reg(?:istration)?\s*(?:no|number|#)?[:\s]+([A-Z0-9/-]+)/i);
  const registrationNumber = regMatch ? regMatch[1].trim() : undefined;

  return { universityName, degreeName, graduationYear, cgpa, rollNumber, registrationNumber };
}

function OcrScanner({ onExtracted }: { onExtracted: (vals: Partial<FormValues>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Partial<FormValues> | null>(null);

  const runOcr = async (file: File) => {
    setStatus('loading');
    const url = URL.createObjectURL(file);
    setPreview(url);
    try {
      // Dynamically import tesseract to avoid SSR issues
      const Tesseract = (await import('tesseract.js')).default;
      const result = await Tesseract.recognize(url, 'eng', {
        logger: () => {},
      });
      const parsed = parseOcrText(result.data.text);
      setExtracted(parsed);
      setStatus('done');
    } catch {
      setStatus('error');
      toast.error('OCR failed — please fill in the fields manually');
    }
  };

  const apply = () => {
    if (extracted) {
      onExtracted(extracted);
      toast.success('Fields pre-filled from your degree certificate');
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50/50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
        <ScanText className="h-4 w-4" />
        OCR — Auto-fill from Degree Certificate
      </div>
      <p className="text-xs text-blue-700">
        Upload a photo or scan of your degree to automatically extract details. You can edit anything after.
      </p>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) runOcr(f);
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={status === 'loading'}
          className="border-blue-300 text-blue-800 hover:bg-blue-100"
        >
          {status === 'loading' ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reading certificate…</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" />Select Degree Image</>
          )}
        </Button>

        {status === 'done' && extracted && (
          <Button
            type="button"
            size="sm"
            onClick={apply}
            className="bg-blue-700 hover:bg-blue-800 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Apply Extracted Data
          </Button>
        )}

        {status === 'done' && (
          <Badge variant="secondary" className="text-green-700 bg-green-100">
            OCR complete
          </Badge>
        )}
        {status === 'error' && (
          <Badge variant="destructive">OCR failed</Badge>
        )}
      </div>

      {status === 'done' && extracted && (
        <div className="rounded-md bg-white border p-3 text-xs space-y-1">
          <p className="font-medium text-muted-foreground mb-2">Extracted values (click Apply to use):</p>
          {extracted.universityName && <p><span className="text-muted-foreground">University:</span> {extracted.universityName}</p>}
          {extracted.degreeName && <p><span className="text-muted-foreground">Degree:</span> {extracted.degreeName}</p>}
          {extracted.graduationYear && <p><span className="text-muted-foreground">Year:</span> {extracted.graduationYear}</p>}
          {extracted.cgpa && <p><span className="text-muted-foreground">CGPA:</span> {extracted.cgpa}</p>}
          {extracted.rollNumber && <p><span className="text-muted-foreground">Roll No:</span> {extracted.rollNumber}</p>}
          {!extracted.universityName && !extracted.degreeName && !extracted.graduationYear && (
            <p className="text-muted-foreground italic">No fields could be extracted — fill in manually below.</p>
          )}
        </div>
      )}

      {preview && status !== 'loading' && (
        <img src={preview} alt="Uploaded degree" className="h-24 object-contain rounded border" />
      )}
    </div>
  );
}

export function DegreeDetailsForm({ applicationId, onComplete }: { applicationId: string; onComplete: () => void }) {
  const qc = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ['degree-detail', applicationId],
    queryFn: () => applicationsApi.getDegreeDetail(applicationId),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      universityName: '',
      degreeName: '',
      degreeProgram: '',
      degreeType: undefined,
      rollNumber: '',
      registrationNumber: '',
      graduationYear: '' as unknown as number,
      cgpa: '',
      division: '',
      degreeSerialNumber: '',
      degreeIssuanceDate: '',
      transcriptSerialNumber: '',
    },
    values: existing?.data ? {
      universityName: existing.data.universityName ?? '',
      degreeName: existing.data.degreeName ?? '',
      degreeProgram: existing.data.degreeProgram ?? '',
      degreeType: existing.data.degreeType ?? undefined,
      rollNumber: existing.data.rollNumber ?? '',
      registrationNumber: existing.data.registrationNumber ?? '',
      graduationYear: existing.data.graduationYear ?? undefined,
      cgpa: existing.data.cgpa ?? '',
      division: existing.data.division ?? '',
      degreeSerialNumber: existing.data.degreeSerialNumber ?? '',
      degreeIssuanceDate: existing.data.degreeIssuanceDate ? existing.data.degreeIssuanceDate.split('T')[0] : '',
      transcriptSerialNumber: existing.data.transcriptSerialNumber ?? '',
    } : undefined,
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => applicationsApi.upsertDegreeDetail(applicationId, values),
    onSuccess: () => {
      toast.success('Degree details saved');
      qc.invalidateQueries({ queryKey: ['degree-detail', applicationId] });
      onComplete();
    },
    onError: () => toast.error('Failed to save degree details'),
  });

  const handleOcrExtracted = (vals: Partial<FormValues>) => {
    if (vals.universityName) form.setValue('universityName', vals.universityName);
    if (vals.degreeName) form.setValue('degreeName', vals.degreeName);
    if (vals.graduationYear) form.setValue('graduationYear', vals.graduationYear);
    if (vals.cgpa) form.setValue('cgpa', vals.cgpa);
    if (vals.rollNumber) form.setValue('rollNumber', vals.rollNumber);
    if (vals.registrationNumber) form.setValue('registrationNumber', vals.registrationNumber);
  };

  return (
    <div className="space-y-6">
      <OcrScanner onExtracted={handleOcrExtracted} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="universityName" render={({ field }) => (
              <FormItem>
                <FormLabel>University Name <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="University of Engineering & Technology" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="degreeName" render={({ field }) => (
              <FormItem>
                <FormLabel>Degree Name <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select degree name" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Bachelor of Science in Computer Science">BS Computer Science</SelectItem>
                    <SelectItem value="Bachelor of Science in Software Engineering">BS Software Engineering</SelectItem>
                    <SelectItem value="Bachelor of Science in Information Technology">BS Information Technology</SelectItem>
                    <SelectItem value="Bachelor of Engineering in Computer Engineering">BE Computer Engineering</SelectItem>
                    <SelectItem value="Bachelor of Engineering in Electrical Engineering">BE Electrical Engineering</SelectItem>
                    <SelectItem value="Bachelor of Engineering in Civil Engineering">BE Civil Engineering</SelectItem>
                    <SelectItem value="Bachelor of Engineering in Mechanical Engineering">BE Mechanical Engineering</SelectItem>
                    <SelectItem value="Bachelor of Business Administration">BBA</SelectItem>
                    <SelectItem value="Bachelor of Commerce">B.Com</SelectItem>
                    <SelectItem value="Bachelor of Arts">BA</SelectItem>
                    <SelectItem value="Bachelor of Science">BS</SelectItem>
                    <SelectItem value="Master of Science in Computer Science">MS Computer Science</SelectItem>
                    <SelectItem value="Master of Science in Software Engineering">MS Software Engineering</SelectItem>
                    <SelectItem value="Master of Business Administration">MBA</SelectItem>
                    <SelectItem value="Master of Philosophy">M.Phil</SelectItem>
                    <SelectItem value="Doctor of Philosophy">PhD</SelectItem>
                    <SelectItem value="MBBS">MBBS</SelectItem>
                    <SelectItem value="BDS">BDS</SelectItem>
                    <SelectItem value="LLB">LLB</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="degreeProgram" render={({ field }) => (
              <FormItem>
                <FormLabel>Degree Program</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="BS">BS (Bachelor of Science)</SelectItem>
                    <SelectItem value="BE">BE (Bachelor of Engineering)</SelectItem>
                    <SelectItem value="BBA">BBA (Bachelor of Business Administration)</SelectItem>
                    <SelectItem value="BCom">B.Com (Bachelor of Commerce)</SelectItem>
                    <SelectItem value="BA">BA (Bachelor of Arts)</SelectItem>
                    <SelectItem value="MBBS">MBBS</SelectItem>
                    <SelectItem value="BDS">BDS</SelectItem>
                    <SelectItem value="LLB">LLB</SelectItem>
                    <SelectItem value="MS">MS (Master of Science)</SelectItem>
                    <SelectItem value="MBA">MBA (Master of Business Administration)</SelectItem>
                    <SelectItem value="MPhil">M.Phil</SelectItem>
                    <SelectItem value="PhD">PhD (Doctor of Philosophy)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="degreeType" render={({ field }) => (
              <FormItem>
                <FormLabel>Certificate Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="ATTESTATION">Attestation Certificate</SelectItem>
                    <SelectItem value="DUPLICATE_DEGREE">Duplicate Degree</SelectItem>
                    <SelectItem value="TRANSCRIPT">Transcript</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="rollNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>Roll Number</FormLabel>
                <FormControl><Input placeholder="2020-CS-001" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="registrationNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>Registration Number</FormLabel>
                <FormControl><Input placeholder="Reg No on degree" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="graduationYear" render={({ field }) => (
              <FormItem>
                <FormLabel>Graduation Year</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="2024" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="cgpa" render={({ field }) => (
              <FormItem>
                <FormLabel>CGPA / Percentage</FormLabel>
                <FormControl><Input placeholder="3.75 / 85%" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="division" render={({ field }) => (
              <FormItem>
                <FormLabel>Division</FormLabel>
                <FormControl><Input placeholder="First / Second / Third" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="degreeSerialNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>Degree Serial Number</FormLabel>
                <FormControl><Input placeholder="Serial no on degree certificate" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="degreeIssuanceDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Degree Issuance Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="transcriptSerialNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>Transcript Serial Number</FormLabel>
                <FormControl><Input placeholder="If applicable" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save & Continue'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
