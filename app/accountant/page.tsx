"use client";

import { useAuth } from "@/components/AuthProvider";
import { MobileTopNav } from "@/components/MobileTopNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
const db = getDb();
import { toast } from "sonner";
import { Loader2, IndianRupee, Save } from "lucide-react";
import { Payment } from "@/lib/types";

export default function AccountantPage() {
  const { user, roleData } = useAuth();
  const [amount, setAmount] = useState("");
  const [memberName, setMemberName] = useState("");
  const [trustAccount, setTrustAccount] = useState<"Trust" | "SMCA">("SMCA");
  const [mode, setMode] = useState<"Cash" | "Card" | "Online">("Cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!user) return;
    const loadRecent = async () => {
      try {
        const q = query(
          collection(db!, "payments"), 
          where("collectorUid", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const payments = snapshot.docs.map(doc => doc.data() as Payment);
        // sort by timestamp client side if simple
        payments.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecentPayments(payments.slice(0, 5));
      } catch(err) {
        console.error("Failed to fetch payments", err);
      }
    };
    loadRecent();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentData: Payment = {
        amount: Number(amount),
        trustAccount,
        mode,
        memberName: memberName.trim(),
        collectorUid: user.uid,
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db!, "payments"), paymentData);
      toast.success("Payment recorded successfully.");
      setRecentPayments([paymentData, ...recentPayments].slice(0, 5));
      setAmount("");
      setMemberName("");
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!roleData || (roleData.role !== "admin" && roleData.role !== "accountant")) {
    return <div className="p-4 text-center text-zinc-500 min-h-screen flex items-center justify-center">Access Denied.</div>;
  }

  return (
    <div className="bg-zinc-50 min-h-screen pb-20">
      <MobileTopNav title="Donation Desk" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="border-0 shadow-sm ring-1 ring-zinc-200 overflow-hidden rounded-2xl">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 w-full"></div>
            <CardHeader className="pt-6 sm:px-8">
              <CardTitle className="text-xl">Record Deposit</CardTitle>
              <CardDescription>Log a donation made by cash, card, or UPI.</CardDescription>
            </CardHeader>
            <CardContent className="sm:px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="memberName" className="font-semibold text-zinc-700">Member/Devotee Name</Label>
                  <Input 
                    id="memberName" 
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="E.g. Rahul Sharma"
                    required
                    className="bg-zinc-50/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" className="font-semibold text-zinc-700">Amount Given</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <Input 
                      id="amount" 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="2500"
                      className="pl-9 bg-zinc-50/50 font-medium text-lg leading-loose tracking-wider"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-zinc-700">Account</Label>
                    <Select value={trustAccount} onValueChange={(val: any) => setTrustAccount(val)}>
                      <SelectTrigger className="bg-zinc-50/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMCA">SMCA Account</SelectItem>
                        <SelectItem value="Trust">Trust Account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-zinc-700">Payment Mode</Label>
                    <Select value={mode} onValueChange={(val: any) => setMode(val)}>
                      <SelectTrigger className="bg-zinc-50/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Card">Card / POS</SelectItem>
                        <SelectItem value="Online">Online / UPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 h-12 text-md rounded-xl" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                  Submit Entry
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 px-1">Your Recent Entries</h2>
          <div className="space-y-3">
            {recentPayments.length === 0 ? (
              <div className="p-8 text-center border border-dashed bg-white border-zinc-200 rounded-2xl text-zinc-400 font-medium text-sm">
                No entries filed yet.
              </div>
            ) : (
              recentPayments.map((p, i) => (
                <Card key={i} className="shadow-none border border-zinc-200 rounded-2xl overflow-hidden hover:border-zinc-300 transition-colors">
                  <div className="p-4 sm:p-5 flex items-center justify-between bg-white">
                    <div>
                      <h3 className="font-bold text-zinc-900 leading-tight">{p.memberName}</h3>
                      <p className="text-[11px] font-medium text-zinc-500 mt-1 uppercase tracking-wider">
                        {p.mode} • {new Date(p.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-emerald-600 flex items-center justify-end">
                        <IndianRupee className="w-4 h-4 mr-0.5" />{p.amount.toLocaleString()}
                      </div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 inline-block px-2 py-0.5 rounded mt-1">
                        {p.trustAccount}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
