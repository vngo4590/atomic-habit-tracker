import type { LucideProps } from "lucide-react";
import {
  CalendarCheck,
  Check,
  ChevronRight,
  Flame,
  LayoutList,
  LineChart,
  Link as LinkIcon,
  Menu,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Star,
  Sun,
  Moon,
  Trash2,
  BookOpen,
  User,
  X,
} from "lucide-react";

type IconProps = LucideProps;

const iconDefaults: IconProps = {
  strokeWidth: 1.5,
  size: 14,
};

export function IconToday(props: IconProps) {
  return <CalendarCheck {...iconDefaults} {...props} />;
}

export function IconList(props: IconProps) {
  return <LayoutList {...iconDefaults} {...props} />;
}

export function IconPlus(props: IconProps) {
  return <Plus {...iconDefaults} {...props} />;
}

export function IconChart(props: IconProps) {
  return <LineChart {...iconDefaults} {...props} />;
}

export function IconJournal(props: IconProps) {
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
      <path d="M3 2h7l2 2v8H3z" />
      <path d="M5 5h5M5 8h4" />
    </svg>
  );
}

export function IconReview(props: IconProps) {
  return <RotateCcw {...iconDefaults} {...props} />;
}

export function IconIdentity(props: IconProps) {
  return <User {...iconDefaults} {...props} />;
}

export function IconSettings(props: IconProps) {
  return <Settings {...iconDefaults} {...props} />;
}

export function IconCheck(props: IconProps) {
  return <Check {...iconDefaults} {...props} />;
}

export function IconFlame(props: IconProps) {
  return <Flame {...iconDefaults} {...props} />;
}

export function IconArrow(props: IconProps) {
  return <ChevronRight {...iconDefaults} {...props} />;
}

export function IconBack(props: IconProps) {
  return <RotateCcw {...iconDefaults} {...props} />;
}

export function IconEdit(props: IconProps) {
  return <Pencil {...iconDefaults} {...props} />;
}

export function IconTrash(props: IconProps) {
  return <Trash2 {...iconDefaults} {...props} />;
}

export function IconLink(props: IconProps) {
  return <LinkIcon {...iconDefaults} {...props} />;
}

export function IconStar(props: IconProps) {
  return <Star {...iconDefaults} {...props} />;
}

export function IconSun(props: IconProps) {
  return <Sun {...iconDefaults} {...props} />;
}

export function IconMoon(props: IconProps) {
  return <Moon {...iconDefaults} {...props} />;
}

export function IconSearch(props: IconProps) {
  return <Search {...iconDefaults} {...props} />;
}

export function IconClose(props: IconProps) {
  return <X {...iconDefaults} {...props} />;
}

export function IconBook(props: IconProps) {
  return <BookOpen {...iconDefaults} {...props} />;
}

export function IconMenu(props: IconProps) {
  return <Menu {...iconDefaults} {...props} />;
}
