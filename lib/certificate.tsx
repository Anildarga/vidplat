import { Document, Page, Text, View, StyleSheet, Font, Svg, Path, Line } from '@react-pdf/renderer';

// Register fonts if needed (Helvetica, Times are built-in)

interface CertificateData {
  studentName: string;
  courseName: string;
  certificateNumber: string;
  issuedDate: Date;
  instructorName: string;
}

// Colors from Python code
const GOLD = '#c8a84b';
const GOLD_LIGHT = '#e8d48a';
const NAVY = '#1a3a6b';
const DARK_BROWN = '#2c2410';
const MID_BROWN = '#6b5a2a';
const LIGHT_BROWN = '#8a7340';
const CREAM = '#fdfaf5';
const WHITE = '#ffffff';

// Page dimensions for landscape A4 (842 x 595 points)
const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;

const styles = StyleSheet.create({
  page: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: CREAM,
    position: 'relative',
    padding: 0,
  },
  // Outer border
  outerBorder: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: PAGE_WIDTH - 24,
    height: PAGE_HEIGHT - 24,
    borderWidth: 2.5,
    borderColor: GOLD,
    borderStyle: 'solid',
  },
  // Inner border
  innerBorder: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: PAGE_WIDTH - 40,
    height: PAGE_HEIGHT - 40,
    borderWidth: 0.8,
    borderColor: GOLD,
    borderStyle: 'solid',
  },
  // Corner squares
  cornerSquare: {
    position: 'absolute',
    width: 18,
    height: 18,
    backgroundColor: GOLD,
  },
  // Dashed lines
  dashedLineTop: {
    position: 'absolute',
    top: 12,
    left: 40,
    width: PAGE_WIDTH - 80,
    height: 0.5,
    borderTopWidth: 0.5,
    borderTopColor: GOLD,
    borderTopStyle: 'dashed',
    borderDashArray: [4, 3],
  },
  dashedLineBottom: {
    position: 'absolute',
    bottom: 12,
    left: 40,
    width: PAGE_WIDTH - 80,
    height: 0.5,
    borderTopWidth: 0.5,
    borderTopColor: GOLD,
    borderTopStyle: 'dashed',
    borderDashArray: [4, 3],
  },
  dashedLineLeft: {
    position: 'absolute',
    left: 12,
    top: 40,
    height: PAGE_HEIGHT - 80,
    width: 0.5,
    borderLeftWidth: 0.5,
    borderLeftColor: GOLD,
    borderLeftStyle: 'dashed',
    borderDashArray: [4, 3],
  },
  dashedLineRight: {
    position: 'absolute',
    right: 12,
    top: 40,
    height: PAGE_HEIGHT - 80,
    width: 0.5,
    borderRightWidth: 0.5,
    borderRightColor: GOLD,
    borderRightStyle: 'dashed',
    borderDashArray: [4, 3],
  },
  // Star at top center
  starContainer: {
    position: 'absolute',
    top: 40,
    left: PAGE_WIDTH / 2 - 14,
    width: 28,
    height: 28,
  },
  // EDUPLAT text
  eduplatText: {
    position: 'absolute',
    top: 70,
    left: 0,
    width: PAGE_WIDTH,
    textAlign: 'center',
    fontSize: 8,
    color: LIGHT_BROWN,
    fontFamily: 'Helvetica',
  },
  // Title
  title: {
    position: 'absolute',
    top: 90,
    left: 0,
    width: PAGE_WIDTH,
    textAlign: 'center',
    fontSize: 26,
    color: DARK_BROWN,
    fontFamily: 'Times-Bold',
  },
  // Decorative line with circle
  decorativeLineLeft: {
    position: 'absolute',
    top: 130,
    left: 160,
    width: 130,
    height: 0.8,
    backgroundColor: GOLD,
  },
  decorativeCircle: {
    position: 'absolute',
    top: 127,
    left: PAGE_WIDTH / 2 - 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
  },
  decorativeLineRight: {
    position: 'absolute',
    top: 130,
    left: PAGE_WIDTH / 2 + 10,
    width: PAGE_WIDTH - 160 - (PAGE_WIDTH / 2 + 10),
    height: 0.8,
    backgroundColor: GOLD,
  },
  // Presented to text
  presentedTo: {
    position: 'absolute',
    top: 160,
    left: 0,
    width: PAGE_WIDTH,
    textAlign: 'center',
    fontSize: 13,
    color: MID_BROWN,
    fontFamily: 'Times-Italic',
  },
  // Student name
  studentName: {
    position: 'absolute',
    top: 190,
    left: 0,
    width: PAGE_WIDTH,
    textAlign: 'center',
    fontSize: 36,
    color: NAVY,
    fontFamily: 'Times-Bold',
  },
  studentNameUnderline: {
    position: 'absolute',
    top: 232,
    left: 200,
    width: PAGE_WIDTH - 400,
    height: 1.2,
    backgroundColor: NAVY,
  },
  // For completing text
  forCompleting: {
    position: 'absolute',
    top: 250,
    left: 0,
    width: PAGE_WIDTH,
    textAlign: 'center',
    fontSize: 12,
    color: MID_BROWN,
    fontFamily: 'Times-Italic',
  },
  // Course name box
  courseNameBox: {
    position: 'absolute',
    top: 280,
    left: 110,
    width: PAGE_WIDTH - 220,
    height: 40,
    backgroundColor: NAVY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseNameText: {
    fontSize: 17,
    color: WHITE,
    fontFamily: 'Times-Bold',
    textAlign: 'center',
  },
  // Achievement text
  achievementText1: {
    position: 'absolute',
    top: 340,
    left: 0,
    width: PAGE_WIDTH,
    textAlign: 'center',
    fontSize: 10.5,
    color: MID_BROWN,
    fontFamily: 'Times-Roman',
  },
  achievementText2: {
    position: 'absolute',
    top: 355,
    left: 0,
    width: PAGE_WIDTH,
    textAlign: 'center',
    fontSize: 10.5,
    color: MID_BROWN,
    fontFamily: 'Times-Roman',
  },
  // Divider line with circle
  dividerLineLeft: {
    position: 'absolute',
    top: 380,
    left: 50,
    width: PAGE_WIDTH / 2 - 62,
    height: 0.5,
    backgroundColor: GOLD,
  },
  dividerCircle: {
    position: 'absolute',
    top: 377.5,
    left: PAGE_WIDTH / 2 - 2.5,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: GOLD,
  },
  dividerLineRight: {
    position: 'absolute',
    top: 380,
    left: PAGE_WIDTH / 2 + 12,
    width: PAGE_WIDTH - 50 - (PAGE_WIDTH / 2 + 12),
    height: 0.5,
    backgroundColor: GOLD,
  },
  // Seal (left side)
  sealOuterCircle: {
    position: 'absolute',
    top: 420,
    left: 80,
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: GOLD,
    backgroundColor: CREAM,
  },
  sealInnerCircle: {
    position: 'absolute',
    top: 424,
    left: 86,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 0.5,
    borderColor: GOLD,
  },
  sealStarContainer: {
    position: 'absolute',
    top: 430,
    left: 96,
    width: 36,
    height: 36,
  },
  sealVerifiedText: {
    position: 'absolute',
    top: 470,
    left: 80,
    width: 68,
    textAlign: 'center',
    fontSize: 6,
    color: LIGHT_BROWN,
    fontFamily: 'Helvetica',
  },
  // Certificate number label
  certNumberLabel: {
    position: 'absolute',
    top: 420,
    left: PAGE_WIDTH / 2 - 150,
    width: 300,
    textAlign: 'center',
    fontSize: 8,
    color: LIGHT_BROWN,
    fontFamily: 'Helvetica',
  },
  certNumberValue: {
    position: 'absolute',
    top: 435,
    left: PAGE_WIDTH / 2 - 150,
    width: 300,
    textAlign: 'center',
    fontSize: 13,
    color: DARK_BROWN,
    fontFamily: 'Helvetica-Bold',
  },
  // Date issued label
  dateLabel: {
    position: 'absolute',
    top: 460,
    left: PAGE_WIDTH / 2 - 150,
    width: 300,
    textAlign: 'center',
    fontSize: 8,
    color: LIGHT_BROWN,
    fontFamily: 'Helvetica',
  },
  dateValue: {
    position: 'absolute',
    top: 475,
    left: PAGE_WIDTH / 2 - 150,
    width: 300,
    textAlign: 'center',
    fontSize: 12,
    color: DARK_BROWN,
    fontFamily: 'Times-Roman',
  },
  // Signature section (right side)
  signatureLine: {
    position: 'absolute',
    top: 420,
    left: PAGE_WIDTH - 240,
    width: 160,
    height: 0.8,
    backgroundColor: DARK_BROWN,
  },
  signatureInstructor: {
    position: 'absolute',
    top: 406,
    left: PAGE_WIDTH - 240,
    width: 160,
    textAlign: 'center',
    fontSize: 11,
    color: MID_BROWN,
    fontFamily: 'Times-Italic',
  },
  signatureLabel: {
    position: 'absolute',
    top: 394,
    left: PAGE_WIDTH - 240,
    width: 160,
    textAlign: 'center',
    fontSize: 8,
    color: LIGHT_BROWN,
    fontFamily: 'Helvetica',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 0,
    width: PAGE_WIDTH,
    textAlign: 'center',
    fontSize: 8,
    color: GOLD,
    fontFamily: 'Helvetica',
  },
});

