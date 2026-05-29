import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookMarked, Tags, Users, ScrollText } from "lucide-react";

export default async function AdminDashboard() {
  const [novelsCount, genresCount, modsCount, recentLogsRaw] = await Promise.all([
    prisma.novel.count(),
    prisma.genre.count(),
    prisma.profile.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        userProfile: { select: { displayName: true } },
      },
    }),
  ]);

  const recentLogs = recentLogsRaw.map((log) => ({
    id: log.id,
    action: log.action,
    entity_type: log.entityType,
    created_at: log.createdAt.toISOString(),
    user_profile: log.userProfile
      ? { display_name: log.userProfile.displayName }
      : null,
  }));

  const stats = [
    {
      title: "Total Novels",
      value: novelsCount,
      icon: BookMarked,
      color: "text-blue-500",
    },
    {
      title: "Genres",
      value: genresCount,
      icon: Tags,
      color: "text-green-500",
    },
    {
      title: "Team Members",
      value: modsCount,
      icon: Users,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
      {recentLogs.length > 0 ? (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        log.action === "create"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : log.action === "update"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="text-muted-foreground">
                      {(log.user_profile as { display_name: string } | null)
                        ?.display_name ?? "Unknown"}{" "}
                      {log.action}d a{" "}
                      <span className="font-medium text-foreground">
                        {log.entity_type}
                      </span>
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No recent activity
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
