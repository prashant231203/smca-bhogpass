"use client";

import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Ticket, QrCode, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, roleData, loading, login, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && roleData) {
      if (roleData.role === "admin") router.push("/admin");
      else if (roleData.role === "receptionist") router.push("/scanner");
      else if (roleData.role === "accountant") router.push("/accountant");
    }
  }, [loading, roleData, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-indigo-600">
        <div className="flex flex-col items-center">
           <Ticket className="h-12 w-12 animate-pulse text-white mb-4" />
           <Loader2 className="h-6 w-6 animate-spin text-indigo-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center relative bg-indigo-600 p-4 overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-indigo-700 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-sm z-10 relative">
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-md rounded-3xl overflow-hidden">
          <div className="h-2 w-full bg-indigo-500"></div>
          <CardHeader className="text-center space-y-3 pt-10 pb-4">
            <div className="mx-auto bg-indigo-600 p-4 rounded-2xl w-20 h-20 flex items-center justify-center shadow-lg shadow-indigo-600/30 transform transition hover:scale-105">
              <Ticket className="text-white w-10 h-10 transform -rotate-12" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tight text-zinc-900">BhogPass</CardTitle>
            <CardDescription className="text-zinc-500 font-medium text-base">SMCA Event Gateway</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-10">
            {!user ? (
              <div className="space-y-4 mt-4">
                <Button onClick={login} className="w-full h-14 text-lg font-bold bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </Button>
              </div>
            ) : !roleData ? (
              <div className="text-center space-y-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                <p className="text-sm font-semibold text-orange-800">Pending Role Assignment</p>
                <p className="text-xs text-orange-600">Please contact the administrator to grant you access.</p>
                <Button variant="outline" onClick={logout} className="w-full mt-2 h-10 border-orange-200 text-orange-700 hover:bg-orange-100">
                  Sign out
                </Button>
              </div>
            ) : (
               <div className="flex flex-col items-center justify-center py-6">
                 <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
                 <span className="text-indigo-600 font-bold animate-pulse">Entering Gateway...</span>
               </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 pt-6">
              <div className="flex flex-col items-center p-3 text-center rounded-xl bg-zinc-50 border border-zinc-100">
                <QrCode className="w-6 h-6 text-indigo-500 mb-2" />
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Scanner</div>
                <div className="text-xs font-semibold text-zinc-700 mt-0.5">High Speed</div>
              </div>
              <div className="flex flex-col items-center p-3 text-center rounded-xl bg-zinc-50 border border-zinc-100">
                 <Building2 className="w-6 h-6 text-indigo-500 mb-2" />
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Accounts</div>
                <div className="text-xs font-semibold text-zinc-700 mt-0.5">Donations</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
