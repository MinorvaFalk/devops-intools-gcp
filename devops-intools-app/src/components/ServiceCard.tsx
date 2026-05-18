import { Icon } from "./Icon";
import type { PageId } from "../layout/Sidebar";

interface ServiceCardProps {
  label: string;
  description: string;
  icon: string;
  page: PageId;
  onNav: (id: PageId) => void;
}

export function ServiceCard({ label, description, icon, page, onNav }: ServiceCardProps) {
  return (
    <div className="resource-card" onClick={() => onNav(page)} role="button">
      <div className="resource-card-icon">
        <Icon name={icon} size={16} />
      </div>
      <div className="resource-card-body">
        <div className="resource-card-label">{label}</div>
        <div className="resource-card-desc">{description}</div>
      </div>
    </div>
  );
}
