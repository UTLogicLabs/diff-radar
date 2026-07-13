import type { SVGProps } from "react";

export type IconName = "sun" | "desktop" | "moon" | "warning" | "check" | "chevron-down";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const PATHS: Record<IconName, string> = {
  sun: "M12 4V2m0 20v-2m8-8h2M2 12h2m14.14-5.14 1.42-1.42M4.44 19.56l1.42-1.42M17.56 17.56l1.42 1.42M4.44 4.44l1.42 1.42M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  desktop: "M4 5h16v10H4V5Zm4 14h8m-4-4v4",
  moon: "M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z",
  warning: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
  check: "m5 13 4 4L19 7",
  "chevron-down": "m6 9 6 6 6-6",
};

export function Icon({ name, size = 16, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      focusable="false"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
