'use client';

import { useState } from 'react';

interface FlyerUploadProps {
  onSuccess: () => void;
  activeTheme: any;
}

export default function FlyerUpload({ onSuccess, activeTheme }: FlyerUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedEvents, setUploadedEvents] = useState<any[]>([]);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus('Reading image file...');
    setUploadedEvents([]);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setUploadStatus('Sending flyer to GPT-4o Vision model...');
      
      try {
        const res = await fetch('/api/admin/parse-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64String }),
        });
        const data = await res.json();
        
        if (data.success) {
          setUploadedEvents(data.events || []);
          setUploadStatus(`Extraction complete. Found ${data.events?.length || 0} events. Routed directly to Review Queue.`);
          onSuccess();
        } else {
          setUploadStatus(`Extraction failed: ${data.error || 'Parsing error'}`);
        }
      } catch (err) {
        setUploadStatus(`Upload failed: ${(err as Error).message}`);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className={`rounded-2xl border p-8 shadow-md text-center max-w-2xl mx-auto ${activeTheme.card}`}>
        <h2 className={`text-xl font-bold mb-2 ${activeTheme.textHeading}`}>Upload Flyer or Event Screenshot</h2>
        <p className={`text-xs mb-6 ${activeTheme.textMuted}`}>
          Directly upload a photo, flyer graphic, or Instagram post screenshot. The GPT-4o Vision model will identify all events and extract details automatically.
        </p>

        {/* Upload Dropzone Box */}
        <div className={`border-2 border-dashed rounded-2xl p-10 transition cursor-pointer relative group ${activeTheme.cardAlt} hover:border-violet-400`}>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading}
            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="flex flex-col items-center justify-center gap-3">
            <div className={`p-4 rounded-full border transition group-hover:border-violet-400 group-hover:text-violet-500 ${activeTheme.cardAlt} ${activeTheme.textMuted}`}>
              {uploading ? (
                <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <span className={`text-sm font-semibold ${activeTheme.textHeading}`}>
              {uploading ? 'Processing Image...' : 'Click to Upload or Drag & Drop'}
            </span>
            <span className={`text-[10px] ${activeTheme.textMuted}`}>PNG, JPG, or WEBP up to 5MB</span>
          </div>
        </div>

        {uploadStatus && (
          <div className={`mt-6 p-4 rounded-xl text-xs border text-left leading-relaxed ${
            uploadStatus.includes('failed') 
              ? 'bg-red-500/10 text-red-400 border-red-500/20' 
              : uploadStatus.includes('complete') 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : `${activeTheme.cardAlt} ${activeTheme.cardText}`
          }`}>
            {uploadStatus}
          </div>
        )}
      </div>

      {uploadedEvents.length > 0 && (
        <div className="max-w-4xl mx-auto space-y-4 animate-in slide-in-from-bottom duration-255">
          <h3 className={`text-md font-semibold ${activeTheme.textHeading}`}>Extracted Events</h3>
          <div className={`overflow-hidden border rounded-2xl divide-y ${activeTheme.cardAlt}`}>
            {uploadedEvents.map((ev, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className={`font-semibold text-sm ${activeTheme.textHeading}`}>{ev.title}</div>
                  <div className={`text-[11px] mt-0.5 ${activeTheme.accentText}`}>📍 {ev.location || 'Unknown location'}</div>
                  <div className={`text-[10px] mt-2 ${activeTheme.textMuted}`}>
                    Dates: {ev.startDate} {ev.endDate ? `to ${ev.endDate}` : ''} | Cost: {ev.cost || 'Free'}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-semibold uppercase tracking-wider">
                  Pending Review
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
