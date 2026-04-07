'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, Loader2, ShieldCheck, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface VaultUploaderProps {
  userId: string;
  onUploadComplete?: (docId: string) => void;
}

export function VaultUploader({ userId, onUploadComplete }: VaultUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [agentAccess, setAgentAccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);

      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Math.random()}.${fileExt}`;
      const filePath = `vault/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('homey-vault')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Insert record into user_documents
      const { data: doc, error: dbError } = await supabase
        .from('user_documents' as any)
        .insert({
          user_id: userId,
          file_name: file.name,
          storage_path: filePath,
          file_type: file.type,
          status: 'pending',
          agent_access_granted: agentAccess
        } as any)
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Trigger AI Processing (Client-side trigger for now, could be DB webhook)
      fetch('/api/vault/process', {
        method: 'POST',
        body: JSON.stringify({ documentId: (doc as any).id }),
        headers: { 'Content-Type': 'application/json' }
      }).catch(console.error);

      if (onUploadComplete) onUploadComplete((doc as any).id);

    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Privacy Consent */}
      <div 
        onClick={() => setAgentAccess(!agentAccess)}
        className={cn(
          "p-3 rounded-sm border flex items-center gap-3 cursor-pointer transition-all",
          agentAccess ? "bg-[#C8B89A]/5 border-[#C8B89A]/30" : "bg-[#0D0D0B] border-[#2A2A27]"
        )}
      >
        <div className={cn(
          "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
          agentAccess ? "bg-[#C8B89A] border-[#C8B89A] text-black" : "border-[#2A2A27]"
        )}>
          {agentAccess && <ShieldCheck className="w-3 h-3" />}
        </div>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wider font-bold text-[#C8B89A]">Agent Intelligence Access</p>
          <p className="text-[11px] text-[#6E6A65]">Allow my agent to view AI-extracted insights from these documents</p>
        </div>
      </div>

      <div
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative h-48 border-2 border-dashed rounded-sm flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group",
          dragActive ? "border-[#C8B89A] bg-[#C8B89A]/5" : "border-[#2A2A27] hover:border-[#4A4A47] bg-[#111]"
        )}
      >
        <input 
          ref={fileInputRef} 
          type="file" 
          className="hidden" 
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          accept="application/pdf,image/*"
        />

        {isUploading ? (
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-[#C8B89A] animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#F0EDE8] font-medium">Uploading to Vault...</p>
            <p className="text-[10px] text-[#6E6A65] mt-1 italic">Encrypting & Securely Storing</p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-[#1A1A17] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6 text-[#C8B89A]" />
            </div>
            <div className="text-center">
              <p className="text-xs text-[#F0EDE8] font-medium">Drop document or click to browse</p>
              <p className="text-[10px] text-[#6E6A65] mt-1 uppercase tracking-widest">PDF or Images (Max 10MB)</p>
            </div>
          </>
        )}

        {error && (
          <div className="absolute bottom-4 left-4 right-4 p-2 bg-red-900/20 border border-red-900/40 rounded flex items-center gap-2">
            <X className="w-3 h-3 text-red-500 cursor-pointer" onClick={(e) => { e.stopPropagation(); setError(null); }} />
            <p className="text-[10px] text-red-200">{error}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-1">
        <FileText className="w-3 h-3 text-[#555]" />
        <p className="text-[10px] text-[#555] uppercase tracking-tighter">Your documents are processed by Claude-3.5-Sonnet Vision</p>
      </div>
    </div>
  );
}
