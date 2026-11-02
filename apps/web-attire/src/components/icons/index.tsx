import type { ReactNode, SVGProps } from "react";

/**
 * AVERIXA icon set. One grid (24px), one stroke (1.75, square caps, mitred joins), duotone:
 * `currentColor` for the structure, `--accent` (gold) for the detail. Mirrors the logo's angular line art.
 * Decorative by default (aria-hidden); pass `title` to expose it to assistive tech.
 */
export type Props = Omit<SVGProps<SVGSVGElement>, "title"> & { size?: number; title?: string };

export const A = "rgb(var(--accent))"; // accent tone

export function Icon({ size = 20, title, children, ...rest }: Props & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="square" strokeLinejoin="miter" role={title ? "img" : undefined} aria-hidden={title ? undefined : true}
      aria-label={title} focusable="false" {...rest}
    >
      {children}
    </svg>
  );
}

export const BagIcon = (p: Props) => <Icon {...p}><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" stroke={A} /></Icon>;
export const SearchIcon = (p: Props) => <Icon {...p}><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5.5 5.5" stroke={A} /></Icon>;
export const HeartIcon = ({ filled, ...p }: Props & { filled?: boolean }) => <Icon {...p}><path d="M12 20L4.5 11.5 7 6l5 3 5-3 2.5 5.5L12 20z" fill={filled ? A : "none"} stroke={filled ? A : "currentColor"} /><path d="M12 9v5" stroke={filled ? "rgb(var(--on-brand))" : A} /></Icon>;
export const UserIcon = (p: Props) => <Icon {...p}><path d="M12 4l3 3v3l-3 3-3-3V7l3-3z" /><path d="M5 20l2-4h10l2 4" stroke={A} /></Icon>;
export const MenuIcon = (p: Props) => <Icon {...p}><path d="M4 7h16M4 17h16" /><path d="M4 12h10" stroke={A} /></Icon>;
export const CloseIcon = (p: Props) => <Icon {...p}><path d="M6 6l12 12" /><path d="M18 6L6 18" stroke={A} /></Icon>;
export const ArrowRightIcon = (p: Props) => <Icon {...p}><path d="M4 12h15" /><path d="M13 6l6 6-6 6" stroke={A} /></Icon>;
export const CheckIcon = (p: Props) => <Icon {...p}><path d="M5 12.5l4.5 4.5L19 7.5" stroke={A} /></Icon>;
export const TruckIcon = (p: Props) => <Icon {...p}><path d="M2 7h12v9H2zM14 10h4l3 3v3h-7" /><circle cx="6" cy="17.5" r="1.8" stroke={A} /><circle cx="17" cy="17.5" r="1.8" stroke={A} /></Icon>;
export const ShieldIcon = (p: Props) => <Icon {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="M8.5 12l2.5 2.5 4.5-5" stroke={A} /></Icon>;
export const CashIcon = (p: Props) => <Icon {...p}><path d="M3 6h18v12H3z" /><circle cx="12" cy="12" r="3" stroke={A} /></Icon>;
export const PackageIcon = (p: Props) => <Icon {...p}><path d="M3 8l9-5 9 5v8l-9 5-9-5V8z" /><path d="M3 8l9 5 9-5M12 13v8" stroke={A} /></Icon>;
export const SupportIcon = (p: Props) => <Icon {...p}><path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H4zM17 14h3v5h-3z" /><path d="M20 19c0 2-2 3-5 3h-2" stroke={A} /></Icon>;
export const StarIcon = ({ filled, ...p }: Props & { filled?: boolean }) => <Icon {...p}><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7L12 3z" fill={filled ? A : "none"} stroke={A} /></Icon>;
export const ContrastIcon = (p: Props) => <Icon {...p}><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill={A} stroke={A} /></Icon>;
export const MotionIcon = (p: Props) => <Icon {...p}><path d="M3 12h4l2-6 4 12 2-6h6" stroke={A} /><path d="M3 5v14" /></Icon>;
export const CompareIcon = (p: Props) => <Icon {...p}><path d="M4 5h6v14H4zM14 9h6v10h-6z" /><path d="M7 9v6M17 13v3" stroke={A} /></Icon>;
export const EyeIcon = (p: Props) => <Icon {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" stroke={A} /></Icon>;
export const InstagramIcon = (p: Props) => <Icon {...p}><path d="M4 4h16v16H4z" /><circle cx="12" cy="12" r="3.8" stroke={A} /><path d="M16.5 7.5h.01" stroke={A} strokeWidth={2.5} /></Icon>;
export const FacebookIcon = (p: Props) => <Icon {...p}><path d="M14 21v-8h3l.5-3.5H14V7.5c0-1 .5-1.5 1.6-1.5H18V3h-3c-2.6 0-4 1.5-4 4v2.5H8V13h3v8z" /><path d="M11 13h3" stroke={A} /></Icon>;
export const TikTokIcon = (p: Props) => <Icon {...p}><path d="M14 3v12.5a3.5 3.5 0 1 1-3.5-3.5" /><path d="M14 3c.4 2.6 2.2 4.4 5 4.6" stroke={A} /></Icon>;
export const YouTubeIcon = (p: Props) => <Icon {...p}><path d="M3 6h18v12H3z" /><path d="M10 9.5l5 2.5-5 2.5z" stroke={A} /></Icon>;
export const WhatsAppIcon = (p: Props) => <Icon {...p}><path d="M4 20l1.3-4.2A8 8 0 1 1 8.5 19z" /><path d="M9 9c0 3 3 6 6 6" stroke={A} /></Icon>;
export const XIcon = (p: Props) => <Icon {...p}><path d="M4 4l16 16" /><path d="M20 4L4 20" stroke={A} /></Icon>;
