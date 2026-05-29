import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const alt = "NovelBase - Myanmar NovelBase | မြန်မာ ဝတ္ထု စာအုပ် အချက်အလက်များ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  const [logoData, mmFont] = await Promise.all([
    readFile(join(process.cwd(), "public/logo.png")),
    readFile(join(process.cwd(), "public/fonts/Cherry_Unicode.ttf")),
  ]);
  const logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle glow behind logo */}
        <div
          style={{
            position: "absolute",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
            top: "100px",
            display: "flex",
          }}
        />

        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoBase64}
          alt=""
          width={120}
          height={120}
          style={{ filter: "invert(1)", marginBottom: "24px" }}
        />

        {/* Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              fontSize: "56px",
              fontWeight: 700,
              color: "white",
              letterSpacing: "-1px",
            }}
          >
            NovelBase
          </span>
        </div>

        {/* Myanmar subtitle */}
        <div
          style={{
            fontSize: "28px",
            color: "#c7d2fe",
            marginBottom: "8px",
            fontFamily: "Myanmar",
          }}
        >
          မြန်မာ ဝတ္ထု စာအုပ် အချက်အလက်များ
        </div>

        {/* English description */}
        <div
          style={{
            fontSize: "20px",
            color: "#94a3b8",
            marginBottom: "36px",
          }}
        >
          Browse Myanmar novels with English &amp; Myanmar titles, genres, and social links
        </div>

        {/* Tags */}
        <div
          style={{
            display: "flex",
            gap: "12px",
          }}
        >
          {["ဝတ္ထုများ", "ဘာသာပြန်", "စာရေးဆရာ", "အမျိုးအစား"].map((tag) => (
            <div
              key={tag}
              style={{
                padding: "8px 24px",
                borderRadius: "9999px",
                border: "1px solid #334155",
                background: "rgba(99,102,241,0.1)",
                color: "#a5b4fc",
                fontSize: "18px",
                fontFamily: "Myanmar",
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            fontSize: "16px",
            color: "#475569",
            display: "flex",
          }}
        >
          novelbase.labmyanmar.com
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Myanmar",
          data: mmFont,
          style: "normal" as const,
          weight: 400 as const,
        },
      ],
    }
  );
}
