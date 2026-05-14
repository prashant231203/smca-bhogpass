"use client";

import { useAuth } from "@/components/AuthProvider";
import { Button, buttonVariants } from "@/components/ui/button";
import { LogOut, Ticket, Settings, ShieldAlert, BadgeIndianRupee } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { roleData, logout } = useAuth();
  const pathname = usePathname();

  if (!roleData) return <>{children}</>;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white px-4 sm:px-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-indigo-600" />
          <span className="font-semibold tracking-tight text-zinc-900 hidden sm:inline-block">SMCA BhogPass</span>
          <span className="font-semibold tracking-tight text-zinc-900 sm:hidden">BhogPass</span>
          <div className="ml-2 px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
            {roleData.role}
          </div>
        </div>
        
        <nav className="flex items-center gap-1 sm:gap-2">
          {roleData.role === "admin" && (
            <Link 
              href="/admin" 
              className={buttonVariants({ variant: pathname.startsWith("/admin") ? "secondary" : "ghost", size: "sm" })}
            >
              <Settings className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          {(roleData.role === "admin" || roleData.role === "receptionist") && (
            <Link 
              href="/scanner" 
              className={buttonVariants({ variant: pathname.startsWith("/scanner") ? "secondary" : "ghost", size: "sm" })}
            >
              <ShieldAlert className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Scanner</span>
            </Link>
          )}
          {(roleData.role === "admin" || roleData.role === "accountant") && (
            <Link 
              href="/accountant" 
              className={buttonVariants({ variant: pathname.startsWith("/accountant") ? "secondary" : "ghost", size: "sm" })}
            >
              <BadgeIndianRupee className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Accounts</span>
            </Link>
          )}
          <Button variant="ghost" size="icon" onClick={() => logout()} title="Logout" className="ml-2">
            <LogOut className="w-4 h-4 text-red-500" />
          </Button>
        </nav>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
