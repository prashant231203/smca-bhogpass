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
  id?: string;
  name: string;
  date: string;
  isActive: boolean;
  createdBy: string;
  createdAt?: string;
  foodMenu?: string[];
  hasTime?: boolean;
  notes?: string;
}

export interface PreRegistration {
  id?: string;
  name: string;
  phone: string;
  quantity: number;
  eventId: string;
  status: "pending" | "paid";
  createdAt: string;
}

export interface FoodOrder {
  item: string;
  quantity: number;
  claimed: number;
}

export interface Coupon {
  eventId: string;
  memberId?: string;
  holderName: string;
  notes?: string;
  phone?: string;
  email?: string;
  
  // New Consolidated Food Array
  foodOrders?: FoodOrder[];
  
  // Legacy fields (optional if keeping for backwards compatibility, but better to remove or just mark optional)
  foodItem?: string; 
  foodClaimed?: boolean; 
  foodClaimedAt?: string;
  foodClaimedBy?: string;
  
  status: "issued" | "scanned";
  scannedAt?: string;
  scannedBy?: string;
  source: "member" | "guest";
}

export interface Payment {
  amount: number;
  trustAccount: "Trust" | "SMCA";
  mode: "Cash" | "Card" | "Online";
  memberName: string;
  email?: string;
  phone?: string;
  purpose?: string;
  collectorUid: string;
  timestamp: string;
}
