// PDF Export Service - Modern Travel Journal Design
import { Document, Page, Text, View, StyleSheet, Font, Link, pdf } from '@react-pdf/renderer';
import { Trip, Destination } from '@/types/database';

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
    marginBottom: 0,
  },
  timeColumn: {
    width: 55,
    paddingRight: 10,
    alignItems: 'flex-end',
    borderRightWidth: 2,
    borderRightColor: '#e2e8f0',
    paddingBottom: 20,
  },
  timeColumnLast: {
    width: 55,
    paddingRight: 10,
    alignItems: 'flex-end',
    paddingBottom: 20,
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
  
  // Page Footer
  pageFooter: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: '#cbd5e1',
  },
});

// Helper Functions
const formatCurrency = (amount?: number | null) =>
  amount ? `฿${amount.toLocaleString()}` : '';

const getPlaceTypeLabel = (types: string[] = [], lang: string) => {
  if (types.includes('restaurant') || types.includes('food')) return lang === 'th' ? '🍽️ อาหาร' : '🍽️ Food';
  if (types.includes('lodging') || types.includes('hotel')) return lang === 'th' ? '🏨 ที่พัก' : '🏨 Hotel';
  if (types.includes('shopping') || types.includes('store')) return lang === 'th' ? '🛍️ ช้อปปิ้ง' : '🛍️ Shopping';
  if (types.includes('park') || types.includes('natural_feature')) return lang === 'th' ? '🌳 ธรรมชาติ' : '🌳 Nature';
  if (types.includes('museum') || types.includes('art_gallery')) return lang === 'th' ? '🏛️ พิพิธภัณฑ์' : '🏛️ Museum';
  if (types.includes('place_of_worship') || types.includes('temple')) return lang === 'th' ? '⛩️ วัด/ศาสนสถาน' : '⛩️ Temple';
  return lang === 'th' ? '📍 ท่องเที่ยว' : '📍 Attraction';
};

const getDayDate = (startDate: string, dayNumber: number, locale: string) => {
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNumber - 1);
  return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
};

const getTimeSlot = (index: number) => {
  const hour = 9 + (index * 2);
  return `${String(hour).padStart(2, '0')}:00`;
};

interface PDFDocumentProps {
  trip: Trip;
  language: 'th' | 'en';
}

