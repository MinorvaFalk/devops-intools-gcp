interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  size?: number;
  weight?: number;
}

export function Icon({ name, size = 16, weight = 1.6, ...rest }: IconProps) {
  const s = size;
  const props = {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: weight,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
  switch (name) {
    case "search": return <svg {...props}><circle cx="11" cy="11" r="6"/><path d="m20 20-3.5-3.5"/></svg>;
    case "server": return <svg {...props}><rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><circle cx="7" cy="7.5" r=".5" fill="currentColor"/><circle cx="7" cy="16.5" r=".5" fill="currentColor"/></svg>;
    case "database": return <svg {...props}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>;
    case "cluster": return <svg {...props}><polygon points="12 3 21 8 21 16 12 21 3 16 3 8 12 3"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/></svg>;
    case "bucket": return <svg {...props}><path d="M4 7h16l-1.5 12.5a2 2 0 0 1-2 1.5h-9a2 2 0 0 1-2-1.5L4 7Z"/><path d="M4 7c0-2 3.6-3.5 8-3.5S20 5 20 7"/></svg>;
    case "memory": return <svg {...props}><rect x="4" y="6" width="16" height="12" rx="1.5"/><path d="M8 6V3M12 6V3M16 6V3M8 21v-3M12 21v-3M16 21v-3M4 10H1M4 14H1M23 10h-3M23 14h-3"/></svg>;
    case "book": return <svg {...props}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5V4.5Z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/></svg>;
    case "log": return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>;
    case "play": return <svg {...props}><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/></svg>;
    case "stop": return <svg {...props}><rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/></svg>;
    case "snapshot": return <svg {...props}><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M9 6V4h6v2"/></svg>;
    case "disk": return <svg {...props}><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/></svg>;
    case "attach": return <svg {...props}><path d="M14 6.5 7.5 13a4 4 0 1 0 5.5 5.7L19 13"/><path d="m11 9 6 6"/></svg>;
    case "backup": return <svg {...props}><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>;
    case "restore": return <svg {...props}><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/></svg>;
    case "scaleUp": return <svg {...props}><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></svg>;
    case "key": return <svg {...props}><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9"/><path d="m17 6 3 3"/><path d="m15 8 2 2"/></svg>;
    case "eye": return <svg {...props}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "eyeOff": return <svg {...props}><path d="m3 3 18 18"/><path d="M10.5 5.2A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-3 4"/><path d="M6 7.3A17.6 17.6 0 0 0 2 12s3.5 7 10 7c1.6 0 3-.3 4.3-.8"/><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2"/></svg>;
    case "copy": return <svg {...props}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>;
    case "close": return <svg {...props}><path d="m6 6 12 12M18 6 6 18"/></svg>;
    case "chev": return <svg {...props}><path d="m9 6 6 6-6 6"/></svg>;
    case "chevDown": return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case "check": return <svg {...props}><path d="m5 12 5 5L20 7"/></svg>;
    case "warn": return <svg {...props}><path d="M12 3 2 21h20L12 3Z"/><path d="M12 10v5"/><circle cx="12" cy="18" r=".7" fill="currentColor"/></svg>;
    case "info": return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="8" r=".7" fill="currentColor"/></svg>;
    case "shield": return <svg {...props}><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z"/></svg>;
    case "edit": return <svg {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 2 2L10 15H8v-2L18.5 2.5Z"/></svg>;
    case "logout": return <svg {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>;
    case "refresh": return <svg {...props}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>;
    case "filter": return <svg {...props}><path d="M3 5h18l-7 9v6l-4-2v-4L3 5Z"/></svg>;
    case "plus": return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case "clock": return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>;
    case "folder": return <svg {...props}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z"/></svg>;
    default: return null;
  }
}
