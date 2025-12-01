import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import { TripStatusType, TripStatusConfig, TripStatus, isValidTransition } from "@/types/tripStatus";
import { useLanguage } from "@/hooks/useLanguage";

interface TripStatusButtonProps {
  currentStatus: TripStatusType;
  onStatusChange: (newStatus: TripStatusType) => Promise<void>;
  disabled?: boolean;
}

export function TripStatusButton({ 
  currentStatus, 
  onStatusChange,
  disabled = false 
}: TripStatusButtonProps) {
  const { language, t } = useLanguage();
  const [isChanging, setIsChanging] = useState(false);
  
  const currentConfig = TripStatusConfig[currentStatus] || TripStatusConfig.planning;
  
  const handleStatusChange = async (newStatus: TripStatusType) => {
    if (newStatus === currentStatus || !isValidTransition(currentStatus, newStatus)) {
      return;
    }
    
    setIsChanging(true);
    try {
      await onStatusChange(newStatus);
    } finally {
      setIsChanging(false);
    }
  };

  // Get all statuses that can be transitioned to
  const availableStatuses = Object.values(TripStatus).filter(
    status => status === currentStatus || isValidTransition(currentStatus, status)
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={disabled || isChanging}
          className={`${currentConfig.bgColor} ${currentConfig.color} border-0 hover:opacity-80`}
        >
          <span className="mr-1">{currentConfig.icon}</span>
          {currentConfig.label[language]}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableStatuses.map((status) => {
          const config = TripStatusConfig[status];
          const isActive = status === currentStatus;
          
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusChange(status)}
              disabled={isActive}
              className={`${isActive ? 'bg-accent' : ''}`}
            >
              <span className="mr-2">{config.icon}</span>
              {config.label[language]}
              {isActive && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default TripStatusButton;

