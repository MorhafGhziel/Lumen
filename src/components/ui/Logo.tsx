import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 24, className }: LogoProps) {
  return (
    <Image
      src="/icons/lumenn.svg"
      alt="Lumen"
      width={size}
      height={size}
      className={cn("object-contain", className)}
    />
  );
}
