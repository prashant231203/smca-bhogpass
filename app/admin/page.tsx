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
import { collection, addDoc, getDocs, query, where, onSnapshot } from "firebase/firestore";
import { Loader2, Plus, Calendar, Users, Mail, Phone, Users2, Download, Upload, FileSpreadsheet } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Event, Coupon, Member } from "@/lib/types";
import * as xlsx from "xlsx";
import { MemberTable } from "@/components/MemberTable";

export default function AdminPage() {
  const { user, roleData } = useAuth();
  
  // Event State
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventNotes, setEventNotes] = useState("");
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

  useEffect(() => {
    loadEvents();
    loadMembers();

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
       // Sort by date newest first
       setEvents(evts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
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
        ...(eventNotes && { notes: eventNotes })
      };
      
      const docRef = await addDoc(collection(db!, "events"), newEvent);
      const newEventId = docRef.id;
      toast.info("Event active! Generating designated QR passes...");
      
      const membersSnap = await getDocs(collection(db!, "members"));
      let passCount = 0;
      let emailCount = 0;

      for (const memberDoc of membersSnap.docs) {
         const member = memberDoc.data() as Member;
         
         const passesToIssue: string[] = [];
         
         if (member.primaryName) passesToIssue.push(member.primaryName + " (Primary)");
         if (member.spouseName) passesToIssue.push(member.spouseName + " (Spouse)");
         
         if (member.childrenNames && Array.isArray(member.childrenNames)) {
           member.childrenNames.forEach((childName, idx) => {
             passesToIssue.push((childName || `Child ${idx + 1}`) + " (Child)");
           });
         } else {
            // Backup in case data doesn't have exact names but has a count
            const spouses = member.spouseName ? 1 : 0;
            const cCount = member.familyCount > (1 + spouses) ? member.familyCount - (1 + spouses) : 0;
            for(let i = 0; i < cCount; i++) passesToIssue.push(`Child ${i+1}`);
         }

         const passPromises = [];

         for (const passHolder of passesToIssue) {
           const couponData = {
              eventId: newEventId,
              memberId: memberDoc.id,
              holderName: passHolder,
              status: "issued",
              source: "member",
           };

           const p = addDoc(collection(db!, "coupons"), couponData).then(ref => ({
             id: ref.id,
             label: passHolder,
             url: `${window.location.origin}/pass/${ref.id}`
           }));
           passPromises.push(p);
         }

         const generatedPasses = await Promise.all(passPromises);
         passCount += generatedPasses.length;

         if (member.email) {
            try {
              const res = await fetch("/api/send-pass", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                  email: member.email, 
                  name: member.primaryName, 
                  passes: generatedPasses, 
                  eventName: newEvent.name 
                })
              });
              const resData = await res.json();
              if (resData.success) {
                emailCount++;
              }
            } catch (err) {
               console.error("Failed to email pass to", member.email, err);
            }
         }
         
         if (member.whatsapp) {
            try {
              const res = await fetch("/api/send-whatsapp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                  phone: member.whatsapp, 
                  name: member.primaryName, 
                  passes: generatedPasses, 
                  eventName: newEvent.name 
                })
              });
              await res.json();
            } catch (err) {
               console.error("Failed to send whatsapp pass to", member.whatsapp, err);
            }
         }
      }
      
      toast.success(`Generated ${passCount} unique passes and sent ${emailCount} emails successfully!`);

      setEventName("");
      setEventDate("");
      setEventTime("");
      setEventNotes("");
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

  if (!roleData || roleData.role !== "admin") {
    return <div className="p-4 text-center text-zinc-500 min-h-screen flex items-center justify-center">Access Denied.</div>;
  }

  return (
    <div className="bg-zinc-50 min-h-screen pb-20">
      <MobileTopNav title="BhogPass Admin" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-zinc-200/50 p-1">
            <TabsTrigger value="events" className="rounded-md">Events & Scans</TabsTrigger>
            <TabsTrigger value="members" className="rounded-md">Members Directory</TabsTrigger>
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

                        <CardContent className="pl-6 pt-3 pb-5">
                          <Button variant="secondary" size="sm" onClick={() => setSelectedEventId(evt.id)} className="w-full rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold shadow-none border border-zinc-200">
                            <Users className="w-4 h-4 mr-2 text-zinc-500" /> View Live Feed
                          </Button>
                        </CardContent>
                      </Card>
                     );
                   })}
                 </div>
              )}

              {selectedEventId && (
                <Card className="mt-8 border-0 shadow-md ring-1 ring-zinc-200 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-zinc-100/50 border-b border-zinc-100 pb-4 pt-6">
                    <CardTitle className="text-lg">Live Scanner Feed</CardTitle>
                    <CardDescription>Instantaneous updates from the gate.</CardDescription>
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
                        {attendees.map((attendee) => (
                          <div key={attendee.id} className="p-4 sm:px-6 flex items-start sm:items-center justify-between hover:bg-zinc-50 transition-colors">
                            <div className="flex flex-col">
                              <p className="font-bold text-zinc-900">{attendee.holderName}</p>
                              <div className="flex items-center mt-1 space-x-2">
                                <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-zinc-100 text-zinc-600 border border-zinc-200">
                                   {attendee.source}
                                </span>
                                <span className="text-xs font-medium text-zinc-400">
                                  {new Date(attendee.scannedAt || "").toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                            </div>
                            {attendee.notes && (
                              <div className="text-xs font-medium text-zinc-500 max-w-[140px] sm:max-w-[200px] text-right bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                                {attendee.notes}
                              </div>
                            )}
                          </div>
                        ))}
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
        </Tabs>
      </div>
    </div>
  );
}
