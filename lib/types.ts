export interface User {
  uid: string;
  email: string;
  name?: string;
  role: "admin" | "receptionist" | "accountant";
}

export interface Member {
  primaryName: string;
  membershipId: string;
  membershipType: "Life Member" | "Associate Member" | "Annual Member";
  whatsapp: string;
  email: string;
  familyCount: number;
  spouseName?: string;
  childrenNames?: string[];
}

export interface Event {
  name: string;
  date: string; // Will store the date+time in ISO format or string
  hasTime?: boolean; // Track if the timer was used
  notes?: string; // Optional notes
  isActive: boolean;
  createdBy: string;
}

export interface Coupon {
  eventId: string;
  memberId?: string;
  holderName: string;
  notes?: string; // Optional notes
  status: "issued" | "scanned";
  scannedAt?: string; // ISO string representing date
  scannedBy?: string;
  source: "member" | "guest";
}

export interface Payment {
  amount: number;
  trustAccount: "Trust" | "SMCA";
  mode: "Cash" | "Card" | "Online";
  memberName: string;
  collectorUid: string;
  timestamp: string;
}
