import { createClient } from "@/lib/supabase/server";
import { SubmissionsTable } from "./submissions-table";
import type { Submission, Genre } from "@/lib/types";

export default async function AdminSubmissionsPage() {
  const supabase = await createClient();

  const [{ data: submissions }, { data: genres }] = await Promise.all([
    supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("genres").select("*").order("name"),
  ]);

  const pendingCount =
    submissions?.filter((s) => s.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Submissions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingCount > 0
              ? `${pendingCount} pending review`
              : "No pending submissions"}
          </p>
        </div>
      </div>

      <SubmissionsTable
        submissions={(submissions ?? []) as Submission[]}
        genres={(genres ?? []) as Genre[]}
      />
    </div>
  );
}