// Main PDF Document Component
export const TripPDFDocument = ({ trip, language = 'th' }: PDFDocumentProps) => {
  const locale = language === 'th' ? 'th-TH' : 'en-US';

  // Calculate trip duration
  const tripDays = Math.ceil(
    (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  // Group destinations by day
  const destinationsByDay: Record<number, Destination[]> = {};
  (trip.destinations || []).forEach(dest => {
    const day = dest.visit_date || 1;
    if (!destinationsByDay[day]) destinationsByDay[day] = [];
    destinationsByDay[day].push(dest);
  });

  // Sort destinations by order_index
  Object.values(destinationsByDay).forEach(dests => {
    dests.sort((a, b) => ((a as any).order_index || 0) - ((b as any).order_index || 0));
  });

  // Get top destinations for highlights
  const allDestinations = trip.destinations || [];
  const topDestinations = allDestinations.slice(0, 5);

  return (
    <Document>
      {/* ============ Page 1: Cover ============ */}
      <Page size="A4" style={styles.page}>
        {/* Hero Section */}
        <View style={styles.coverImageContainer}>
          <View style={styles.coverGradient}>
            <Text style={styles.coverIcon}>✈️</Text>
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
            {language === 'en' && trip.description_en 
              ? trip.description_en 
              : (trip.description || (language === 'th' ? 'แผนการเดินทางที่วางไว้อย่างพิถีพิถัน' : 'A carefully planned journey'))}
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
                {language === 'th' ? '✨ ไฮไลท์สถานที่' : '✨ HIGHLIGHTS'}
              </Text>
              {topDestinations.map((dest, i) => (
                <View key={i} style={styles.highlightItem}>
                  <View style={styles.highlightDot} />
                  <Text style={styles.highlightText}>
                    {language === 'en' && dest.name_en ? dest.name_en : dest.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {language === 'th' ? 'สร้างเมื่อ' : 'Generated on'} {new Date().toLocaleDateString(locale)}
          </Text>
          <Text style={styles.footerBrand}>Tripster AI ✈️</Text>
        </View>
      </Page>

      {/* ============ Page 2+: Itinerary ============ */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.itineraryHeader}>
          <Text style={styles.itineraryTitle}>
            📋 {language === 'th' ? 'กำหนดการเดินทาง' : 'Itinerary'}
          </Text>
        </View>

        {/* Days */}
        {Array.from({ length: tripDays }, (_, i) => i + 1).map(day => {
          const destinations = destinationsByDay[day] || [];
          
          return (
            <View key={day} style={styles.daySection} wrap={false}>
              {/* Day Header */}
              <View style={styles.dayHeader}>
                <Text style={styles.dayBadge}>
                  {language === 'th' ? `วันที่ ${String(day)}` : `Day ${String(day)}`}
                </Text>
                <Text style={styles.dayDate}>
                  {getDayDate(trip.start_date, day, locale)}
                </Text>
              </View>

              {/* Timeline Items */}
              {destinations.length === 0 ? (
                <Text style={styles.emptyDay}>
                  {language === 'th' ? '— ยังไม่มีกำหนดการ —' : '— No plans yet —'}
                </Text>
              ) : (
                destinations.map((dest, idx) => (
                  <View key={dest.id} style={styles.timelineItem} wrap={false}>
                    {/* Time Column */}
                    <View style={idx === destinations.length - 1 ? styles.timeColumnLast : styles.timeColumn}>
                      <Text style={styles.timeText}>{getTimeSlot(idx)}</Text>
                    </View>

                    {/* Dot */}
                    <View style={styles.dotContainer}>
                      <View style={styles.dot} />
                    </View>

                    {/* Content */}
                    <View style={styles.contentColumn}>
                      <Text style={styles.placeTitle}>
                        {language === 'en' && dest.name_en ? dest.name_en : dest.name}
                      </Text>

                      <View style={styles.placeMeta}>
                        <Text style={styles.badge}>
                          {getPlaceTypeLabel(dest.place_types || [], language)}
                        </Text>
                        {dest.rating != null && dest.rating > 0 && (
                          <Text style={styles.badgeRating}>⭐ {String(dest.rating.toFixed(1))}</Text>
                        )}
                        {dest.estimated_cost != null && dest.estimated_cost > 0 && (
                          <Text style={styles.badgeCost}>{formatCurrency(dest.estimated_cost)}</Text>
                        )}
                      </View>

                      {dest.formatted_address && (
                        <Text style={styles.placeAddress}>📍 {dest.formatted_address}</Text>
                      )}

                      {dest.place_id && (
                        <Link
                          src={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest.name)}&query_place_id=${dest.place_id}`}
                          style={styles.mapLink}
                        >
                          🗺️ {language === 'th' ? 'ดูใน Google Maps' : 'View on Google Maps'}
                        </Link>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          );
        })}

        {/* Page Footer */}
        <Text style={styles.pageFooter} fixed>
          Tripster AI Travel Planner • {language === 'th' ? trip.title : (trip.title_en || trip.title)}
        </Text>
      </Page>
    </Document>
  );
};

// Export functions
export const pdfExportService = {
  // Generate and download PDF
  async downloadPDF(trip: Trip, language: 'th' | 'en' = 'th'): Promise<void> {
    try {
      const blob = await pdf(<TripPDFDocument trip={trip} language={language} />).toBlob();

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
  async generateBlob(trip: Trip, language: 'th' | 'en' = 'th'): Promise<Blob> {
    return await pdf(<TripPDFDocument trip={trip} language={language} />).toBlob();
  },
};

export default pdfExportService;
