import Link from "next/link";
import { BookOpen, Code } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const endpoints = [
  {
    method: "GET",
    path: "/api/v1/novels",
    description: "List all novels with pagination, search, and filtering",
    params: [
      { name: "page", type: "number", default: "1", desc: "Page number" },
      { name: "per_page", type: "number", default: "20", desc: "Results per page (max 100)" },
      { name: "q", type: "string", default: "", desc: "Search by title (EN/MM) or author" },
      { name: "genre", type: "uuid", default: "", desc: "Filter by genre ID" },
      { name: "status", type: "string", default: "", desc: "Filter by status: ongoing, completed, dropped" },
    ],
    response: `{
  "data": [
    {
      "id": "uuid",
      "title_en": "Against the Gods",
      "title_mm": "နတ်ဘုရားများကို ဆန့်ကျင်၍",
      "author_pen_name": "Mars Gravity",
      "synopsis": "...",
      "cover_image_url": "https://...",
      "fb_page_url": "https://facebook.com/...",
      "tg_username": "@example",
      "tg_group_url": "https://t.me/...",
      "tg_channel_url": "https://t.me/...",
      "novel_status": "ongoing",
      "chapters_count": 1500,
      "source_url": "https://...",
      "translation_status": "translating",
      "translation_note": "Weekly updates",
      "translated_chapters": 500,
      "last_translated_at": "2024-06-01T00:00:00Z",
      "extra_info": {},
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "genres": [
        { "id": "uuid", "name": "Fantasy", "name_mm": "ဖန်တစီ" }
      ]
    }
  ],
  "total": 100,
  "page": 1,
  "per_page": 20,
  "total_pages": 5
}`,
  },
  {
    method: "GET",
    path: "/api/v1/novels/:id",
    description: "Get a single novel by ID, including reading links",
    params: [{ name: "id", type: "uuid", default: "", desc: "Novel UUID (path parameter)" }],
    response: `{
  "data": {
    "id": "uuid",
    "title_en": "Against the Gods",
    "title_mm": "နတ်ဘုရားများကို ဆန့်ကျင်၍",
    "author_pen_name": "Mars Gravity",
    "synopsis": "...",
    "cover_image_url": "https://...",
    "novel_status": "ongoing",
    "chapters_count": 1500,
    "translation_status": "translating",
    "translation_note": "Weekly updates",
    "translated_chapters": 500,
    "last_translated_at": "2024-06-01T00:00:00Z",
    "genres": [
      { "id": "uuid", "name": "Fantasy", "name_mm": "ဖန်တစီ" }
    ],
    "reading_links": [
      { "id": "uuid", "platform_name": "WuxiaWorld", "url": "https://..." }
    ]
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/genres",
    description: "List all genres",
    params: [],
    response: `{
  "data": [
    { "id": "uuid", "name": "Action", "name_mm": "အက်ရှင်", "created_at": "..." },
    { "id": "uuid", "name": "Fantasy", "name_mm": "ဖန်တစီ", "created_at": "..." }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/v1/stats",
    description: "Get total counts",
    params: [],
    response: `{
  "data": {
    "total_novels": 1500,
    "total_genres": 20
  }
}`,
  },
];

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <BookOpen className="h-5 w-5 text-primary" />
            NovelBase
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/novels"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Browse
            </Link>
            <Link href="/api-docs" className="text-sm font-medium text-foreground">
              API
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Code className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">API Documentation</h1>
          </div>
          <p className="text-muted-foreground">
            Public REST API for accessing novel data. No authentication required.
            All responses are in JSON format.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Base URL</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="rounded bg-muted px-3 py-2 text-sm font-mono block">
              https://your-domain.com/api/v1
            </code>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Rate Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>All endpoints are rate-limited per IP address:</p>
            <div className="space-y-1">
              <div className="flex justify-between rounded-md border p-2">
                <code className="font-mono text-primary">/novels, /novels/:id, /genres</code>
                <span className="text-muted-foreground">60 req/min</span>
              </div>
              <div className="flex justify-between rounded-md border p-2">
                <code className="font-mono text-primary">/stats</code>
                <span className="text-muted-foreground">30 req/min</span>
              </div>
            </div>
            <p className="text-muted-foreground">Exceeding the limit returns <code className="font-mono">429 Too Many Requests</code> with a <code className="font-mono">Retry-After</code> header.</p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {endpoints.map((ep, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-600 hover:bg-green-700 text-white">
                    {ep.method}
                  </Badge>
                  <code className="text-sm font-mono font-semibold">
                    {ep.path}
                  </code>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {ep.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {ep.params.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Parameters</h4>
                    <div className="space-y-2">
                      {ep.params.map((p) => (
                        <div
                          key={p.name}
                          className="flex items-start gap-3 text-sm border rounded-md p-2"
                        >
                          <code className="font-mono text-primary font-medium min-w-[80px]">
                            {p.name}
                          </code>
                          <Badge variant="outline" className="text-xs">
                            {p.type}
                          </Badge>
                          <span className="text-muted-foreground flex-1">
                            {p.desc}
                          </span>
                          {p.default && (
                            <span className="text-xs text-muted-foreground">
                              default: {p.default}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold mb-2">Response</h4>
                  <pre className="rounded-md bg-zinc-950 text-zinc-50 p-4 text-xs overflow-x-auto">
                    <code>{ep.response}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Usage Examples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">cURL</h4>
              <pre className="rounded-md bg-zinc-950 text-zinc-50 p-4 text-xs overflow-x-auto">
                <code>{`# List novels
curl "https://your-domain.com/api/v1/novels?page=1&per_page=10"

# Search novels
curl "https://your-domain.com/api/v1/novels?q=against+the+gods"

# Get single novel
curl "https://your-domain.com/api/v1/novels/NOVEL_UUID"

# List genres
curl "https://your-domain.com/api/v1/genres"

# Get stats
curl "https://your-domain.com/api/v1/stats"`}</code>
              </pre>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">JavaScript (fetch)</h4>
              <pre className="rounded-md bg-zinc-950 text-zinc-50 p-4 text-xs overflow-x-auto">
                <code>{`const response = await fetch(
  "https://your-domain.com/api/v1/novels?q=fantasy&status=ongoing"
);
const { data, total, page, total_pages } = await response.json();

console.log(\`Found \${total} novels\`);
data.forEach(novel => {
  console.log(\`\${novel.title_en} (\${novel.title_mm})\`);
});`}</code>
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
