'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export default function UploadDropzone() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error('Please upload a PDF or image under 4MB.');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let message = 'Failed to upload report';

        try {
          const errorData = await response.json();
          message = errorData.error || message;
        } catch {
          if (response.status === 413) {
            message = 'This file is too large for the hosted app. Please upload a PDF or image under 4MB.';
          }
        }

        throw new Error(message);
      }

      const data = await response.json();
      
      sessionStorage.setItem('current_insights', JSON.stringify(data.insights));
      if (data.fileUrl) {
        sessionStorage.setItem('current_fileUrl', data.fileUrl);
      } else {
        sessionStorage.removeItem('current_fileUrl');
      }

      setUploadStatus('success');
      
      setTimeout(() => {
         router.push(`/dashboard/${data.reportId || 'new'}`);
      }, 1000);
      
    } catch (error: any) {
      console.error('Upload Error:', error);
      setUploadStatus('error');
      setErrorMessage(error.message || 'Something went wrong.');
    } finally {
      setIsUploading(false);
    }
  }, [router]);

  const onDropRejected = useCallback(() => {
    setUploadStatus('error');
    setErrorMessage('Please upload one PDF, PNG, JPG, or WEBP file under 4MB.');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    maxSize: MAX_UPLOAD_BYTES,
    disabled: isUploading || uploadStatus === 'success'
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-xl p-10 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 text-center
          ${isDragActive
            ? 'border-[var(--accent-purple)] bg-[var(--accent-purple)]/5'
            : 'border-[var(--border-light)] hover:border-[var(--accent-purple)]/50 hover:bg-[var(--bg-card-hover)]'}
          ${isUploading || uploadStatus === 'success' ? 'opacity-60 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
           <div className="w-14 h-14 rounded-2xl bg-[var(--accent-purple)]/10 flex items-center justify-center">
             <Loader2 className="w-7 h-7 text-[var(--accent-purple)] animate-spin" />
           </div>
        ) : uploadStatus === 'success' ? (
           <div className="w-14 h-14 rounded-2xl bg-[var(--accent-green)]/10 flex items-center justify-center">
             <CheckCircle className="w-7 h-7 text-[var(--accent-green)]" />
           </div>
        ) : (
           <div className="w-14 h-14 rounded-2xl bg-[var(--accent-blue)]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
             <UploadCloud className={`w-7 h-7 ${isDragActive ? 'text-[var(--accent-purple)]' : 'text-[var(--accent-blue)]'}`} />
           </div>
        )}

        <div className="space-y-1">
          {isUploading ? (
            <>
              <p className="text-base font-semibold text-[var(--text-primary)]">Analyzing Your Report...</p>
              <p className="text-sm text-[var(--text-muted)]">This may take a few seconds</p>
            </>
          ) : uploadStatus === 'success' ? (
            <p className="text-base font-semibold text-[var(--accent-green)]">Analysis Complete! Redirecting...</p>
          ) : (
             <>
               <p className="text-base font-semibold text-[var(--text-primary)]">
                 {isDragActive ? 'Drop your report file here' : 'Drag & drop your lab report PDF or image'}
               </p>
               <p className="text-sm text-[var(--text-muted)]">
                 or <span className="text-[var(--accent-purple)] underline underline-offset-2">browse files</span>
               </p>
             </>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
        Supports PDF, PNG, JPG, and WEBP files up to 4MB. For best results, use a straight, readable export or photo that clearly shows the result and reference-range columns.
      </p>
      
      {uploadStatus === 'error' && (
        <div className="mt-4 p-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20">
          <p className="text-sm text-[var(--accent-red)] font-medium text-center">
            {errorMessage}
          </p>
        </div>
      )}
    </div>
  );
}
