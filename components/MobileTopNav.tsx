"use client";

import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { auth } from "@/lib/firebase";

export function MobileTopNav({ title }: { title: string }) {
  const { user, roleData } = useAuth();
  
  return (
    <div className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-zinc-200 shadow-sm">
      <div className="flex h-16 items-center px-4 md:px-6 max-w-7xl mx-auto justify-between">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold tracking-tight text-zinc-900">{title}</h1>
          <p className="text-[10px] uppercase font-bold tracking-wider text-indigo-600">
             {roleData?.role || "View Only"}
          </p>
        </div>
        
        {user && (
          <Button variant="ghost" size="icon" onClick={() => auth.signOut()} className="rounded-full bg-zinc-100 hover:bg-zinc-200">
             <LogOut className="w-4 h-4 text-zinc-600" />
          </Button>
        )}
      </div>
    </div>
  );
}
