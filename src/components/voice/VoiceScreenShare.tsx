"use client";

import { useRef, useEffect } from "react";
import { useVoice } from "@/contexts/VoiceContext";

export default function VoiceScreenShare() {
  const { isSharingScreen, screenSharerId, screenShareName, screenStream, stopScreenShare } = useVoice();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = screenStream;
      if (screenStream) videoRef.current.play().catch(() => {});
    }
  }, [screenStream]);

  const hasScreen = isSharingScreen || screenSharerId !== null;
  if (!hasScreen) return null;

  return (
    <div className="flex-1 flex flex-col bg-black/90 min-h-0 relative">
      <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white text-sm flex items-center gap-2">
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {screenShareName}
      </div>
      {isSharingScreen && (
        <button
          onClick={stopScreenShare}
          className="absolute top-3 right-3 z-10 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
        >
          Остановить
        </button>
      )}
      <div className="flex-1 flex items-center justify-center p-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSharingScreen}
          className="max-w-full max-h-full rounded-lg object-contain"
        />
      </div>
    </div>
  );
}
