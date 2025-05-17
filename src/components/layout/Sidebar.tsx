import { Calendar, CheckSquare, Users, BookOpen, Home, Settings, LogOut, Menu } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AppSidebar() {
  const { user, signOut } = useSupabaseAuth();
  const { state, isMobile } = useSidebar();
  const [profileData, setProfileData] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
          
        if (!error && data) {
          setProfileData(data);
        }
      }
    };
    
    fetchProfile();
  }, [user]);

  const isAdmin = profileData?.role === "admin";
  const isCoordinator = profileData?.role === "coordinator";
  const isTeacher = profileData?.role === "teacher";

  const showUsersMenu = isAdmin || isCoordinator;
  const showSubjectsMenu = isAdmin || isCoordinator;
  const showClassesMenu = isAdmin || isCoordinator || isTeacher;

  if (!user) {
    return null;
  }

  // Mobile sidebar will use a Sheet component
  if (isMobile) {
    return (
      <>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="icon"
              className="absolute left-4 top-4 z-50 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 bg-sidebar text-sidebar-foreground">
            <SidebarContent className="mt-16">
              <SidebarHeader>
                <div className="flex items-center justify-center mt-3 pl-16">
                  <h2 className="text-lg font-bold text-sidebar-foreground">MarKae</h2>
                </div>
              </SidebarHeader>
              <div className="space-y-1 py-2">
                <NavItem icon={Home} to="/dashboard" onNavigate={() => setIsOpen(false)}>
                  Dashboard
                </NavItem>
                
                <NavItem icon={CheckSquare} to="/attendance" onNavigate={() => setIsOpen(false)}>
                  Presenças
                </NavItem>
                
                {showClassesMenu && (
                  <NavItem icon={Calendar} to="/classes" onNavigate={() => setIsOpen(false)}>
                    Aulas
                  </NavItem>
                )}

                {showSubjectsMenu && (
                  <NavItem icon={BookOpen} to="/subjects" onNavigate={() => setIsOpen(false)}>
                    Matérias
                  </NavItem>
                )}
                
                {showUsersMenu && (
                  <NavItem icon={Users} to="/users" onNavigate={() => setIsOpen(false)}>
                    Usuários
                  </NavItem>
                )}

                {isAdmin && (
                  <>
                    <Separator className="my-2 bg-sidebar-border" />
                    <NavItem icon={Settings} to="/settings" onNavigate={() => setIsOpen(false)}>
                      Configurações
                    </NavItem>
                  </>
                )}
              </div>
            </SidebarContent>

            <SidebarFooter>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Sair</span>
              </Button>
            </SidebarFooter>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop sidebar
  return (
    <Sidebar className="fixed left-0 top-0">
      <SidebarHeader>
        <div className="flex items-center justify-center mt-3">
          <h2 className="text-lg font-bold text-sidebar-foreground">MarKae</h2>
        </div>
      </SidebarHeader>

      <SidebarTrigger className="absolute right-[-12px] top-9" />

      <SidebarContent>
        <div className="space-y-1 py-2">
          <NavItem icon={Home} to="/dashboard">
            Dashboard
          </NavItem>
          
          <NavItem icon={CheckSquare} to="/attendance">
            Presenças
          </NavItem>
          
          {showClassesMenu && (
            <NavItem icon={Calendar} to="/classes">
              Aulas
            </NavItem>
          )}

          {showSubjectsMenu && (
            <NavItem icon={BookOpen} to="/subjects">
              Matérias
            </NavItem>
          )}
          
          {showUsersMenu && (
            <NavItem icon={Users} to="/users">
              Usuários
            </NavItem>
          )}

          {isAdmin && (
            <>
              <Separator className="my-2 bg-sidebar-border" />
              <NavItem icon={Settings} to="/settings">
                Configurações
              </NavItem>
            </>
          )}
        </div>
      </SidebarContent>

      <SidebarFooter>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => signOut()}>
          <LogOut className="h-4 w-4 mr-2" />
          <span>Sair</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

type NavItemProps = {
  icon: React.ElementType;
  to: string;
  children: React.ReactNode;
  onNavigate?: () => void;
};

function NavItem({ icon: Icon, to, children, onNavigate }: NavItemProps) {
  const navigate = useNavigate();
  
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="w-full justify-start" 
      onClick={() => {
        navigate(to);
        onNavigate?.();
      }}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span>{children}</span>
      </div>
    </Button>
  );
}
