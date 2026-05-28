"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Menu } from "lucide-react";
import type { Profile } from "@/lib/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileSidebar } from "@/components/admin/sidebar";

export function AdminHeader({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = (profile.display_name || profile.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="md:hidden font-semibold">NovelBase</div>
      <div className="flex-1" />
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" className="flex items-center gap-2" />}>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm">
              {profile.display_name || profile.email}
            </span>
            <Badge variant="secondary" className="text-xs capitalize">
              {profile.role}
            </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="text-sm font-medium">
                {profile.display_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {profile.email}
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
    <MobileSidebar
      role={profile.role}
      open={mobileOpen}
      onOpenChange={setMobileOpen}
    />
    </>
  );
}
