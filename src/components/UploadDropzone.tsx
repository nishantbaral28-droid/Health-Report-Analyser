'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload report');
      }

      const data = await response.json();
      
      sessionStorage.setItem('current_insights', JSON.stringify(data.insights));
      if (data.fileUrl) sessionStorage.setItem('current_fileUrl', data.fileUrl);

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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxFiles: 1,
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
                 {isDragActive ? 'Drop your report here' : 'Drag & drop your lab report'}
               </p>
               <p className="text-sm text-[var(--text-muted)]">
                 or <span className="text-[var(--accent-purple)] underline underline-offset-2">browse files</span>
               </p>
             </>
          )}
        </div>
      </div>
      
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
