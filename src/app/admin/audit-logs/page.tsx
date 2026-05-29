import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminAuditLogsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/admin");

  const logsRaw = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      userProfile: { select: { displayName: true, email: true } },
    },
  });

  const logs = logsRaw.map((log) => ({
    id: log.id,
    action: log.action,
    entity_type: log.entityType,
    entity_id: log.entityId,
    details: log.details as Record<string, unknown>,
    created_at: log.createdAt.toISOString(),
    user_profile: log.userProfile
      ? { display_name: log.userProfile.displayName, email: log.userProfile.email }
      : null,
  }));

  const actionColors: Record<string, string> = {
    create: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    update: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs && logs.length > 0 ? (
              logs.map((log) => {
                const userProfile = log.user_profile as {
                  display_name: string;
                  email: string;
                } | null;
                const details = log.details as Record<string, unknown>;
                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={actionColors[log.action] || ""}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {log.entity_type}
                    </TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate">
                      {details?.title_en
                        ? String(details.title_en)
                        : log.entity_id?.slice(0, 8) ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {userProfile?.display_name || userProfile?.email || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No audit logs yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
