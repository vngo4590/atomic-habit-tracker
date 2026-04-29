import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconToday(props: IconProps) {
  return <Icon {...props}><circle cx="7" cy="7" r="5" /><path d="M7 4v3l2 1.5" /></Icon>;
}

export function IconList(props: IconProps) {
  return <Icon {...props}><path d="M3 4h8M3 7h8M3 10h8" /></Icon>;
}

export function IconPlus(props: IconProps) {
  return <Icon {...props}><path d="M7 3v8M3 7h8" /></Icon>;
}

export function IconChart(props: IconProps) {
  return <Icon {...props}><path d="M2 11h10M3 11V7M6 11V4M9 11V8M12 11V6" /></Icon>;
}

export function IconJournal(props: IconProps) {
  return <Icon {...props}><path d="M3 2h7l2 2v8H3z" /><path d="M5 5h5M5 8h4" /></Icon>;
}

export function IconReview(props: IconProps) {
  return <Icon {...props}><path d="M2 7h10M7 2l5 5-5 5" /></Icon>;
}

export function IconIdentity(props: IconProps) {
  return <Icon {...props}><circle cx="7" cy="5" r="2.5" /><path d="M2.5 12c.7-2 2.4-3 4.5-3s3.8 1 4.5 3" /></Icon>;
}

export function IconSettings(props: IconProps) {
  return <Icon {...props}><circle cx="7" cy="7" r="2" /><path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.5 2.5l1.4 1.4M10.1 10.1l1.4 1.4M2.5 11.5l1.4-1.4M10.1 3.9l1.4-1.4" /></Icon>;
}

export function IconCheck(props: IconProps) {
  return <Icon {...props}><path d="M3 7l3 3 5-6" /></Icon>;
}

export function IconFlame(props: IconProps) {
  return <Icon {...props}><path d="M7 1c0 2-3 3-3 6a3 3 0 006 0c0-1.5-1-2-1-3 0 0 1 1 2 1.5C10.5 4 8 3 7 1z" /></Icon>;
}

export function IconArrow(props: IconProps) {
  return <Icon {...props}><path d="M3 7h8M8 4l3 3-3 3" /></Icon>;
}

export function IconBack(props: IconProps) {
  return <Icon {...props}><path d="M11 7H3M6 4L3 7l3 3" /></Icon>;
}

export function IconEdit(props: IconProps) {
  return <Icon {...props}><path d="M2 12h2l7-7-2-2-7 7v2z" /></Icon>;
}

export function IconTrash(props: IconProps) {
  return <Icon {...props}><path d="M3 4h8M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v7a1 1 0 001 1h2a1 1 0 001-1V4" /></Icon>;
}

export function IconLink(props: IconProps) {
  return <Icon {...props}><path d="M6 8l2-2M5 9l-1 1a2 2 0 01-3-3l1-1M9 5l1-1a2 2 0 013 3l-1 1" /></Icon>;
}

export function IconStar(props: IconProps) {
  return <Icon {...props}><path d="M7 1.5l1.7 3.5 3.8.5-2.8 2.7.7 3.8L7 10.2 3.6 12l.7-3.8L1.5 5.5l3.8-.5z" /></Icon>;
}

export function IconSun(props: IconProps) {
  return <Icon {...props}><circle cx="7" cy="7" r="2.5" /><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.5 2.5l1 1M10.5 10.5l1 1M2.5 11.5l1-1M10.5 3.5l1-1" /></Icon>;
}

export function IconMoon(props: IconProps) {
  return <Icon {...props}><path d="M11 8.5A4.5 4.5 0 016.5 4 4.5 4.5 0 1011 8.5z" /></Icon>;
}

export function IconSearch(props: IconProps) {
  return <Icon {...props}><circle cx="6" cy="6" r="3.5" /><path d="M9 9l3 3" /></Icon>;
}

export function IconClose(props: IconProps) {
  return <Icon {...props}><path d="M3 3l8 8M11 3l-8 8" /></Icon>;
}

export function IconBook(props: IconProps) {
  return <Icon {...props}><path d="M3 2h7l2 2v8H3z" /><path d="M3 2v10" /><path d="M5 5h5" /></Icon>;
}
