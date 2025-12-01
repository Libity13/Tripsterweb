import { Badge } from "@/components/ui/badge";
import { TripStatusType, TripStatusConfig } from "@/types/tripStatus";
import { useLanguage } from "@/hooks/useLanguage";

interface TripStatusBadgeProps {
  status: TripStatusType;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TripStatusBadge({ 
  status, 
  showIcon = true,
  size = 'md' 
}: TripStatusBadgeProps) {
  const { language } = useLanguage();
  const config = TripStatusConfig[status] || TripStatusConfig.planning;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge 
      variant="outline"
      className={`${config.bgColor} ${config.color} border-0 ${sizeClasses[size]} font-medium`}
    >
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label[language]}
    </Badge>
  );
}

export default TripStatusBadge;

