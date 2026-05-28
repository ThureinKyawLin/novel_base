"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  BookMarked,
  Tags,
  Users,
  Mail,
  ScrollText,
  Inbox,
  PanelLeftClose,
  PanelLeftOpen,
  ExternalLink,
} from "lucide-react";
import { Logo } from "@/components/logo";

const allLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "mod"] },
  { href: "/admin/novels", label: "Novels", icon: BookMarked, roles: ["admin", "mod"] },
  { href: "/admin/submissions", label: "Submissions", icon: Inbox, roles: ["admin", "mod"] },
  { href: "/admin/genres", label: "Genres", icon: Tags, roles: ["admin", "mod"] },
  { href: "/admin/mods", label: "Moderators", icon: Users, roles: ["admin"] },
  { href: "/admin/invitations", label: "Invitations", icon: Mail, roles: ["admin"] },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText, roles: ["admin"] },
];

export function AdminSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const links = allLinks.filter((link) => link.roles.includes(role));

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center border-b px-3 justify-between">
        {!collapsed ? (
          <Link href="/admin">
            <Logo size={24} />
          </Link>
        ) : (
          <Link href="/admin">
            <Logo size={24} showText={false} />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(collapsed && "mx-auto")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>
      <nav className={cn("flex-1 space-y-1", collapsed ? "p-2" : "p-4")}>
        {links.map((link) => {
          const isActive =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              className={cn(
                "flex items-center rounded-md text-sm font-medium transition-colors",
                collapsed
                  ? "justify-center p-2"
                  : "gap-3 px-3 py-2",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <link.icon className="h-4 w-4 shrink-0" />
              {!collapsed && link.label}
            </Link>
          );
        })}
      </nav>
      <div className={cn("border-t", collapsed ? "p-2" : "p-4")}>
        <Link
          href="/"
          title={collapsed ? "View Public Site" : undefined}
          className={cn(
            "flex items-center rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            collapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
          )}
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          {!collapsed && "View Public Site"}
        </Link>
      </div>
    </aside>
  );
}

/** Mobile sidebar rendered as a Sheet overlay */
export function MobileSidebar({
  role,
  open,
  onOpenChange,
}: {
  role: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const links = allLinks.filter((link) => link.roles.includes(role));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4 h-14 flex items-center">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Logo size={24} />
        </SheetHeader>
        <nav className="flex-1 space-y-1 p-4">
          {links.map((link) => {
            const isActive =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4">
          <Link
            href="/"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            View Public Site
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
