"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { doc, runTransaction } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
const db = getDb();
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, Utensils, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Coupon, FoodOrder } from "@/lib/types";

export function ScannerComponent() {
  const { user } = useAuth();
  const readerRef = useRef<HTMLDivElement>(null);
  const html5QrCode = useRef<Html5Qrcode | null>(null);
  
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    holderName?: string;
    foodOrders?: FoodOrder[];
  } | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);

  const processScan = useCallback(async (qrText: string) => {
    if (isProcessingRef.current || !user || scanResult) return;
    
    setIsProcessing(true);
    isProcessingRef.current = true;
    
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(200);
    }
    
    try {
      // We removed the pause() call here to prevent html5-qrcode state transition crashes.
      // The isProcessingRef flag ensures we ignore incoming frames while processing.

      // Extract ID if the QR code is a full URL (e.g. https://.../pass/abcd)
      let couponId = qrText;
      if (qrText.includes("/pass/")) {
        couponId = qrText.split("/pass/").pop() || qrText;
      } else if (qrText.includes("/")) {
        couponId = qrText.split("/").pop() || qrText;
      }

      const couponRef = doc(db!, "coupons", couponId);
      let holderName = "";
      let foodOrders: FoodOrder[] = [];
      let message = "";

      await runTransaction(db!, async (transaction) => {
        const couponDoc = await transaction.get(couponRef);
        if (!couponDoc.exists()) throw new Error("Unrecognised QR Code.");
        
        const data = couponDoc.data() as Coupon;
        holderName = data.holderName;
        
        if (data.status === "scanned") {
          throw new Error(`Already scanned! Holder: ${data.holderName}`);
        }
        
        const updateData: any = {
          status: "scanned",
          scannedAt: new Date().toISOString(),
          scannedBy: user.uid
        };

        // Normalize food orders
        let normalizedOrders = data.foodOrders || [];
        if (!data.foodOrders && data.foodItem) {
          normalizedOrders = [{ item: data.foodItem, quantity: 1, claimed: data.foodClaimed ? 1 : 0 }];
        }

        if (normalizedOrders.length > 0) {
          foodOrders = normalizedOrders;
          // Claim all food orders in full on the first (and only) scan
          updateData.foodOrders = normalizedOrders.map(o => ({ ...o, claimed: o.quantity }));
          updateData.foodClaimed = true;
          updateData.foodClaimedAt = new Date().toISOString();
          updateData.foodClaimedBy = user.uid;
          message = "Food claimed & entry approved!";
        } else {
          message = "Entry Approved!";
        }

        transaction.update(couponRef, updateData);
      });

      setScanResult({
        success: true,
        message,
        holderName,
        foodOrders: foodOrders.length > 0 ? foodOrders : undefined
      });
      
    } catch (e: any) {
      setScanResult({
        success: false,
        message: e.message || "Scan failed"
      });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [user, scanResult]);

  const resetScanner = useCallback(() => {
    setScanResult(null);
    setIsProcessing(false);
    isProcessingRef.current = false;
    // We no longer pause/resume the camera, just reset the processing flags
  }, []);

  // Handle automatic timeout for scanner reset
  useEffect(() => {
    if (!scanResult) return;

    const timeoutDuration = scanResult.success ? 4500 : 3000;
    const timer = setTimeout(() => {
      resetScanner();
    }, timeoutDuration);

    return () => clearTimeout(timer);
  }, [scanResult, resetScanner]);

  // Keep a fresh reference to processScan to avoid scanner restart loops
  const processScanRef = useRef(processScan);
  useEffect(() => {
    processScanRef.current = processScan;
  }, [processScan]);

  useEffect(() => {
    if (!readerRef.current) return;
    
    // Only initialize once to prevent race conditions
    if (html5QrCode.current) return;

    html5QrCode.current = new Html5Qrcode("reader", { 
       formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
       verbose: false
    });

    const startScanner = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
           await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        }
        
        await html5QrCode.current?.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => { processScanRef.current(decodedText); },
          () => {}
        );
      } catch (err: any) {
        if (String(err).includes("already under transition")) return;
        if (err?.name === "NotAllowedError" || String(err).includes("NotAllowedError") || String(err).includes("Permission denied")) {
          setScanResult({ success: false, message: "Camera access blocked. Please grant camera permission." });
        } else {
          setScanResult({ success: false, message: "Failed to access camera. Please check camera connections." });
        }
      }
    };

    startScanner();

    return () => {
      if (html5QrCode.current?.isScanning) {
        html5QrCode.current.stop().then(() => {
          html5QrCode.current?.clear();
          html5QrCode.current = null;
        }).catch(() => {});
      }
    };
  }, []);

  return (
    <div className="relative">
      <Card className="overflow-hidden border-2 shadow-2xl ring-4 ring-zinc-900 border-zinc-900 mx-auto max-w-sm relative rounded-2xl">
        <CardContent className="p-0 bg-black min-h-[300px] flex items-center justify-center relative">
          <div id="reader" ref={readerRef} className="w-full h-full min-h-[300px]" style={{ border: 'none' }} />
          
          {/* Processing Overlay */}
          {isProcessing && !scanResult && (
            <div className="absolute z-10 inset-0 flex flex-col items-center justify-center p-6 text-center bg-indigo-900/90 text-white backdrop-blur-md animate-in fade-in duration-200">
              <Loader2 className="w-16 h-16 mb-4 animate-spin text-white drop-shadow-md" />
              <p className="text-xl font-black tracking-widest uppercase">Verifying Pass</p>
            </div>
          )}

          {/* Result Overlay */}
          {scanResult && (
            <div className={cn(
              "absolute z-20 inset-0 flex flex-col items-center justify-between p-6 text-center animate-in fade-in zoom-in-95 duration-200 text-white",
              scanResult.success 
                ? "bg-gradient-to-br from-emerald-600 to-teal-700" 
                : "bg-gradient-to-br from-rose-600 to-red-700"
            )}>
              <div className="w-full flex-1 flex flex-col items-center justify-center py-4">
                {scanResult.success ? (
                  <CheckCircle2 className="w-20 h-20 mb-3 animate-bounce drop-shadow-md text-emerald-100" />
                ) : (
                  <AlertCircle className="w-20 h-20 mb-3 animate-pulse drop-shadow-md text-rose-100" />
                )}
                
                <h3 className="text-3xl font-black uppercase tracking-tight mb-1 drop-shadow-md animate-pulse">
                  {scanResult.success ? "Approved" : "Denied"}
                </h3>
                
                {scanResult.holderName && (
                  <p className="text-xl font-bold font-sans bg-black/25 py-1.5 px-4 rounded-xl mt-2 max-w-full truncate drop-shadow-md border border-white/10">
                    {scanResult.holderName}
                  </p>
                )}
                
                <p className="mt-2 text-white/90 text-sm font-semibold drop-shadow-sm px-2">
                  {scanResult.message}
                </p>

                {/* Display food orders clearly */}
                {scanResult.success && scanResult.foodOrders && scanResult.foodOrders.length > 0 && (
                  <div className="w-full mt-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-3 text-left space-y-1.5 max-h-[140px] overflow-y-auto">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200 flex items-center gap-1 mb-1">
                      <Utensils className="w-3 h-3" /> Serve Food Items
                    </p>
                    <div className="space-y-1">
                      {scanResult.foodOrders.map((order, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-black/15 py-1 px-2.5 rounded-lg border border-white/5">
                          <span className="text-xs font-bold text-white truncate max-w-[180px]">{order.item}</span>
                          <span className="font-mono font-black text-xs bg-emerald-500 text-white px-2 py-0.5 rounded shadow-sm">
                            QTY: {order.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="w-full pt-2">
                <Button 
                  onClick={resetScanner}
                  variant="outline"
                  className={cn(
                    "w-full h-11 text-sm font-bold rounded-xl border-white/20 bg-white/10 text-white transition-all shadow-lg",
                    scanResult.success 
                      ? "hover:bg-white hover:text-emerald-950" 
                      : "hover:bg-white hover:text-rose-950"
                  )}
                >
                  Scan Next <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
