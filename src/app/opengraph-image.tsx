import { ImageResponse } from "next/og";

export const alt = "NovelBase - Myanmar NovelBase";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
              color: "white",
              fontWeight: 700,
            }}
          >
            NB
          </div>
          <span
            style={{
              fontSize: "64px",
              fontWeight: 700,
              color: "white",
              letterSpacing: "-2px",
            }}
          >
            NovelBase
          </span>
        </div>
        <div
          style={{
            fontSize: "28px",
            color: "#94a3b8",
            marginTop: "10px",
            textAlign: "center",
            maxWidth: "700px",
          }}
        >
          Myanmar NovelBase
        </div>
        <div
          style={{
            fontSize: "22px",
            color: "#64748b",
            marginTop: "16px",
            textAlign: "center",
          }}
        >
          မြန်မာ ဝတ္ထု စာအုပ်များ ရှာဖွေပါ
        </div>
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "40px",
          }}
        >
          {["Novels", "Genres", "Authors", "Translations"].map((tag) => (
            <div
              key={tag}
              style={{
                padding: "8px 24px",
                borderRadius: "9999px",
                border: "1px solid #334155",
                color: "#94a3b8",
                fontSize: "18px",
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
