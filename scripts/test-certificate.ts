import { generateCertificatePDF, generateCertificateNumber } from '../lib/certificate';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('Generating test certificate...');
  
  const data = {
    studentName: 'ANIL T1',
    courseName: 'Introduction to Web Development',
    certificateNumber: generateCertificateNumber(),
    issuedDate: new Date('2026-04-15'),
    instructorName: 'EduPlat Team',
  };

  console.log('Certificate data:', data);

  try {
    const pdfBuffer = await generateCertificatePDF(data);
    const outputPath = join(__dirname, 'test-certificate.pdf');
    writeFileSync(outputPath, pdfBuffer);
    console.log(`Certificate saved to ${outputPath}`);
  } catch (error) {
    console.error('Error generating certificate:', error);
    process.exit(1);
  }
}

main();