// PDF Export Service - Modern Travel Journal Design
import { Document, Page, Text, View, Image, StyleSheet, Font, Link, pdf } from '@react-pdf/renderer';
import { Trip, Destination } from '@/types/database';
import QRCode from 'qrcode';

// Register local fonts for Thai support
Font.register({
  family: 'NotoSansThai',
  src: '/fonts/NotoSansThai.ttf',
});

Font.register({
  family: 'DMSans',
  fonts: [
    { src: '/fonts/DMSans.ttf', fontWeight: 400 },
    { src: '/fonts/DMSans-Italic.ttf', fontStyle: 'italic' },
  ],
});

// ===========================================
// 🛡️ Safe Helper Functions (Error Handling)
// ===========================================

/**
 * Safe text helper - prevents null/undefined rendering errors
 */
const safeText = (
  primary: string | null | undefined,
  fallback: string = '—'
): string => {
  return primary?.trim() || fallback;
};

/**
 * Safe number helper - prevents NaN and null issues
 */
const safeNumber = (
  value: number | null | undefined,
  fallback: number = 0
): number => {
  return typeof value === 'number' && !isNaN(value) ? value : fallback;
};

/**
 * Safe rating display
 */
const safeRating = (rating: number | null | undefined): string => {
  const num = safeNumber(rating);
  return num > 0 ? num.toFixed(1) : '';
};

/**
 * Safe array helper
 */
const safeArray = <T,>(arr: T[] | null | undefined): T[] => {
  return Array.isArray(arr) ? arr : [];
};

/**
 * Format currency with Intl.NumberFormat (improved)
 */
