import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookMarked, Tags, Users, ScrollText } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [novels, genres, mods, recentLogs] = await Promise.all([
    supabase.from("novels").select("*", { count: "exact", head: true }),
    supabase.from("genres").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("audit_logs")
      .select("*, user_profile:profiles!audit_logs_user_id_fkey(display_name)")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const stats = [
    {
      title: "Total Novels",
      value: novels.count ?? 0,
      icon: BookMarked,
      color: "text-blue-500",
    },
    {
      title: "Genres",
      value: genres.count ?? 0,
      icon: Tags,
      color: "text-green-500",
    },
    {
      title: "Team Members",
      value: mods.count ?? 0,
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
          {recentLogs.data && recentLogs.data.length > 0 ? (
            <div className="space-y-3">
              {recentLogs.data.map((log) => (
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
