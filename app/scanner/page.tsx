"use client";

import { useAuth } from "@/components/AuthProvider";
import { MobileTopNav } from "@/components/MobileTopNav";
import { ScannerComponent } from "@/components/ScannerComponent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
const db = getDb();
import { toast } from "sonner";
import { Loader2, QrCode } from "lucide-react";

export default function ScannerPage() {
  const { user, roleData } = useAuth();
  const [guestName, setGuestName] = useState("");
  const [guestNotes, setGuestNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receptionist must select the active event implicitly. We will fetch the active event.
  const createGuestPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    setIsSubmitting(true);
    try {
      // Find active event
      const eventsRef = collection(db!, "events");
      const q = query(eventsRef, where("isActive", "==", true));
      const activeEvents = await getDocs(q);

      if (activeEvents.empty) {
         toast.error("No active event found. Connect with Admin.");
         setIsSubmitting(false);
         return;
      }

      const activeEventId = activeEvents.docs[0].id;

      const couponData = {
        eventId: activeEventId,
        holderName: guestName.trim() + " (Guest)",
        status: "issued",
        source: "guest",
        ...(guestNotes && { notes: guestNotes })
      };

      const docRef = await addDoc(collection(db!, "coupons"), couponData);
      toast.success(`Guest pass created for ${guestName}`);
      
      // Optionally provide a link to view the pass
      toast("Pass Ready", {
        action: {
          label: "View Pass",
          onClick: () => window.open(`/pass/${docRef.id}`, "_blank"),
        },
      });

      setGuestName("");
      setGuestNotes("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create guest pass");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!roleData || (roleData.role !== "admin" && roleData.role !== "receptionist")) {
    return <div className="p-4 text-center text-zinc-500 min-h-screen flex items-center justify-center">Access Denied.</div>;
  }

  return (
    <div className="bg-zinc-50 min-h-screen pb-20">
      <MobileTopNav title="Entry Scanner" />
      
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <Tabs defaultValue="scan" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-zinc-200/50 p-1">
            <TabsTrigger value="scan" className="rounded-md flex items-center"><QrCode className="w-4 h-4 mr-2" /> Scanner</TabsTrigger>
            <TabsTrigger value="guest" className="rounded-md">Manual Guest</TabsTrigger>
          </TabsList>
          
          <TabsContent value="scan" className="mt-2">
            <ScannerComponent />
            <p className="text-center text-xs text-zinc-400 font-medium mt-6 bg-zinc-200/50 py-2 rounded-lg max-w-[250px] mx-auto border border-zinc-200">
              Auto-focus enabled. Aim at QR to scan.
            </p>
          </TabsContent>
          
          <TabsContent value="guest" className="mt-2">
            <Card className="border-0 shadow-sm ring-1 ring-zinc-200 overflow-hidden rounded-2xl">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 w-full"></div>
              <CardHeader className="pt-6 sm:px-8">
                <CardTitle className="text-xl">Instant Guest Pass</CardTitle>
                <CardDescription>Issue an on-the-spot digital pass for walk-in guests.</CardDescription>
              </CardHeader>
              <CardContent className="sm:px-8 pb-8">
                <form onSubmit={createGuestPass} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="guestName" className="font-semibold text-zinc-700">Guest Full Name</Label>
                    <Input 
                      id="guestName" 
                      placeholder="E.g. Rahul Sharma" 
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                      className="bg-zinc-50/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guestNotes" className="font-semibold text-zinc-700">Notes / Referral <span className="font-normal text-zinc-400">(Opt)</span></Label>
                    <Textarea 
                      id="guestNotes" 
                      placeholder="Special instructions..." 
                      value={guestNotes}
                      onChange={(e) => setGuestNotes(e.target.value)}
                      rows={2}
                      className="bg-zinc-50/50 resize-none"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800 h-12 text-md rounded-xl" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    Formulate Pass
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
