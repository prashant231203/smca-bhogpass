"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
const db = getDb();
import { Coupon, Event } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar, MapPin, Tag } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function PassPage() {
  const { id } = useParams();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    
    async function loadData() {
      try {
        const couponRef = doc(db!, "coupons", id as string);
        const couponSnap = await getDoc(couponRef);
        
        if (!couponSnap.exists()) {
          setError("Pass not found or invalid link.");
          setLoading(false);
          return;
        }
        
        const couponData = couponSnap.data() as Coupon;
        setCoupon(couponData);
        
        const eventRef = doc(db!, "events", couponData.eventId);
        const eventSnap = await getDoc(eventRef);
        
        if (eventSnap.exists()) {
          setEvent(eventSnap.data() as Event);
        }
        
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        setError("Error loading pass details.");
        setLoading(false);
      }
    }
    
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !coupon) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-8 text-center">
            <div className="text-zinc-500">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-50 p-4">
      <Card className="w-full max-w-sm relative overflow-hidden border-0 shadow-xl ring-1 ring-zinc-200">
        <div className="absolute top-0 left-0 w-full h-3 bg-indigo-600"></div>
        
        <CardHeader className="text-center pt-8 pb-4">
          <CardTitle className="text-3xl font-black text-indigo-900 tracking-tight">
            {coupon.holderName}
          </CardTitle>
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-widest mt-2 border border-indigo-200">
            {coupon.source} Pass
          </div>
        </CardHeader>
        
        <CardContent className="px-6 pb-8 text-center space-y-6">
          <div className="bg-white p-4 rounded-3xl shadow-sm border mx-auto inline-block border-zinc-200">
             <QRCodeSVG
               value={id as string}
               size={200}
               level="H"
               className="mx-auto"
               includeMargin={false}
             />
          </div>
          
          <div className="space-y-4 text-left">
            {event && (
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-indigo-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Event</p>
                    <p className="text-sm font-semibold text-zinc-900">{event.name}</p>
                    <p className="text-sm text-zinc-700">{event.date}</p>
                  </div>
                </div>
                
                {coupon.notes && (
                  <div className="flex items-start gap-3 pt-3 border-t border-zinc-200">
                    <Tag className="w-5 h-5 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Notes</p>
                      <p className="text-sm font-medium text-emerald-800">{coupon.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <p className="text-xs text-center text-zinc-400">
              Please present this QR code at the entrance scanner. 
              {coupon.status === "scanned" && <span className="block mt-1 text-rose-500 font-bold">This pass has already been scanned.</span>}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
