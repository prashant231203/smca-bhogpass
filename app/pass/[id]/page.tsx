"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
const db = getDb();
import { Coupon, Event } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar, MapPin, Tag, MessageCircle } from "lucide-react";
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
          {coupon.foodOrders && coupon.foodOrders.filter(o => o.item !== "Entry Pass").length > 0 ? (
            <div className="space-y-8 mt-4">
              {coupon.foodOrders.filter(o => o.item !== "Entry Pass").map((order, idx) => {
                const isFullyClaimed = order.claimed >= order.quantity;
                const qrUrl = `${window.location.origin}/pass/${id as string}?item=${encodeURIComponent(order.item)}`;
                
                return (
                  <div key={idx} className={`bg-white p-5 rounded-3xl shadow-sm border mx-auto inline-block border-zinc-200 transition-opacity ${isFullyClaimed ? 'opacity-50 grayscale' : ''}`}>
                    <h3 className="text-lg font-black text-zinc-800 mb-1">{order.item}</h3>
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-4">
                      {isFullyClaimed ? "Fully Claimed" : `Claimed: ${order.claimed} / ${order.quantity}`}
                    </p>
                    
                    <div className="relative">
                      <QRCodeSVG
                        value={qrUrl}
                        size={180}
                        level="H"
                        className="mx-auto"
                        includeMargin={false}
                      />
                      {isFullyClaimed && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] rounded-xl">
                          <span className="text-xl">✅</span>
                          <p className="text-sm font-black text-emerald-600 mt-1">Claimed</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 mt-4">
               <p className="text-sm font-medium text-zinc-500">No scannable food items on this pass.</p>
            </div>
          )}
          
          <div className="space-y-4 text-left mt-8">
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
                
                {coupon.foodItem && (
                  <div className="flex items-start gap-3 pt-3 border-t border-zinc-200 bg-amber-50/50 -mx-4 px-4 pb-3">
                    <div className="w-5 h-5 flex items-center justify-center text-xl mt-0.5">🍲</div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-700/70">Food Assigned (Legacy)</p>
                      <p className="text-lg font-black text-amber-700">{coupon.foodItem}</p>
                    </div>
                  </div>
                )}
                
                {coupon.foodOrders && coupon.foodOrders.length > 0 && (
                  <div className="pt-3 border-t border-zinc-200 bg-amber-50/50 -mx-4 px-4 pb-4 rounded-b-2xl">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">📋</span>
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Pass Details</p>
                    </div>
                    <div className="space-y-2">
                      {coupon.foodOrders.map((order, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-amber-200/50">
                           <span className="font-semibold text-zinc-800 text-sm">{order.item}</span>
                           <div className="flex items-center gap-2">
                             <span className="text-xs text-zinc-500">{order.claimed} / {order.quantity} Claimed</span>
                             <span className="font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-sm">x{order.quantity}</span>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-2 mt-6">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">WhatsApp Message</p>
              </div>
              <div className="text-sm text-zinc-700 whitespace-pre-wrap bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm font-medium leading-relaxed">
{`Hello ${coupon.holderName},

You are invited to *${event?.name || "Event"}* 🎉

Your entry pass and QR code are ready. Please carry this pass at the venue for smooth check-in.

🔗 Pass Link: https://smca-bhogpass.vercel.app/pass/${id as string}

We look forward to seeing you at the event.

Thank you,
Team SMCA`}
              </div>
            </div>
            
            <p className="text-xs text-center text-zinc-400 mt-4">
              Please present this QR code at the entrance scanner. 
              {coupon.status === "scanned" && <span className="block mt-1 text-rose-500 font-bold">This pass has already been scanned.</span>}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