// Star path data for top star (5-point)
const StarPath = () => (
  <Svg width="28" height="28" viewBox="0 0 28 28">
    <Path
      d="M14 0 L17.2 9.8 L27 9.8 L19.4 15.8 L22.6 25.6 L14 19.6 L5.4 25.6 L8.6 15.8 L1 9.8 L10.8 9.8 Z"
      fill={GOLD}
    />
  </Svg>
);

// Star path for seal (smaller)
const SealStarPath = () => (
  <Svg width="36" height="36" viewBox="0 0 36 36">
    <Path
      d="M18 0 L22.2 12.6 L35 12.6 L24.8 20.4 L29 33 L18 25.2 L7 33 L11.2 20.4 L1 12.6 L13.8 12.6 Z"
      fill={GOLD}
    />
  </Svg>
);

/**
 * Generate a professional course completion certificate as a PDF matching Python design
 */
export async function generateCertificatePDF(data: CertificateData): Promise<Uint8Array> {
  const { studentName, courseName, certificateNumber, issuedDate, instructorName } = data;

  const formattedDate = issuedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const doc = (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Background is CREAM by page style */}

        {/* Outer border */}
        <View style={styles.outerBorder} />
        <View style={styles.innerBorder} />

        {/* Corner squares */}
        <View style={[styles.cornerSquare, { top: 12, left: 12 }]} />
        <View style={[styles.cornerSquare, { top: 12, right: 12 }]} />
        <View style={[styles.cornerSquare, { bottom: 12, left: 12 }]} />
        <View style={[styles.cornerSquare, { bottom: 12, right: 12 }]} />

        {/* Dashed lines */}
        <View style={styles.dashedLineTop} />
        <View style={styles.dashedLineBottom} />
        <View style={styles.dashedLineLeft} />
        <View style={styles.dashedLineRight} />

        {/* Star at top center */}
        <View style={styles.starContainer}>
          <StarPath />
        </View>

        {/* EDUPLAT text */}
        <Text style={styles.eduplatText}>E D U P L A T</Text>

        {/* Title */}
        <Text style={styles.title}>Certificate of Completion</Text>

        {/* Decorative line with circle */}
        <View style={styles.decorativeLineLeft} />
        <View style={styles.decorativeCircle} />
        <View style={styles.decorativeLineRight} />

        {/* Presented to text */}
        <Text style={styles.presentedTo}>This certificate is proudly presented to</Text>

        {/* Student name */}
        <Text style={styles.studentName}>{studentName.toUpperCase()}</Text>
        <View style={styles.studentNameUnderline} />

        {/* For completing text */}
        <Text style={styles.forCompleting}>for successfully completing the course</Text>

        {/* Course name box */}
        <View style={styles.courseNameBox}>
          <Text style={styles.courseNameText}>{courseName}</Text>
        </View>

        {/* Achievement text */}
        <Text style={styles.achievementText1}>
          Having demonstrated the knowledge and skills required to successfully complete this course,
        </Text>
        <Text style={styles.achievementText2}>
          we hereby award this certificate as recognition of achievement.
        </Text>

        {/* Divider line with circle */}
        <View style={styles.dividerLineLeft} />
        <View style={styles.dividerCircle} />
        <View style={styles.dividerLineRight} />

        {/* Seal (left) */}
        <View style={styles.sealOuterCircle} />
        <View style={styles.sealInnerCircle} />
        <View style={styles.sealStarContainer}>
          <SealStarPath />
        </View>
        <Text style={styles.sealVerifiedText}>V E R I F I E D</Text>

        {/* Certificate number */}
        <Text style={styles.certNumberLabel}>C E R T I F I C A T E  N U M B E R</Text>
        <Text style={styles.certNumberValue}>{certificateNumber}</Text>

        {/* Date issued */}
        <Text style={styles.dateLabel}>D A T E  I S S U E D</Text>
        <Text style={styles.dateValue}>{formattedDate}</Text>

        {/* Signature section (right) */}
        <View style={styles.signatureLine} />
        <Text style={styles.signatureInstructor}>{instructorName}</Text>
        <Text style={styles.signatureLabel}>I N S T R U C T O R  S I G N A T U R E</Text>

        {/* Footer */}
        <Text style={styles.footer}>
          {'✦  ✦  ✦   EDUPLAT  ·  LEARN WITHOUT LIMITS   ✦  ✦  ✦'}
        </Text>
      </Page>
    </Document>
  );

  const { pdf } = await import('@react-pdf/renderer');
  const blob = await pdf(doc).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Generate a unique certificate number
 * Format: CERT-YEAR-RANDOMSTRING
 */
export function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const randomString = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `CERT-${year}-${randomString}`;
}
