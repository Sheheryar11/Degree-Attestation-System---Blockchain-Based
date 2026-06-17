'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';
import { Upload, X, CheckCircle, FileText } from 'lucide-react';

const REQUIRED_DOCS = [
  { type: 'CNIC_FRONT',  label: 'CNIC Front',    accept: 'image/*' },
  { type: 'CNIC_BACK',   label: 'CNIC Back',     accept: 'image/*' },
  { type: 'PHOTO',       label: 'Passport Photo', accept: 'image/*' },
  { type: 'DEGREE',      label: 'Degree Certificate', accept: 'image/*,application/pdf' },
  { type: 'TRANSCRIPT',  label: 'Transcript',     accept: 'image/*,application/pdf' },
];

export function DocumentUploadForm({ applicationId, onComplete }: { applicationId: string; onComplete: () => void }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data } = useQuery({
    queryKey: ['documents', applicationId],
    queryFn: () => apiClient.get(`/applications/${applicationId}/documents`),
  });

  const docs: { id: string; type: string; originalFilename: string }[] = data?.data ?? [];
  const uploadedTypes = new Set(docs.map((d) => d.type));

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      const form = new FormData();
      form.append('file', file);
      form.append('type', type);
      return apiClient.post(`/applications/${applicationId}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Document uploaded');
      qc.invalidateQueries({ queryKey: ['documents', applicationId] });
      setUploading(null);
    },
    onError: () => {
      toast.error('Upload failed. Please try again.');
      setUploading(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => apiClient.delete(`/applications/${applicationId}/documents/${documentId}`),
    onSuccess: () => {
      toast.success('Document removed');
      qc.invalidateQueries({ queryKey: ['documents', applicationId] });
    },
  });

  const handleFileSelect = (type: string, file: File) => {
    setUploading(type);
    uploadMutation.mutate({ file, type });
  };

  const allRequired = REQUIRED_DOCS.every((d) => uploadedTypes.has(d.type));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload clear, legible scans or photos. Max 10 MB per file. Accepted: JPG, PNG, PDF.
      </p>

      <div className="space-y-3">
        {REQUIRED_DOCS.map((req) => {
          const uploaded = docs.find((d) => d.type === req.type);
          const isUploading = uploading === req.type;

          return (
            <div key={req.type} className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                {uploaded ? (
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">{req.label}</p>
                  {uploaded && (
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{uploaded.originalFilename}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {uploaded ? (
                  <>
                    <Badge variant="default">Uploaded</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteMutation.mutate(uploaded.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <input
                      ref={(el) => { inputRefs.current[req.type] = el; }}
                      type="file"
                      accept={req.accept}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(req.type, file);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => inputRefs.current[req.type]?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-2">
        <p className="text-xs text-muted-foreground">
          {uploadedTypes.size}/{REQUIRED_DOCS.length} required documents uploaded
        </p>
        <Button onClick={onComplete} disabled={!allRequired}>
          {allRequired ? 'Continue to Review' : `Upload ${REQUIRED_DOCS.length - uploadedTypes.size} more`}
        </Button>
      </div>
    </div>
  );
}
