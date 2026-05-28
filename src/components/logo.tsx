import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  size = 24,
  className,
  showText = true,
}: {
  size?: number;
  className?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Image
        src="/logo.png"
        alt="NovelBase"
        width={size}
        height={size}
        className="dark:invert"
      />
      {showText && <span className="font-bold">NovelBase</span>}
    </span>
  );
}
