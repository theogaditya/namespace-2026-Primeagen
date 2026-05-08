"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LogOut, 
  User, 
  FileText, 
  Plus, 
  Loader2,
  Home,
  Settings,
  Bell
} from "lucide-react";

interface UserData {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  preferredLanguage?: string;
  status?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("authToken");
      const storedUserData = localStorage.getItem("userData");

      if (!token) {
        router.push("/loginUser");
        return;
      }

      if (storedUserData) {
        try {
          setUserData(JSON.parse(storedUserData));
        } catch (e) {
          console.error("Error parsing user data:", e);
        }
      }
      setIsLoading(false);
    }
  }, [router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const token = localStorage.getItem("authToken");
      
      if (token) {
        // Call logout API to blacklist the token
        await fetch("http://localhost:3000/api/users/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local storage regardless of API response
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      
      // Redirect to login
      router.push("/loginUser");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Home className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">SwarajDesk</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5 text-gray-600" />
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="gap-2"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {userData?.name || "User"}!
          </h2>
          <p className="text-gray-500 mt-1">
            Here&apos;s an overview of your account and complaints.
          </p>
        </div>

        {/* User Info Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-md border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <User className="h-4 w-4" />
                Account Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-gray-900">{userData?.name}</p>
                <p className="text-sm text-gray-500">{userData?.email}</p>
                {userData?.phoneNumber && (
                  <p className="text-sm text-gray-500">{userData.phoneNumber}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                My Complaints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-blue-600">0</p>
                <p className="text-sm text-gray-500">Total complaints filed</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-0 bg-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-100 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Quick Action
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                variant="secondary" 
                className="w-full bg-white text-blue-600 hover:bg-blue-50"
              >
                File New Complaint
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Complaints Section */}
        <Card className="shadow-md border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Recent Complaints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No complaints yet
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                You haven&apos;t filed any complaints yet. Start by filing your first complaint to get help from the authorities.
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Plus className="h-4 w-4" />
                File Your First Complaint
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