const formatCurrencyIntl = (
  amount: number | null | undefined, 
  locale: string = 'th-TH'
): string => {
  const num = safeNumber(amount);
  if (num <= 0) return '—';
  return new Intl.NumberFormat(locale, { 
    style: 'currency', 
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

/**
 * Get price level display (฿, ฿฿, ฿฿฿, ฿฿฿฿)
 */
const getPriceLevel = (level: number | null | undefined): string => {
  const num = safeNumber(level);
  if (num <= 0) return '';
  return '฿'.repeat(Math.min(num, 4));
};

/**
 * Calculate daily summary
 */
interface DailySummary {
  placesCount: number;
  totalCost: number;
  totalDuration: number; // in minutes
}

const calculateDailySummary = (destinations: Destination[]): DailySummary => {
  return {
    placesCount: destinations.length,
    totalCost: destinations.reduce((sum, d) => sum + safeNumber(d.estimated_cost), 0),
    totalDuration: destinations.reduce((sum, d) => sum + safeNumber(d.duration_minutes, 60), 0)
  };
};

// 🎨 Modern Travel Journal Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansThai',
    backgroundColor: '#FFFFFF',
    paddingBottom: 40,
  },
  
  // --- Cover Page ---
  coverImageContainer: {
    height: '35%',
    width: '100%',
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverGradient: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  coverIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  coverTagline: {
    fontSize: 14,
    color: '#bfdbfe',
    textAlign: 'center',
  },
  coverContent: {
    padding: 40,
    flex: 1,
  },
  tripTitle: {
    fontSize: 28,
    color: '#1e293b',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tripSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 30,
    lineHeight: 1.5,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statItem: {
    flex: 1,
    paddingRight: 15,
  },
  statLabel: {
    fontSize: 9,
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 14,
    color: '#334155',
    fontWeight: 'bold',
  },
  highlightsSection: {
    marginTop: 20,
  },
  highlightsTitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  highlightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
    marginRight: 10,
  },
  highlightText: {
    fontSize: 11,
    color: '#475569',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 9,
    color: '#94a3b8',
  },
  footerBrand: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  
  // QR Code Section
  qrSection: {
    position: 'absolute',
    bottom: 80,
    right: 40,
    alignItems: 'center',
  },
  qrCode: {
    width: 80,
    height: 80,
    marginBottom: 5,
  },
  qrLabel: {
    fontSize: 8,
    color: '#64748b',
    textAlign: 'center',
  },

  // --- Itinerary Pages ---
  itineraryHeader: {
    backgroundColor: '#f8fafc',
    padding: 20,
    paddingHorizontal: 40,
    marginBottom: 10,
  },
  itineraryTitle: {
    fontSize: 18,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  daySection: {
    paddingHorizontal: 40,
    marginTop: 15,
    marginBottom: 10,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 6,
  },
  dayBadge: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 12,
  },
  dayDate: {
    fontSize: 12,
    color: '#1e40af',
  },

  // --- Timeline Items ---
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 10, // Increased spacing between items
    minHeight: 60, // Ensure minimum height
  },
  timeColumn: {
    width: 55,
    paddingRight: 10,
    alignItems: 'flex-end',
    borderRightWidth: 2,
    borderRightColor: '#e2e8f0',
    paddingBottom: 10,
  },
  timeColumnLast: {
    width: 55,
    paddingRight: 10,
    alignItems: 'flex-end',
    paddingBottom: 10,
  },
  timeText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: 'bold',
  },
  dotContainer: {
    width: 20,
    alignItems: 'center',
    paddingTop: 2,
    marginLeft: -11, // Center dot on the line
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  contentColumn: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  placeTitle: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  placeMeta: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  badge: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    color: '#475569',
    marginRight: 6,
  },
  badgeRating: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#fef3c7',
    color: '#92400e',
    marginRight: 6,
  },
  badgeCost: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#dcfce7',
    color: '#166534',
    marginRight: 6,
  },
  placeAddress: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 5,
    lineHeight: 1.4,
  },
  mapLink: {
    fontSize: 9,
    color: '#2563eb',
    textDecoration: 'none',
  },
  
  // Empty Day
  emptyDay: {
    paddingLeft: 15,
    color: '#94a3b8',
    fontSize: 10,
    paddingVertical: 10,
  },
  
  // Timeline Connector (line between destinations)
  timelineConnector: {
    position: 'absolute',
    left: 59, // Align with dot center
    top: 14,
    bottom: 0,
    width: 2,
    backgroundColor: '#e2e8f0',
  },
  timelineDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    borderWidth: 3,
    borderColor: '#dbeafe',
    zIndex: 10,
  },
  
  // Daily Summary Section
  daySummary: {
    marginTop: 15,
    marginHorizontal: 40,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  daySummaryTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  daySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  daySummaryLabel: {
    fontSize: 9,
    color: '#64748b',
  },
  daySummaryValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  
  // Price Level Badge
  badgePrice: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#fef3c7',
    color: '#92400e',
    marginRight: 6,
  },
  
  // Page Footer with Page Numbers
  pageFooter: {
    position: 'absolute',
    bottom: 15,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageFooterLeft: {
    fontSize: 8,
    color: '#94a3b8',
  },
  pageFooterCenter: {
    fontSize: 8,
    color: '#cbd5e1',
  },
  pageFooterRight: {
    fontSize: 8,
    color: '#94a3b8',
  },
  
  // --- Budget Summary Page ---
  budgetHeader: {
    backgroundColor: '#10b981',
    padding: 30,
    marginBottom: 30,
  },
  budgetHeaderTitle: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  budgetHeaderSubtitle: {
    fontSize: 12,
    color: '#d1fae5',
    textAlign: 'center',
    marginTop: 5,
  },
  budgetContent: {
    paddingHorizontal: 40,
  },
  budgetSection: {
    marginBottom: 25,
  },
  budgetSectionTitle: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  budgetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  budgetItemLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetItemIcon: {
    fontSize: 14,
    marginRight: 10,
  },
  budgetItemText: {
    fontSize: 13,
    color: '#334155',
  },
  budgetItemAmount: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  budgetTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  budgetTotalLabel: {
    fontSize: 14,
    color: '#166534',
    fontWeight: 'bold',
  },
  budgetTotalAmount: {
    fontSize: 20,
    color: '#166534',
    fontWeight: 'bold',
  },
  budgetNote: {
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 1.5,
  },
  
  // Budget per day breakdown
  budgetDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  budgetDayLabel: {
    fontSize: 12,
    color: '#475569',
  },
  budgetDayAmount: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: 'bold',
  },
});

