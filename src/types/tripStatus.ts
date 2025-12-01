// Trip Status Types and Utilities

export const TripStatus = {
  PLANNING: 'planning',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type TripStatusType = typeof TripStatus[keyof typeof TripStatus];

// Status display config
export const TripStatusConfig: Record<TripStatusType, {
  label: { th: string; en: string };
  color: string;
  bgColor: string;
  icon: string;
}> = {
  planning: {
    label: { th: 'วางแผน', en: 'Planning' },
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: '🟡',
  },
  confirmed: {
    label: { th: 'ยืนยันแล้ว', en: 'Confirmed' },
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: '🟢',
  },
  completed: {
    label: { th: 'เสร็จสิ้น', en: 'Completed' },
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: '🔵',
  },
  cancelled: {
    label: { th: 'ยกเลิก', en: 'Cancelled' },
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: '⚪',
  },
};

// Get next status in the flow
export function getNextStatus(current: TripStatusType): TripStatusType | null {
  switch (current) {
    case 'planning':
      return 'confirmed';
    case 'confirmed':
      return 'completed';
    case 'completed':
      return null; // No next status
    case 'cancelled':
      return null;
    default:
      return null;
  }
}

// Check if status transition is valid
export function isValidTransition(from: TripStatusType, to: TripStatusType): boolean {
  const validTransitions: Record<TripStatusType, TripStatusType[]> = {
    planning: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'planning', 'cancelled'],
    completed: ['confirmed'], // Can revert to confirmed
    cancelled: ['planning'], // Can reactivate
  };
  
  return validTransitions[from]?.includes(to) ?? false;
}

