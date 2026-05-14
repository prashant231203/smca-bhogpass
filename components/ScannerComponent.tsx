"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { doc, runTransaction } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
const db = getDb();
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScannerComponent() {
  const { user } = useAuth();
  const readerRef = useRef<HTMLDivElement>(null);
  const html5QrCode = useRef<Html5Qrcode | null>(null);
  
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    holderName?: string;
  } | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false); // To avoid tracking in dependencies

  const processScan = useCallback(async (qrText: string) => {
    if (isProcessingRef.current || !user) return;
    
    setIsProcessing(true);
    isProcessingRef.current = true;
    
    // Attempt haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(200);
    }
    
    try {
      const couponRef = doc(db!, "coupons", qrText);
      
      await runTransaction(db!, async (transaction) => {
        const couponDoc = await transaction.get(couponRef);
        
        if (!couponDoc.exists()) {
          throw new Error("unrecognised QR Code.");
        }
        
        const data = couponDoc.data();
        
        if (data.status === "scanned") {
          throw new Error(`Already scanned! Holder: ${data.holderName}`);
        }
        
        if (data.status === "issued") {
          transaction.update(couponRef, {
            status: "scanned",
            scannedAt: new Date().toISOString(),
            scannedBy: user.uid
          });
          setScanResult({ success: true, message: "Valid Pass", holderName: data.holderName });
        } else {
           throw new Error("Invalid Pass");
        }
      });
      
    } catch (e: any) {
      setScanResult({ success: false, message: e.message || "Scan failed" });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(200); // Standard vibration pattern
      }
    }
    
    // 1.5-second UI freeze before resuming
    setTimeout(() => {
      setScanResult(current => {
        // Don't clear permission errors automatically
        if (current?.message.includes("Camera access blocked")) return current;
        return null;
      });
      setIsProcessing(false);
      isProcessingRef.current = false;
    }, 1500);
    
  }, [user]);

  useEffect(() => {
    if (!readerRef.current) return;
    
    // Cleanup any existing instance
    if (html5QrCode.current && html5QrCode.current.isScanning) {
       html5QrCode.current.stop().catch(() => {});
    }

    // Initialize scanner
    html5QrCode.current = new Html5Qrcode("reader", { 
       formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
       verbose: false
    });

    const startScanner = async () => {
      try {
        if (html5QrCode.current?.isScanning) return;
        
        // Explicitly check for constraints first to trigger prompt
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
           await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        }
        
        await html5QrCode.current?.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            processScan(decodedText);
          },
          (errorMessage) => {
             // Ignoring frequent error messages from empty frames
          }
        );
      } catch (err: any) {
        console.error("Failed to start scanner", err);
        // Ignore "already under transition" errors that happen when hot-reloading
        if (String(err).includes("already under transition")) return;
        
        if (err?.name === "NotAllowedError" || String(err).includes("NotAllowedError") || String(err).includes("Permission denied")) {
          setScanResult({
            success: false,
            message: "Camera access blocked. Please click 'Open in new tab' (top right) or allow camera permissions in your browser.",
          });
        } else {
           setScanResult({
            success: false,
            message: "Failed to access camera. Device may not support it or it's currently in use.",
          });
        }
      }
    };

    startScanner();

    return () => {
      if (html5QrCode.current?.isScanning) {
        html5QrCode.current.stop()
         .then(() => html5QrCode.current?.clear())
         .catch((err) => console.error("Error stopping scanner", err));
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run ONLY once when mounted

  return (
    <Card className="overflow-hidden border-2 shadow-2xl ring-4 ring-zinc-900 border-zinc-900 mx-auto max-w-sm relative rounded-2xl">
      <CardContent className="p-0 bg-black min-h-[300px] flex items-center justify-center relative">
        <div id="reader" ref={readerRef} className="w-full h-full min-h-[300px]" style={{ border: 'none' }} />
        
        {/* Overlay for processing/results */}
        {(isProcessing || scanResult) && (
           <div className={cn(
             "absolute z-10 inset-0 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200",
             scanResult?.success === true ? "bg-emerald-600 text-white" : 
             scanResult?.success === false ? "bg-rose-600 text-white" : 
             "bg-indigo-600/90 text-white backdrop-blur-md"
           )}>
             {scanResult ? (
               <>
                 {scanResult.success ? <CheckCircle2 className="w-24 h-24 mb-4 animate-bounce drop-shadow-md" /> : <AlertCircle className="w-24 h-24 mb-4 animate-pulse drop-shadow-md" />}
                 <h3 className="text-4xl font-black uppercase tracking-tight mb-2 drop-shadow-md">{scanResult.success ? "Approved" : "Denied"}</h3>
                 {scanResult.holderName && <p className="text-2xl font-bold font-mono bg-black/30 py-2 px-4 rounded-xl mt-2 drop-shadow-md">{scanResult.holderName}</p>}
                 <p className="mt-4 text-white/95 font-bold text-lg drop-shadow-md">{scanResult.message}</p>
               </>
             ) : (
                <div className="flex flex-col items-center">
                  <Ticket className="w-16 h-16 mb-4 animate-spin drop-shadow-md" />
                  <p className="text-xl font-black tracking-widest uppercase drop-shadow-md">Verifying</p>
                </div>
             )}
           </div>
        )}
      </CardContent>
    </Card>
  );
}
