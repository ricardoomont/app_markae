
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useEffect } from "react";

// This component handles showing the show sidebar button when sidebar is collapsed
function SidebarShowButton() {
  const { state, toggleSidebar, isMobile } = useSidebar();
  
  // Only show on desktop when sidebar is collapsed
  if (isMobile || state !== "collapsed") return null;
  
  return (
    <Button 
      variant="outline" 
      size="icon" 
      className="fixed left-4 top-4 z-50"
      onClick={toggleSidebar}
    >
      <Menu className="h-5 w-5" />
      <span className="sr-only">Mostrar menu</span>
    </Button>
  );
}

// Main Layout wrapper with SidebarProvider
function LayoutWithSidebar() {
  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header />
        <main className="flex-1 p-6">
          <SidebarShowButton />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function Layout() {
  return (
    <SidebarProvider>
      <LayoutWithSidebar />
      <Toaster />
    </SidebarProvider>
  );
}
