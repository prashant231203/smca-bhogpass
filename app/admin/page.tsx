"use client";

import { useAuth } from "@/components/AuthProvider";
import { MobileTopNav } from "@/components/MobileTopNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDb } from "@/lib/firebase";
const db = getDb();
import { collection, addDoc, getDocs, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Loader2, Plus, Calendar, Users, Mail, Phone, Users2, Download, Upload, FileSpreadsheet, DownloadCloud } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Event, Coupon, Member, PreRegistration } from "@/lib/types";
import * as xlsx from "xlsx";
import { MemberTable } from "@/components/MemberTable";

export default function AdminPage() {
  const { user, roleData } = useAuth();
  
  // Event State
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [eventFoodMenu, setEventFoodMenu] = useState("");
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [events, setEvents] = useState<(Event & { id: string })[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<(Coupon & { id: string })[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [eventStats, setEventStats] = useState<Record<string, { issued: number, scanned: number }>>({});

  // Member State
  const [members, setMembers] = useState<(Member & { id: string })[]>([]);
  const [membershipType, setMembershipType] = useState<"Life Member" | "Associate Member" | "Annual Member">("Life Member");
  const [membershipId, setMembershipId] = useState("");
  const [primaryName, setPrimaryName] = useState("");
  const [spouseName, setSpouseName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberWhatsapp, setMemberWhatsapp] = useState("");
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [childrenNames, setChildrenNames] = useState<string[]>([]);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Bulk Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const foodFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingFood, setIsUploadingFood] = useState<string | null>(null); // Stores eventId being uploaded to

  // Pre-Registration State
  const [preRegistrations, setPreRegistrations] = useState<(PreRegistration & { id: string })[]>([]);
  const [preRegName, setPreRegName] = useState("");
  const [preRegPhone, setPreRegPhone] = useState("");
  const [preRegQuantity, setPreRegQuantity] = useState<number>(1);
  const [preRegEventId, setPreRegEventId] = useState("");
  const [isAddingPreReg, setIsAddingPreReg] = useState(false);

  useEffect(() => {
    loadEvents();
    loadMembers();
    loadPreRegistrations();

    // Setup live subscription for event stats (issued vs scanned)
    const unsubscribeCoupons = onSnapshot(collection(db!, "coupons"), (snapshot) => {
      const stats: Record<string, { issued: number, scanned: number }> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Coupon;
        if (!stats[data.eventId]) {
          stats[data.eventId] = { issued: 0, scanned: 0 };
        }
        stats[data.eventId].issued++;
        if (data.status === "scanned") {
          stats[data.eventId].scanned++;
        }
      });
      setEventStats(stats);
      
      // Update Attendees if an event is selected
      if (selectedEventId) {
        const selectedAttendees = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Coupon & {id: string}))
          .filter(c => c.eventId === selectedEventId && c.status === "scanned")
          .sort((a, b) => new Date(b.scannedAt || 0).getTime() - new Date(a.scannedAt || 0).getTime());
        setAttendees(selectedAttendees);
      }
    });

    return () => {
      unsubscribeCoupons();
    };
  }, [selectedEventId]);

  const loadEvents = async () => {
    try {
       const q = query(collection(db!, "events"));
       const snapshot = await getDocs(q);
       const evts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (Event & {id: string})));
       const sortedEvents = evts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
       setEvents(sortedEvents);
       
       if (!selectedEventId) {
         const activeEvent = sortedEvents.find(e => e.isActive);
         if (activeEvent) {
           setSelectedEventId(activeEvent.id);
         }
       }
    } catch(err) {
      console.error(err);
    }
  };

  const loadMembers = async () => {
    try {
       const q = query(collection(db!, "members"));
       const snapshot = await getDocs(q);
       const mems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (Member & {id: string})));
       setMembers(mems);
    } catch(err) {
      console.error(err);
    }
  };

  const loadPreRegistrations = async () => {
    try {
       const q = query(collection(db!, "preRegistrations"));
       const snapshot = await getDocs(q);
       const preRegs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (PreRegistration & {id: string})));
       setPreRegistrations(preRegs.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch(err) {
      console.error(err);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsCreatingEvent(true);
    
    try {
      const formattedDate = eventTime ? `${eventDate} ${eventTime}` : eventDate;

      const newEvent: Event = {
        name: eventName,
        date: formattedDate,
        hasTime: !!eventTime,
        isActive: true,
        createdBy: user.uid,
        ...(eventNotes && { notes: eventNotes }),
        ...(eventFoodMenu && { foodMenu: eventFoodMenu.split(",").map(i => i.trim()).filter(Boolean) })
      };
      
      const docRef = await addDoc(collection(db!, "events"), newEvent);
      toast.success("Event active! Awaiting pass generation via Food CSV or Pre-Registration.");

      setEventName("");
      setEventDate("");
      setEventTime("");
      setEventNotes("");
      setEventFoodMenu("");
      loadEvents();
    } catch(err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create event");
    } finally {
       setIsCreatingEvent(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user || !membershipId.trim() || !primaryName.trim() || !memberEmail.trim() || !memberWhatsapp.trim()) {
       toast.error("Please fill all required fields");
       return;
     }

     setIsAddingMember(true);
     
     try {
       const newMember: Member = {
         membershipType,
         membershipId: membershipId.trim(),
         primaryName: primaryName.trim(),
         email: memberEmail.trim(),
         whatsapp: memberWhatsapp.trim(),
         familyCount: 1 + (spouseName.trim() ? 1 : 0) + childrenCount,
         ...(spouseName.trim() && { spouseName: spouseName.trim() }),
         ...(childrenCount > 0 && { childrenNames: childrenNames.slice(0, childrenCount).map(n => n.trim()) })
       };
       
       await addDoc(collection(db!, "members"), newMember);
       toast.success("Member securely added to directory!");
       
       setMembershipId("");
       setPrimaryName("");
       setSpouseName("");
       setMemberEmail("");
       setMemberWhatsapp("");
       setChildrenCount(0);
       setChildrenNames([]);
       loadMembers();
       
     } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to add member");
     } finally {
        setIsAddingMember(false);
     }
  };

  const handleChildrenCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let count = parseInt(e.target.value) || 0;
    if (count < 0) count = 0;
    if (count > 10) count = 10;
    
    setChildrenCount(count);
    
    // Adjust children array size
    setChildrenNames(prev => {
      const newNames = [...prev];
      if (newNames.length < count) {
        for (let i = newNames.length; i < count; i++) {
          newNames.push("");
        }
      } else if (newNames.length > count) {
        return newNames.slice(0, count);
      }
      return newNames;
    });
  };

  const handleChildNameChange = (index: number, value: string) => {
    setChildrenNames(prev => {
      const newNames = [...prev];
      newNames[index] = value;
      return newNames;
    });
  };

  const downloadSampleExcel = () => {
    const ws = xlsx.utils.json_to_sheet([
      { 
        membership_type: "Life Member", 
        membership_id: "LM-001",
        primary_name: "Rahul Sharma",
        spouse_name: "Priya Sharma",
        children_count: 2,
        child_names_comma_separated: "Aarav, Ananya",
        whatsapp: "9876543210",
        email: "rahul@example.com"
      }
    ]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Template");
    xlsx.writeFile(wb, "SMCA_BulkMember_Template.xlsx");
  };

  const handleFoodBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>, eventId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFood(eventId);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = xlsx.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

          const activeEvent = events.find(e => e.id === eventId);
          const eventName = activeEvent?.name || "Event";

          let passesGeneratedCount = 0;
          let messagesSentCount = 0;
          let failureCount = 0;
          
          const ignoreHeaders = ['srl no', 'smca member name', 'phone number (mandatory)', 'phone', 'whatsapp', 'name', 'sno', 'sl no', 'phone number', 'contact'];

          for (const row of rows) {
            // Normalize headers to find name and phone easily
            const normalizedRow = Object.keys(row).reduce((acc: any, key) => {
                acc[key.toLowerCase().trim().replace(/ /g, '_')] = row[key];
                return acc;
            }, {});

            const holderName = normalizedRow.smca_member_name || normalizedRow.name || normalizedRow.pass_holder;
            let phoneNum = normalizedRow['phone_number_(mandatory)'] || normalizedRow.phone || normalizedRow.whatsapp || normalizedRow.contact || normalizedRow.phone_number;

            if (!holderName || !phoneNum) {
                failureCount++;
                continue; 
            }

            const foodOrders: {item: string, quantity: number, claimed: number}[] = [];
            
            // Look for food columns
            for (const key of Object.keys(row)) {
                const lowerKey = key.toLowerCase().trim();
                // Check if this key is in our ignore list (we ignore basic identity columns)
                const isIgnored = ignoreHeaders.some(h => lowerKey === h || lowerKey.replace(/ /g, '_') === h.replace(/ /g, '_'));
                if (isIgnored) continue;

                const quantity = parseInt(row[key]);
                if (isNaN(quantity) || quantity <= 0) continue;

                foodOrders.push({
                  item: key.trim(),
                  quantity: quantity,
                  claimed: 0
                });
            }

            if (foodOrders.length > 0) {
              const passPromises = [];
              const couponData = {
                eventId: eventId,
                holderName: holderName.toString().trim(),
                status: "issued",
                source: "guest",
                foodOrders: foodOrders
              };

              const p = addDoc(collection(db!, "coupons"), couponData).then(ref => ({
                id: ref.id,
                label: holderName.toString().trim() + " (Family Pass)",
                url: `${window.location.origin}/pass/${ref.id}`
              }));
              passPromises.push(p);

              const generatedPasses = await Promise.all(passPromises);
              passesGeneratedCount += generatedPasses.length;

              // Send WhatsApp
              try {
                const res = await fetch("/api/send-whatsapp", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ 
                    phone: phoneNum.toString(), 
                    name: holderName.toString(), 
                    passes: generatedPasses, 
                    eventName 
                  })
                });
                if (res.ok) messagesSentCount++;
              } catch (err) {
                 console.error("Failed to send whatsapp pass to", phoneNum, err);
              }
            } else {
              // Row had name and phone, but no valid food quantities
              failureCount++;
            }
          }

          toast.success(`Generated ${passesGeneratedCount} passes and sent ${messagesSentCount} WhatsApp messages! ${failureCount > 0 ? `(${failureCount} rows skipped)` : ""}`);
        } catch (err: unknown) {
          console.error("Food Upload Error:", err);
          toast.error(`Failed to parse CSV: ${err instanceof Error ? err.message : "Ensure format."}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      toast.error("Upload error");
    } finally {
      if (foodFileInputRef.current) foodFileInputRef.current.value = "";
      setIsUploadingFood(null);
    }
  };

  const exportAttendees = () => {
    if (attendees.length === 0) {
      toast.error("No attendees to export");
      return;
    }
    try {
      const activeEvent = events.find(e => e.id === selectedEventId);
      const eventName = activeEvent ? activeEvent.name : "Event";
      const exportData = attendees.map(a => ({
        "Pass Holder": a.holderName,
        "Source": a.source,
        "Status": a.status,
        "Scanned Time": a.scannedAt ? new Date(a.scannedAt).toLocaleString() : "Not Scanned",
        "Food Assigned": a.foodItem || "None",
        "Food Claimed": a.foodClaimed ? "Yes" : "No",
        "Notes": a.notes || ""
      }));
      const ws = xlsx.utils.json_to_sheet(exportData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Attendees");
      xlsx.writeFile(wb, `SMCA_${eventName.replace(/\s+/g, '_')}_Report.xlsx`);
      toast.success("Report downloaded!");
    } catch (e) {
      toast.error("Failed to export report");
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = xlsx.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

          let successCount = 0;
          let failureCount = 0;
          
          for (const row of rows) {
            // Normalize header names to lowercase for comparison
            const normalizedRow = Object.keys(row).reduce((acc: any, key) => {
                acc[key.toLowerCase().replace(/ /g, '_')] = row[key];
                return acc;
            }, {});

            const membershipId = normalizedRow.membership_id || normalizedRow.member_id || normalizedRow.id;
            const primaryName = normalizedRow.primary_name || normalizedRow.name;
            const email = normalizedRow.email;

            if (!membershipId || !primaryName || !email) {
                console.warn("Skipping invalid row:", row);
                failureCount++;
                continue; 
            }

            let childrenList: string[] = [];
            const childCount = parseInt(normalizedRow.children_count || 0) || 0;
            const childNames = normalizedRow.child_names_comma_separated || normalizedRow.children_names || "";
            
            if (childNames) {
              childrenList = childNames.toString().split(',').map((n: string) => n.trim()).filter((n: string) => n.length > 0);
            }

            const newMember: Member = {
              membershipType: ["Associate Member", "Annual Member"].includes(normalizedRow.membership_type) ? normalizedRow.membership_type : "Life Member",
              membershipId: membershipId.toString(),
              primaryName: primaryName.toString(),
              spouseName: normalizedRow.spouse_name?.toString() || "",
              familyCount: 1 + (normalizedRow.spouse_name ? 1 : 0) + childCount,
              childrenNames: childrenList,
              whatsapp: normalizedRow.whatsapp?.toString() || "",
              email: email.toString()
            };

            await addDoc(collection(db!, "members"), newMember);
            successCount++;
          }

          toast.success(`Successfully uploaded ${successCount} members! ${failureCount > 0 ? `(${failureCount} rows skipped due to missing required fields.)` : ""}`);
          loadMembers();
        } catch (err: unknown) {
          console.error("Excel Upload Error:", err);
          toast.error(`Failed to parse Excel file: ${err instanceof Error ? err.message : "Ensure template format."}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      toast.error("Upload error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsUploading(false);
    }
  };

  const handleAddPreRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preRegName.trim() || !preRegEventId) return;
    setIsAddingPreReg(true);
    try {
      const data: PreRegistration = {
        name: preRegName.trim(),
        phone: preRegPhone.trim(),
        quantity: preRegQuantity,
        eventId: preRegEventId,
        status: "pending",
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db!, "preRegistrations"), data);
      toast.success("Pre-Registration added as Pending.");
      setPreRegName("");
      setPreRegPhone("");
      setPreRegQuantity(1);
      loadPreRegistrations();
    } catch (e) {
      toast.error("Failed to add pre-registration");
    } finally {
      setIsAddingPreReg(false);
    }
  };

  const handleMarkPaid = async (pr: PreRegistration & {id: string}) => {
    if (!confirm(`Mark ${pr.name}'s registration as paid and generate ${pr.quantity} passes?`)) return;
    try {
      // 1. Update status
      await updateDoc(doc(db!, "preRegistrations", pr.id), { status: "paid" });

      // 2. Generate passes
      const activeEvent = events.find(e => e.id === pr.eventId);
      const eventName = activeEvent?.name || "Event";
      
      const passPromises = [];
      const couponData = {
        eventId: pr.eventId,
        holderName: pr.name + " (Pre-Registered Family)",
        status: "issued",
        source: "guest",
        notes: "Pre-Registered",
        foodOrders: [{
            item: "Entry Pass",
            quantity: pr.quantity,
            claimed: 0
        }]
      };

      const p = addDoc(collection(db!, "coupons"), couponData).then(ref => ({
        id: ref.id,
        label: pr.name + " (Family Pass)",
        url: `${window.location.origin}/pass/${ref.id}`
      }));
      passPromises.push(p);

      const generatedPasses = await Promise.all(passPromises);

      // 3. Send WhatsApp
      if (pr.phone.trim()) {
        fetch("/api/send-whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: pr.phone.trim(), name: pr.name.trim(), passes: generatedPasses, eventName })
        }).catch(console.error);
      }

      toast.success(`Generated ${generatedPasses.length} passes and sent WhatsApp!`);
      loadPreRegistrations();
    } catch (e) {
       toast.error("Failed to process payment");
    }
  };

  if (!roleData || roleData.role !== "admin") {
    return <div className="p-4 text-center text-zinc-500 min-h-screen flex items-center justify-center">Access Denied.</div>;
  }

  return (
    <div className="bg-zinc-50 min-h-screen pb-20">
      <MobileTopNav title="BhogPass Admin" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-zinc-200/50 p-1">
            <TabsTrigger value="events" className="rounded-md">Events & Scans</TabsTrigger>
            <TabsTrigger value="members" className="rounded-md">Members Directory</TabsTrigger>
            <TabsTrigger value="prereg" className="rounded-md">Pre-Registrations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="events" className="space-y-6">
            <Card className="border-0 shadow-sm ring-1 ring-zinc-200 overflow-hidden rounded-2xl">
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 w-full"></div>
              <CardHeader className="pt-6 sm:px-8">
                <CardTitle className="text-xl">Create Active Event</CardTitle>
                <CardDescription>
                  Initiating an event will instantly map the entire database and generate singular QR passes per familial individual.
                </CardDescription>
              </CardHeader>
              <CardContent className="sm:px-8 pb-8">
                <form onSubmit={handleCreateEvent} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="eventName" className="font-semibold text-zinc-700">Event Name</Label>
                    <Input 
                      id="eventName" 
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      placeholder="e.g. Navratri Mahotsav"
                      required
                      className="bg-zinc-50/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="eventDate" className="font-semibold text-zinc-700">Date</Label>
                      <Input 
                        id="eventDate" 
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        required
                        className="bg-zinc-50/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eventTime" className="font-semibold text-zinc-700">Time <span className="font-normal text-zinc-400">(Opt)</span></Label>
                      <Input 
                        id="eventTime" 
                        type="time"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        className="bg-zinc-50/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="eventNotes" className="font-semibold text-zinc-700">Message / Rules <span className="font-normal text-zinc-400">(Opt)</span></Label>
                    <Textarea 
                      id="eventNotes" 
                      value={eventNotes}
                      onChange={(e) => setEventNotes(e.target.value)}
                      placeholder="Show designated QR at gate to enter."
                      rows={2}
                      className="bg-zinc-50/50 resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="eventFoodMenu" className="font-semibold text-zinc-700">Food Menu / Categories <span className="font-normal text-zinc-400">(Opt)</span></Label>
                    <Input 
                      id="eventFoodMenu" 
                      value={eventFoodMenu}
                      onChange={(e) => setEventFoodMenu(e.target.value)}
                      placeholder="e.g. Veg Thali, Jain Thali, VIP Meal"
                      className="bg-zinc-50/50"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-md rounded-xl" disabled={isCreatingEvent}>
                    {isCreatingEvent ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                    Ignite Event Engine
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <div className="space-y-4 pt-4">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 px-1">Active Events</h2>
              {events.length === 0 ? (
                 <div className="p-8 text-center bg-white border border-dashed border-zinc-200 rounded-2xl text-zinc-500 font-medium">
                   No active events found.
                 </div>
              ) : (
                 <div className="grid grid-cols-1 gap-4">
                   {events.map((evt) => {
                     const stats = eventStats[evt.id] || { issued: 0, scanned: 0 };
                     return (
                      <Card key={evt.id} className="relative overflow-hidden group shadow-sm border-0 ring-1 ring-zinc-200 rounded-2xl">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                        <CardHeader className="pl-6 pb-2 pt-5">
                          <CardTitle className="flex items-start justify-between text-lg">
                             <span className="leading-tight">{evt.name}</span>
                             {evt.isActive && <span className="shrink-0 ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest bg-emerald-100 text-emerald-800">Active</span>}
                          </CardTitle>
                          <div className="flex flex-col mt-3 space-y-1.5">
                            <span className="flex items-center text-sm text-zinc-600 font-medium">
                              <Calendar className="w-4 h-4 mr-2 text-indigo-500" /> {evt.date}
                            </span>
                            {evt.notes && <span className="text-xs text-zinc-500 mt-1 line-clamp-2">📝 {evt.notes}</span>}
                          </div>
                        </CardHeader>
                        
                        <div className="px-6 py-3 bg-zinc-50/50 border-t border-zinc-100 flex justify-between items-center text-sm">
                           <div className="flex flex-col">
                              <span className="text-zinc-500 font-medium text-xs uppercase tracking-wider">Issued</span>
                              <span className="font-mono font-bold text-lg">{stats.issued}</span>
                           </div>
                           <div className="flex flex-col text-right">
                              <span className="text-zinc-500 font-medium text-xs uppercase tracking-wider">Scanned</span>
                              <span className="font-mono font-bold text-lg text-emerald-600">{stats.scanned}</span>
                           </div>
                        </div>

                        <CardContent className="px-6 pt-3 pb-5 flex flex-col sm:flex-row gap-3">
                          <Button variant="secondary" size="sm" onClick={() => setSelectedEventId(evt.id)} className="w-full sm:w-1/2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold shadow-none border border-zinc-200">
                            <Users className="w-4 h-4 mr-2 text-zinc-500" /> View Live Feed
                          </Button>
                          <div className="w-full sm:w-1/2 relative">
                            <Button variant="outline" size="sm" className="w-full rounded-lg text-emerald-700 border-emerald-200 hover:bg-emerald-50 bg-white" disabled={isUploadingFood === evt.id} onClick={() => {
                               // A small hack: we attach the current eventId to a data attribute on the ref so the onChange handler knows which event to use
                               if (foodFileInputRef.current) {
                                  foodFileInputRef.current.dataset.eventId = evt.id;
                                  foodFileInputRef.current.click();
                               }
                            }}>
                              {isUploadingFood === evt.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} Food CSV
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                     );
                   })}
                   <input 
                     type="file" 
                     accept=".csv,.xlsx" 
                     className="hidden" 
                     ref={foodFileInputRef} 
                     onChange={(e) => {
                       if (foodFileInputRef.current?.dataset.eventId) {
                          handleFoodBulkUpload(e, foodFileInputRef.current.dataset.eventId);
                       }
                     }} 
                   />
                 </div>
              )}

              {selectedEventId && (
                <Card className="mt-8 border-0 shadow-md ring-1 ring-zinc-200 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-zinc-100/50 border-b border-zinc-100 pb-4 pt-6">
                    <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-3">
                      <div>
                        <CardTitle className="text-lg">Live Scanner Feed</CardTitle>
                        <CardDescription>Instantaneous updates from the gate.</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={exportAttendees} className="bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-sm shrink-0">
                        <DownloadCloud className="w-4 h-4 mr-2 text-indigo-500" /> Export Event Report
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                    {loadingAttendees ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                      </div>
                    ) : attendees.length === 0 ? (
                      <div className="text-center py-12 text-zinc-500 font-medium">Nobody has arrived yet.</div>
                    ) : (
                      <div className="divide-y divide-zinc-100">
                        {attendees.map((attendee) => {
                          const isRecent = attendee.scannedAt && (new Date().getTime() - new Date(attendee.scannedAt).getTime() < 120000);
                          return (
                          <div key={attendee.id} className={`p-4 sm:px-6 flex items-start sm:items-center justify-between transition-colors ${isRecent ? 'bg-emerald-50 hover:bg-emerald-100/80' : 'hover:bg-zinc-50'}`}>
                            <div className="flex flex-col">
                              <p className="font-bold text-zinc-900 flex items-center gap-2">
                                {attendee.holderName}
                                {isRecent && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>}
                              </p>
                              <div className="flex items-center mt-1 space-x-2">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${isRecent ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                                   {attendee.source}
                                </span>
                                <span className="text-xs font-medium text-zinc-500">
                                  {new Date(attendee.scannedAt || "").toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                            </div>
                            {attendee.notes && (
                              <div className="text-xs font-medium text-zinc-500 max-w-[140px] sm:max-w-[200px] text-right bg-white p-2 rounded-lg border border-zinc-200 shadow-sm">
                                {attendee.notes}
                              </div>
                            )}
                          </div>
                        )})}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="members" className="space-y-6">
            
            {/* Bulk Upload Section */}
            <Card className="border-0 shadow-sm ring-1 ring-emerald-200 overflow-hidden rounded-2xl bg-emerald-50/30">
               <CardHeader className="pt-5 pb-2">
                  <CardTitle className="text-emerald-900 text-lg flex items-center">
                    <FileSpreadsheet className="w-5 h-5 mr-2" /> Bulk Member Operations
                  </CardTitle>
               </CardHeader>
               <CardContent className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" className="bg-white border-emerald-200 text-emerald-800 flex-1 hover:bg-emerald-50" onClick={downloadSampleExcel}>
                     <Download className="w-4 h-4 mr-2" /> Download Template
                  </Button>
                  <div className="flex-1">
                     <Button type="button" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
                        {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} 
                        {isUploading ? "Uploading..." : "Import Excel"}
                     </Button>
                     <input 
                       type="file" 
                       accept=".xlsx" 
                       className="hidden" 
                       ref={fileInputRef} 
                       onChange={handleBulkUpload} 
                     />
                  </div>
               </CardContent>
            </Card>

            <Card className="border-0 shadow-sm ring-1 ring-zinc-200 overflow-hidden rounded-2xl">
              <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 h-2 w-full"></div>
              <CardHeader className="pt-6 sm:px-8">
                <CardTitle className="text-xl">Register Single Identity</CardTitle>
                <CardDescription>
                  Manually provision a community family block.
                </CardDescription>
              </CardHeader>
              <CardContent className="sm:px-8 pb-8">
                <form onSubmit={handleAddMember} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="membershipType" className="font-semibold text-zinc-700">Membership Type</Label>
                      <Select value={membershipType} onValueChange={(v) => v && setMembershipType(v as "Life Member" | "Associate Member" | "Annual Member")}>
                        <SelectTrigger className="bg-zinc-50/50">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="Life Member">Life Member</SelectItem>
                          <SelectItem value="Associate Member">Associate Member</SelectItem>
                          <SelectItem value="Annual Member">Annual Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="membershipId" className="font-semibold text-zinc-700">Membership ID</Label>
                      <Input 
                        id="membershipId" 
                        value={membershipId}
                        onChange={(e) => setMembershipId(e.target.value)}
                        placeholder="LM-1002"
                        required
                        className="bg-zinc-50/50 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="primaryName" className="font-semibold text-zinc-700">Primary Name</Label>
                       <Input 
                         id="primaryName" 
                         value={primaryName}
                         onChange={(e) => setPrimaryName(e.target.value)}
                         placeholder="Rahul Sharma"
                         required
                         className="bg-zinc-50/50"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="spouseName" className="font-semibold text-zinc-700">Spouse Name <span className="font-normal text-zinc-400">(Opt)</span></Label>
                       <Input 
                         id="spouseName" 
                         value={spouseName}
                         onChange={(e) => setSpouseName(e.target.value)}
                         placeholder="Priya Sharma"
                         className="bg-zinc-50/50"
                       />
                     </div>
                  </div>

                  <div className="space-y-3 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                     <div className="space-y-2">
                       <Label htmlFor="childrenCount" className="font-semibold text-zinc-700">Number of Children</Label>
                       <Input 
                         id="childrenCount" 
                         type="number"
                         min="0"
                         max="10"
                         value={childrenCount.toString()}
                         onChange={handleChildrenCountChange}
                         className="bg-white max-w-[120px]"
                       />
                     </div>
                     
                     {childrenCount > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                           {childrenNames.map((name, index) => (
                             <div key={index} className="space-y-1">
                               <Label className="text-xs text-zinc-500 font-medium">Child {index + 1} Name <span className="font-normal text-zinc-400">(Opt)</span></Label>
                               <Input 
                                 value={name}
                                 onChange={(e) => handleChildNameChange(index, e.target.value)}
                                 placeholder={`Child ${index + 1}`}
                                 className="bg-white text-sm h-9"
                               />
                             </div>
                           ))}
                        </div>
                     )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="memberWhatsapp" className="font-semibold text-zinc-700">WhatsApp No.</Label>
                        <Input 
                          id="memberWhatsapp" 
                          value={memberWhatsapp}
                          onChange={(e) => setMemberWhatsapp(e.target.value)}
                          placeholder="+91 9876543210"
                          required
                          className="bg-zinc-50/50"
                        />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="memberEmail" className="font-semibold text-zinc-700">Email Address</Label>
                        <Input 
                          id="memberEmail" 
                          type="email"
                          value={memberEmail}
                          onChange={(e) => setMemberEmail(e.target.value)}
                          placeholder="rahul@example.com"
                          required
                          className="bg-zinc-50/50"
                        />
                     </div>
                  </div>

                  <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800 h-12 text-md rounded-xl mt-4" disabled={isAddingMember}>
                    {isAddingMember ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                    Lock Identity Block
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4 pt-4">
               <h2 className="text-xl font-bold tracking-tight text-zinc-900 px-1">Registered Members</h2>
               {members.length === 0 ? (
                 <div className="p-8 text-center bg-white border border-dashed border-zinc-200 rounded-2xl text-zinc-500 font-medium">
                   Directory is bare.
                 </div>
              ) : (
                 <MemberTable data={members} onRefresh={loadMembers} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="prereg" className="space-y-6">
            <Card className="border-0 shadow-sm ring-1 ring-zinc-200 overflow-hidden rounded-2xl">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 w-full"></div>
              <CardHeader className="pt-6 sm:px-8">
                <CardTitle className="text-xl">Add Pending Pre-Registration</CardTitle>
                <CardDescription>
                  Register someone who hasn't paid yet. Passes will NOT be generated until marked paid.
                </CardDescription>
              </CardHeader>
              <CardContent className="sm:px-8 pb-8">
                <form onSubmit={handleAddPreRegistration} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label className="font-semibold text-zinc-700">Event</Label>
                       <Select value={preRegEventId} onValueChange={(v) => setPreRegEventId(v || "")}>
                         <SelectTrigger className="bg-zinc-50/50">
                           <SelectValue placeholder="Select Event" />
                         </SelectTrigger>
                         <SelectContent>
                           {events.map(e => (
                             <SelectItem key={e.id} value={e.id}>{e.name} ({e.date})</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                     <div className="space-y-2">
                       <Label className="font-semibold text-zinc-700">Guest Name</Label>
                       <Input 
                         value={preRegName}
                         onChange={(e) => setPreRegName(e.target.value)}
                         placeholder="e.g. Anil Kumar"
                         required
                         className="bg-zinc-50/50"
                       />
                     </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label className="font-semibold text-zinc-700">WhatsApp No.</Label>
                       <Input 
                         value={preRegPhone}
                         onChange={(e) => setPreRegPhone(e.target.value)}
                         placeholder="919876543210"
                         required
                         className="bg-zinc-50/50"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label className="font-semibold text-zinc-700">Passes Required</Label>
                       <Input 
                         type="number"
                         min="1"
                         max="20"
                         value={preRegQuantity.toString()}
                         onChange={(e) => setPreRegQuantity(parseInt(e.target.value) || 1)}
                         className="bg-zinc-50/50"
                       />
                     </div>
                  </div>
                  <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 h-12 text-md rounded-xl" disabled={isAddingPreReg || !preRegEventId}>
                    {isAddingPreReg ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                    Add as Pending
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4 pt-4">
               <h2 className="text-xl font-bold tracking-tight text-zinc-900 px-1">Pending Pre-Registrations</h2>
               {preRegistrations.filter(p => p.status === 'pending').length === 0 ? (
                 <div className="p-8 text-center bg-white border border-dashed border-zinc-200 rounded-2xl text-zinc-500 font-medium">
                   No pending registrations.
                 </div>
               ) : (
                 <div className="grid gap-3">
                   {preRegistrations.filter(p => p.status === 'pending').map(pr => {
                     const evt = events.find(e => e.id === pr.eventId);
                     return (
                       <div key={pr.id} className="p-4 bg-white border border-zinc-200 rounded-xl flex items-center justify-between shadow-sm">
                         <div>
                           <h3 className="font-bold text-zinc-900">{pr.name} <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full ml-2">Pending</span></h3>
                           <p className="text-sm text-zinc-500 mt-1">{pr.quantity} Passes • {evt?.name}</p>
                           <p className="text-xs text-zinc-400 mt-0.5">{pr.phone}</p>
                         </div>
                         <Button onClick={() => handleMarkPaid(pr)} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                           Mark Paid & Send QRs
                         </Button>
                       </div>
                     );
                   })}
                 </div>
               )}
            </div>

            <div className="space-y-4 pt-4">
               <h2 className="text-xl font-bold tracking-tight text-zinc-900 px-1">Paid Pre-Registrations</h2>
               {preRegistrations.filter(p => p.status === 'paid').length === 0 ? (
                 <div className="p-8 text-center bg-white border border-dashed border-zinc-200 rounded-2xl text-zinc-500 font-medium">
                   No paid registrations yet.
                 </div>
               ) : (
                 <div className="grid gap-3">
                   {preRegistrations.filter(p => p.status === 'paid').map(pr => {
                     const evt = events.find(e => e.id === pr.eventId);
                     return (
                       <div key={pr.id} className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between shadow-sm">
                         <div>
                           <h3 className="font-bold text-zinc-900">{pr.name} <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full ml-2">Paid & QRs Sent</span></h3>
                           <p className="text-sm text-zinc-500 mt-1">{pr.quantity} Passes • {evt?.name}</p>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
