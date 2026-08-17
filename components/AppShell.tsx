"use client";

import { useAuth } from "@/components/AuthProvider";
import { Button, buttonVariants } from "@/components/ui/button";
import { LogOut, Ticket, Settings, ShieldAlert, BadgeIndianRupee } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { roleData, logout } = useAuth();
  const pathname = usePathname();

  if (!roleData) return <>{children}</>;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* TOP NAVIGATION (Always visible, but links are hidden on mobile) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white px-4 sm:px-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-indigo-600" />
          <span className="font-semibold tracking-tight text-zinc-900 hidden sm:inline-block">SMCA BhogPass</span>
          <span className="font-semibold tracking-tight text-zinc-900 sm:hidden">BhogPass</span>
          <div className="ml-2 px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
            {roleData.role}
          </div>
        </div>
        
        {/* Top Nav Links (Hidden on Mobile) */}
        <nav className="hidden sm:flex items-center gap-2">
          {roleData.role === "admin" && (
            <Link 
              href="/admin" 
              className={buttonVariants({ variant: pathname.startsWith("/admin") ? "secondary" : "ghost", size: "sm" })}
            >
              <Settings className="w-4 h-4 mr-2" /> <span>Admin</span>
            </Link>
          )}
          {(roleData.role === "admin" || roleData.role === "receptionist") && (
            <Link 
              href="/scanner" 
              className={buttonVariants({ variant: pathname.startsWith("/scanner") ? "secondary" : "ghost", size: "sm" })}
            >
              <ShieldAlert className="w-4 h-4 mr-2" /> <span>Scanner</span>
            </Link>
          )}
          {(roleData.role === "admin" || roleData.role === "accountant") && (
            <Link 
              href="/accountant" 
              className={buttonVariants({ variant: pathname.startsWith("/accountant") ? "secondary" : "ghost", size: "sm" })}
            >
              <BadgeIndianRupee className="w-4 h-4 mr-2" /> <span>Accounts</span>
            </Link>
          )}
        </nav>
        
        {/* Logout Button (Visible on both) */}
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => logout()} title="Logout" className="ml-1 sm:ml-2">
            <LogOut className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </header>
      
      {/* MAIN CONTENT AREA */}
      {/* pb-20 on mobile ensures content doesn't get covered by the bottom nav */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 pb-24 sm:pb-8">
        {children}
      </main>

      {/* BOTTOM NAVIGATION (Only visible on Mobile) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {roleData.role === "admin" && (
            <Link 
              href="/admin" 
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 text-zinc-500 hover:text-zinc-900 transition-colors",
                pathname.startsWith("/admin") && "text-indigo-600"
              )}
            >
              <Settings className={cn("w-5 h-5", pathname.startsWith("/admin") && "text-indigo-600")} /> 
              <span className="text-[10px] font-medium tracking-wide">Admin</span>
            </Link>
          )}
          {(roleData.role === "admin" || roleData.role === "receptionist") && (
            <Link 
              href="/scanner" 
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 text-zinc-500 hover:text-zinc-900 transition-colors",
                pathname.startsWith("/scanner") && "text-indigo-600"
              )}
            >
              <ShieldAlert className={cn("w-5 h-5", pathname.startsWith("/scanner") && "text-indigo-600")} /> 
              <span className="text-[10px] font-medium tracking-wide">Scan</span>
            </Link>
          )}
          {(roleData.role === "admin" || roleData.role === "accountant") && (
            <Link 
              href="/accountant" 
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 text-zinc-500 hover:text-zinc-900 transition-colors",
                pathname.startsWith("/accountant") && "text-indigo-600"
              )}
            >
              <BadgeIndianRupee className={cn("w-5 h-5", pathname.startsWith("/accountant") && "text-indigo-600")} /> 
              <span className="text-[10px] font-medium tracking-wide">Accts</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
