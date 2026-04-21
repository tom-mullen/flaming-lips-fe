import { cn } from "@/app/lib/cn";

// FilenameLabel renders a filesystem path with *leading* ellipsis —
// when the path doesn't fit its container the ellipsis appears at the
// front and the filename (at the tail) stays visible. For paths like
//   "data-room-ed-sheeran/Publishing/UMPG/.../statement.xlsx"
// this keeps the informative tail on screen.
//
// Implementation: `direction: rtl` moves the overflow/ellipsis to the
// leading edge. We explicitly left-align so the visible tail stays at
// the container's left edge (matching surrounding LTR layout) and
// render a native browser tooltip carrying the full path.
//
// `className` is merged so callers keep control of typography
// (text-sm, font-semibold, text-white, etc). The truncate + direction
// classes stay fixed.
interface FilenameLabelProps {
  filename: string;
  className?: string;
  as?: "p" | "span";
}

export default function FilenameLabel({
  filename,
  className,
  as: As = "p",
}: FilenameLabelProps) {
  return (
    <As
      className={cn("truncate text-left [direction:rtl]", className)}
      title={filename}
    >
      {filename}
    </As>
  );
}