// Helper Functions
const formatCurrency = (amount?: number | null, locale: string = 'th-TH') => {
  const num = safeNumber(amount);
  if (num <= 0) return '';
  // Use Intl.NumberFormat for proper Thai currency formatting
  return new Intl.NumberFormat(locale, { 
    style: 'currency', 
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

const getPlaceTypeLabel = (types: string[] | null | undefined, lang: string) => {
  const safeTypes = safeArray(types);
  if (safeTypes.includes('restaurant') || safeTypes.includes('food')) return lang === 'th' ? 'อาหาร' : 'Food';
  if (safeTypes.includes('lodging') || safeTypes.includes('hotel')) return lang === 'th' ? 'ที่พัก' : 'Hotel';
  if (safeTypes.includes('shopping') || safeTypes.includes('store')) return lang === 'th' ? 'ช้อปปิ้ง' : 'Shopping';
  if (safeTypes.includes('park') || safeTypes.includes('natural_feature')) return lang === 'th' ? 'ธรรมชาติ' : 'Nature';
  if (safeTypes.includes('museum') || safeTypes.includes('art_gallery')) return lang === 'th' ? 'พิพิธภัณฑ์' : 'Museum';
  if (safeTypes.includes('place_of_worship') || safeTypes.includes('temple')) return lang === 'th' ? 'วัด/ศาสนสถาน' : 'Temple';
  return lang === 'th' ? 'ท่องเที่ยว' : 'Attraction';
};

const getDayDate = (startDate: string, dayNumber: number, locale: string) => {
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNumber - 1);
  return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
};

/**
 * Calculate dynamic time slots based on visit_time and duration_minutes
 * Falls back to estimated times if no explicit times are set
 */
interface ScheduleItem {
  dest: Destination;
  time: string;
}

const calculateDaySchedule = (destinations: Destination[]): ScheduleItem[] => {
  const schedule: ScheduleItem[] = [];
  let currentMinutes = 9 * 60; // Start at 09:00 (540 minutes)
  const DEFAULT_VISIT_DURATION = 60; // 60 minutes default
  const DEFAULT_TRAVEL_TIME = 30; // 30 minutes between places
  
  destinations.forEach((dest, idx) => {
    // If destination has explicit visit_time, use it
    if (dest.visit_time) {
      const timeParts = dest.visit_time.split(':');
      if (timeParts.length >= 2) {
        const hours = parseInt(timeParts[0], 10);
        const mins = parseInt(timeParts[1], 10);
        if (!isNaN(hours) && !isNaN(mins)) {
          currentMinutes = hours * 60 + mins;
        }
      }
    }
    
    // Convert current minutes to time string
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    const timeString = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    
    schedule.push({
      dest,
      time: timeString
    });
    
    // Calculate next time slot
    const visitDuration = safeNumber(dest.duration_minutes, DEFAULT_VISIT_DURATION);
    currentMinutes += visitDuration + DEFAULT_TRAVEL_TIME;
    
    // Cap at 22:00 (10 PM)
    if (currentMinutes > 22 * 60) {
      currentMinutes = 22 * 60;
    }
  });
  
  return schedule;
};

// Legacy fallback for simple cases
const getTimeSlot = (index: number) => {
  const hour = 9 + (index * 2);
  return `${String(hour).padStart(2, '0')}:00`;
};

/**
 * Calculate budget summary from destinations
 */
interface BudgetSummary {
  accommodation: number;
  food: number;
  activities: number;
  shopping: number;
  total: number;
  byDay: Record<number, number>;
  itemCount: number;
}

const calculateBudget = (destinations: Destination[]): BudgetSummary => {
  const summary: BudgetSummary = {
    accommodation: 0,
    food: 0,
    activities: 0,
    shopping: 0,
    total: 0,
    byDay: {},
    itemCount: 0
  };
  
  destinations.forEach(dest => {
    const cost = safeNumber(dest.estimated_cost);
    if (cost <= 0) return;
    
    summary.itemCount++;
    const day = safeNumber(dest.visit_date, 1);
    summary.byDay[day] = (summary.byDay[day] || 0) + cost;
    
    const types = safeArray(dest.place_types);
    
    if (types.includes('lodging') || types.includes('hotel')) {
      summary.accommodation += cost;
    } else if (types.includes('restaurant') || types.includes('food') || types.includes('cafe')) {
      summary.food += cost;
    } else if (types.includes('shopping') || types.includes('store') || types.includes('shopping_mall')) {
      summary.shopping += cost;
    } else {
      summary.activities += cost;
    }
  });
  
  summary.total = summary.accommodation + summary.food + summary.activities + summary.shopping;
  return summary;
};

// Export Options Interface
export interface ExportOptions {
  includeCover?: boolean;
  includeBudget?: boolean;
  selectedDays?: number[]; // undefined = all days
  shareUrl?: string; // URL for QR Code
  qrCodeDataUrl?: string; // Pre-generated QR Code as data URL
}

interface PDFDocumentProps {
  trip: Trip;
  language: 'th' | 'en';
  options?: ExportOptions;
}

// Main PDF Document Component
export const TripPDFDocument = ({ trip, language = 'th', options = {} }: PDFDocumentProps) => {
  const locale = language === 'th' ? 'th-TH' : 'en-US';
  
  // Default options
  const { 
    includeCover = true, 
    includeBudget = true, 
    selectedDays,
    qrCodeDataUrl 
  } = options;

  // Calculate trip duration
  const totalTripDays = Math.ceil(
    (new Date(trip.end_date || '').getTime() - new Date(trip.start_date || '').getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  
  // Days to include (filter if selectedDays is provided)
  const daysToInclude = selectedDays || Array.from({ length: totalTripDays }, (_, i) => i + 1);
  const tripDays = daysToInclude.length;

  // Group destinations by day
  const destinationsByDay: Record<number, Destination[]> = {};
  (trip.destinations || []).forEach(dest => {
    const day = dest.visit_date || 1;
    // Only include if day is in selectedDays
    if (daysToInclude.includes(day)) {
      if (!destinationsByDay[day]) destinationsByDay[day] = [];
      destinationsByDay[day].push(dest);
    }
  });

  // Sort destinations by order_index
  Object.values(destinationsByDay).forEach(dests => {
    dests.sort((a, b) => ((a as any).order_index || 0) - ((b as any).order_index || 0));
  });

  // Get all filtered destinations
  const allDestinations = Object.values(destinationsByDay).flat();
  const topDestinations = allDestinations.slice(0, 5);

  return (
    <Document>
      {/* ============ Page 1: Cover (Optional) ============ */}
      {includeCover && (
      <Page size="A4" style={styles.page}>
        {/* Hero Section */}
        <View style={styles.coverImageContainer}>
          <View style={styles.coverGradient}>
            <Text style={{ fontSize: 20, color: '#ffffff', fontWeight: 'bold', textAlign: 'center' }}>
              {language === 'th' ? 'แผนการเดินทาง' : 'Travel Itinerary'}
            </Text>
            <Text style={styles.coverTagline}>
              {language === 'th' ? 'สร้างโดย Tripster AI' : 'Created with Tripster AI'}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.coverContent}>
          <Text style={styles.tripTitle}>
            {language === 'en' && trip.title_en ? trip.title_en : trip.title}
          </Text>
          <Text style={styles.tripSubtitle}>
            {(() => {
              let desc = language === 'en' && trip.description_en ? trip.description_en : trip.description;
              
              // Fix legacy default description
              if (desc === 'ทริปที่สร้างจาก AI Chat' || desc === 'แผนการเดินทางที่สร้างจาก AI Chat') {
                desc = 'ทริปที่สร้างจาก Tripster AI';
              } else if (desc === 'Travel plan created from AI Chat') {
                desc = 'Travel plan created from Tripster AI';
              }
              
              return desc || (language === 'th' ? 'แผนการเดินทางที่วางไว้อย่างพิถีพิถัน' : 'A carefully planned journey');
            })()}
          </Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{language === 'th' ? 'วันเดินทาง' : 'TRAVEL DATES'}</Text>
              <Text style={styles.statValue}>
                {new Date(trip.start_date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })} - {new Date(trip.end_date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{language === 'th' ? 'ระยะเวลา' : 'DURATION'}</Text>
              <Text style={styles.statValue}>
                {String(tripDays)} {language === 'th' ? 'วัน' : 'Days'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{language === 'th' ? 'สถานที่' : 'PLACES'}</Text>
              <Text style={styles.statValue}>
                {String(allDestinations.length)} {language === 'th' ? 'แห่ง' : 'Spots'}
              </Text>
            </View>
          </View>

          {/* Highlights */}
              {topDestinations.length > 0 && (
            <View style={styles.highlightsSection}>
              <Text style={styles.highlightsTitle}>
                {language === 'th' ? 'ไฮไลท์สถานที่' : 'HIGHLIGHTS'}
              </Text>
              {topDestinations.map((dest, i) => (
                <View key={dest.id || i} style={styles.highlightItem}>
                  <View style={styles.highlightDot} />
                  <Text style={styles.highlightText}>
                    {safeText(
                      language === 'en' && dest.name_en ? dest.name_en : dest.name,
                      language === 'th' ? 'สถานที่' : 'Place'
                    )}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* QR Code for sharing */}
        {qrCodeDataUrl && (
          <View style={styles.qrSection}>
            <Image src={qrCodeDataUrl} style={styles.qrCode} />
            <Text style={styles.qrLabel}>
              {language === 'th' ? 'สแกนเพื่อดูทริป' : 'Scan to view trip'}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {language === 'th' ? 'สร้างเมื่อ' : 'Generated on'} {new Date().toLocaleDateString(locale)}
          </Text>
          <Text 
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
          <Text style={styles.footerBrand}>Tripster AI</Text>
        </View>
      </Page>
      )}

      {/* ============ Page 2: Budget Summary (Optional) ============ */}
      {includeBudget && (() => {
        const budget = calculateBudget(allDestinations);
        const hasBudget = budget.total > 0;
        
        if (!hasBudget) return null;
        
        return (
          <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetHeaderTitle}>
                {language === 'th' ? 'สรุปงบประมาณ' : 'Budget Summary'}
              </Text>
              <Text style={styles.budgetHeaderSubtitle}>
                {language === 'th' ? 'ประมาณการค่าใช้จ่ายทั้งหมด' : 'Estimated Total Expenses'}
              </Text>
            </View>
            
            <View style={styles.budgetContent}>
              {/* Category Breakdown */}
              <View style={styles.budgetSection}>
                <Text style={styles.budgetSectionTitle}>
                  {language === 'th' ? 'แบ่งตามประเภท' : 'BY CATEGORY'}
                </Text>
                
                {budget.accommodation > 0 && (
                  <View style={styles.budgetItem}>
                    <View style={styles.budgetItemLabel}>
                      <Text style={styles.budgetItemText}>
                        {language === 'th' ? 'ที่พัก' : 'Accommodation'}
                      </Text>
                    </View>
                    <Text style={styles.budgetItemAmount}>{formatCurrency(budget.accommodation)}</Text>
                  </View>
                )}
                
                {budget.food > 0 && (
                  <View style={styles.budgetItem}>
                    <View style={styles.budgetItemLabel}>
                      <Text style={styles.budgetItemText}>
                        {language === 'th' ? 'อาหารและเครื่องดื่ม' : 'Food & Drinks'}
                      </Text>
                    </View>
                    <Text style={styles.budgetItemAmount}>{formatCurrency(budget.food)}</Text>
                  </View>
                )}
                
                {budget.activities > 0 && (
                  <View style={styles.budgetItem}>
                    <View style={styles.budgetItemLabel}>
                      <Text style={styles.budgetItemText}>
                        {language === 'th' ? 'ท่องเที่ยว/กิจกรรม' : 'Activities & Attractions'}
                      </Text>
                    </View>
                    <Text style={styles.budgetItemAmount}>{formatCurrency(budget.activities)}</Text>
                  </View>
                )}
                
                {budget.shopping > 0 && (
                  <View style={styles.budgetItem}>
                    <View style={styles.budgetItemLabel}>
                      <Text style={styles.budgetItemText}>
                        {language === 'th' ? 'ช้อปปิ้ง' : 'Shopping'}
                      </Text>
                    </View>
                    <Text style={styles.budgetItemAmount}>{formatCurrency(budget.shopping)}</Text>
                  </View>
                )}
              </View>
              
              {/* Per Day Breakdown */}
              {Object.keys(budget.byDay).length > 1 && (
                <View style={styles.budgetSection}>
                  <Text style={styles.budgetSectionTitle}>
                    {language === 'th' ? 'แบ่งตามวัน' : 'BY DAY'}
                  </Text>
                  {Object.entries(budget.byDay)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([day, amount]) => (
                      <View key={day} style={styles.budgetDayRow}>
                        <Text style={styles.budgetDayLabel}>
                          {language === 'th' ? `วันที่ ${day}` : `Day ${day}`}
                        </Text>
                        <Text style={styles.budgetDayAmount}>{formatCurrency(amount)}</Text>
                      </View>
                    ))}
                </View>
              )}
              
              {/* Total */}
              <View style={styles.budgetTotal}>
                <Text style={styles.budgetTotalLabel}>
                  {language === 'th' ? 'รวมทั้งหมด' : 'GRAND TOTAL'}
                </Text>
                <Text style={styles.budgetTotalAmount}>{formatCurrency(budget.total)}</Text>
              </View>
              
              {/* Note */}
              <Text style={styles.budgetNote}>
                {language === 'th' 
                  ? '* ค่าใช้จ่ายเป็นเพียงการประมาณการเท่านั้น ราคาจริงอาจแตกต่างกันได้\n** ยังไม่รวมค่าเดินทางระหว่างสถานที่'
                  : '* Expenses are estimates only. Actual prices may vary.\n** Transportation costs between locations not included.'}
              </Text>
            </View>
            
        {/* Page Footer with Page Number */}
        <View style={styles.pageFooter} fixed>
          <Text style={styles.pageFooterLeft}>Tripster AI</Text>
          <Text style={styles.pageFooterCenter}>
            {language === 'th' ? 'งบประมาณ' : 'Budget'}
          </Text>
          <Text 
            style={styles.pageFooterRight}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
          </Page>
        );
      })()}

      {/* ============ Page 3+: Itinerary ============ */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.itineraryHeader}>
          <Text style={styles.itineraryTitle}>
            {language === 'th' ? 'กำหนดการเดินทาง' : 'Itinerary'}
          </Text>
        </View>

        {/* Days */}
        {daysToInclude.map(day => {
          const destinations = destinationsByDay[day] || [];
          
          return (
            <View key={day} style={styles.daySection} wrap={false}>
              {/* Day Header */}
              <View style={styles.dayHeader}>
                <Text style={styles.dayBadge}>
                  {language === 'th' ? `วันที่ ${String(day)}` : `Day ${String(day)}`}
                </Text>
                <Text style={styles.dayDate}>
                  {getDayDate(trip.start_date || '', day, locale)}
                </Text>
              </View>

              {/* Timeline Items */}
              {destinations.length === 0 ? (
                <Text style={styles.emptyDay}>
                  {language === 'th' ? '— ยังไม่มีกำหนดการ —' : '— No plans yet —'}
                </Text>
              ) : (
                (() => {
                  const schedule = calculateDaySchedule(destinations);
                  return schedule.map((item, idx) => (
                  <View key={item.dest.id || idx} style={styles.timelineItem} wrap={false}>
                    {/* Time Column with Connector Line */}
                    <View style={idx === schedule.length - 1 ? styles.timeColumnLast : styles.timeColumn}>
                      <Text style={styles.timeText}>{item.time}</Text>
                    </View>

                    {/* Dot with better styling */}
                    <View style={styles.dotContainer}>
                      <View style={styles.timelineDotActive} />
                    </View>

                    {/* Content */}
                    <View style={styles.contentColumn}>
                      <Text style={styles.placeTitle}>
                        {safeText(
                          language === 'en' && item.dest.name_en ? item.dest.name_en : item.dest.name,
                          language === 'th' ? 'ไม่ระบุชื่อ' : 'Unnamed Place'
                        )}
                      </Text>

                      <View style={styles.placeMeta}>
                        <Text style={styles.badge}>
                          {getPlaceTypeLabel(item.dest.place_types, language)}
                        </Text>
                        {safeNumber(item.dest.rating) > 0 && (
                          <Text style={styles.badgeRating}>★ {safeRating(item.dest.rating)}</Text>
                        )}
                        {safeNumber(item.dest.price_level) > 0 && (
                          <Text style={styles.badgePrice}>{getPriceLevel(item.dest.price_level)}</Text>
                        )}
                        {safeNumber(item.dest.estimated_cost) > 0 && (
                          <Text style={styles.badgeCost}>{formatCurrency(item.dest.estimated_cost)}</Text>
                        )}
                      </View>

                      {item.dest.formatted_address && (
                        <Text style={styles.placeAddress}>{safeText(item.dest.formatted_address)}</Text>
                      )}

                      {item.dest.place_id && (
                        <Link
                          src={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(safeText(item.dest.name, 'place'))}&query_place_id=${item.dest.place_id}`}
                          style={styles.mapLink}
                        >
                          {language === 'th' ? 'ดูใน Google Maps' : 'View on Google Maps'}
                        </Link>
                      )}
                    </View>
                  </View>
                  ));
                })()
              )}

              {/* Daily Summary */}
              {destinations.length > 0 && (() => {
                const summary = calculateDailySummary(destinations);
                return (
                  <View style={styles.daySummary}>
                    <Text style={styles.daySummaryTitle}>
                      {language === 'th' ? 'สรุปวันนี้' : 'Daily Summary'}
                    </Text>
                    <View style={styles.daySummaryRow}>
                      <Text style={styles.daySummaryLabel}>
                        {language === 'th' ? 'จำนวนสถานที่' : 'Places'}
                      </Text>
                      <Text style={styles.daySummaryValue}>
                        {summary.placesCount} {language === 'th' ? 'แห่ง' : 'spots'}
                      </Text>
                    </View>
                    {summary.totalCost > 0 && (
                      <View style={styles.daySummaryRow}>
                        <Text style={styles.daySummaryLabel}>
                          {language === 'th' ? 'งบประมาณวันนี้' : 'Daily budget'}
                        </Text>
                        <Text style={styles.daySummaryValue}>
                          {formatCurrency(summary.totalCost)}
                        </Text>
                      </View>
                    )}
                    {summary.totalDuration > 0 && (
                      <View style={styles.daySummaryRow}>
                        <Text style={styles.daySummaryLabel}>
                          {language === 'th' ? 'เวลาทั้งหมด' : 'Total time'}
                        </Text>
                        <Text style={styles.daySummaryValue}>
                          {Math.round(summary.totalDuration / 60 * 10) / 10} {language === 'th' ? 'ชั่วโมง' : 'hours'}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}
            </View>
          );
        })}

        {/* Page Footer with Page Number */}
        <View style={styles.pageFooter} fixed>
          <Text style={styles.pageFooterLeft}>Tripster AI</Text>
          <Text style={styles.pageFooterCenter}>
            {safeText(language === 'th' ? trip.title : (trip.title_en || trip.title), 'Trip')}
          </Text>
          <Text 
            style={styles.pageFooterRight}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};

// Export functions
export const pdfExportService = {
  // Generate QR Code as data URL
  async generateQRCode(url: string): Promise<string | null> {
    try {
      return await QRCode.toDataURL(url, {
        width: 200,
        margin: 1,
        color: {
          dark: '#1e293b',
          light: '#ffffff'
        }
      });
    } catch (error) {
      console.error('QR Code generation error:', error);
      return null;
    }
  },

  // Generate and download PDF
  async downloadPDF(trip: Trip, language: 'th' | 'en' = 'th', options?: ExportOptions): Promise<void> {
    try {
      // Generate QR Code if shareUrl is provided
      let finalOptions = { ...options };
      if (options?.shareUrl) {
        const qrCodeDataUrl = await this.generateQRCode(options.shareUrl);
        if (qrCodeDataUrl) {
          finalOptions.qrCodeDataUrl = qrCodeDataUrl;
        }
      }

      const blob = await pdf(<TripPDFDocument trip={trip} language={language} options={finalOptions} />).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = (language === 'en' && trip.title_en ? trip.title_en : trip.title)
        .replace(/[^a-zA-Z0-9ก-๙\s]/g, '')
        .replace(/\s+/g, '_');
      link.download = `${fileName}_itinerary.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  },

  // Generate PDF Blob (for preview or upload)
  async generateBlob(trip: Trip, language: 'th' | 'en' = 'th', options?: ExportOptions): Promise<Blob> {
    return await pdf(<TripPDFDocument trip={trip} language={language} options={options} />).toBlob();
  },
};

export default pdfExportService;
