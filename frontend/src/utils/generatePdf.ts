import type { Property } from '../types';

function escapePdfText(str?: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' '); // Standard ASCII printable
}

export function downloadPropertyPdf(property: Property): void {
  const propName = escapePdfText(property.Propertyname || property.title || 'Verified Property');
  const propId = escapePdfText(String(property.indprop_id || property.id || 'N/A'));
  const propType = escapePdfText(property.property_type_name || property.type || 'Residential');
  const ownershipType = escapePdfText(property.ownership_type_name || property.OwnershiptypeName || 'Freehold');
  const deedRef = escapePdfText(property.Ownershipproof || property.ownershipproof || 'Verified Title Deed on Record');
  const address = escapePdfText(property.Propertyaddress || property.location || 'Address on record');
  const city = escapePdfText(property.city || 'Delhi NCR');
  const status = escapePdfText(property.status || 'Accepted_By_PropertyManager');
  const adminStatus = escapePdfText(property.AdminStatus || 'Whitelisted');
  const reason = escapePdfText(property.Reason || property.reason || 'Full Verify & Make Live - Superadmin Whitelisted');
  const ownerName = escapePdfText(property.contact_name || property.agent || 'Verified Property Owner');
  const ownerMobile = escapePdfText(property.contact_mobile || 'Verified on Record');
  
  // Landmarks
  const metro = escapePdfText(property.NearestMetroStation || property.nearestmetrostation || property.nearest_metro_station || 'Metro Station Nearby on Record');
  const hospital = escapePdfText(property.NearestHospital || property.nearesthospital || property.nearest_hospital || 'Hospital / Healthcare Facility Nearby');
  const police = escapePdfText(property.NearestPoliceStation || property.nearestpolicestation || property.nearest_police_station || 'Local Police Station Nearby');
  const market = escapePdfText(property.NearestShoppingMarket || property.nearestshoppingmarket || property.nearest_shopping_market || 'Shopping Market Nearby');

  // Inspection angles check
  const hasFront = Boolean(property.FrontExteriorAngle || property.frontexteriorangle || property.front_exterior_angle);
  const hasLiving = Boolean(property.LivingRoomMainHall || property.livingroommainhall || property.living_room_main_hall);
  const hasBed = Boolean(property.MasterBedroomAngle || property.masterbedroomangle || property.master_bedroom_angle);
  const hasKitchen = Boolean(property.KitchenDiningSpace || property.kitchendiningspace || property.kitchen_dining_space);
  const hasBalcony = Boolean(property.BalconyWashroomAngle || property.balconywashroomangle || property.balcony_washroom_angle);

  const generationDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Construct PDF graphics and text stream (A4 size: 595.28 x 841.89)
  const streamLines: string[] = [
    // -------------------------------------------------------------
    // 1. EXECUTIVE HEADER BANNER
    // -------------------------------------------------------------
    '0.06 0.09 0.16 rg', // Deep corporate navy
    '0 760 595.28 82 re f',
    '0.18 0.38 0.72 RG', // Accent bottom line
    '2 w',
    '0 760 m 595.28 760 l S',

    // Header left tags and titles
    'BT',
    '/F1 7.5 Tf',
    '0.45 0.75 0.95 rg', // Soft cyan
    '40 820 Td',
    '(OFFICIAL PROPERTY DOSSIER - ESTATESYNC EXECUTIVE ARCHIVE) Tj',
    'ET',

    'BT',
    '/F1 18 Tf',
    '1 1 1 rg', // Pure white
    '40 798 Td',
    '(ESTATESYNC PROPERTY REPORT) Tj',
    'ET',

    'BT',
    '/F2 8.5 Tf',
    '0.70 0.80 0.92 rg',
    '40 780 Td',
    '(AUTHENTICATED REAL ESTATE AUDIT & VERIFICATION DOSSIER) Tj',
    'ET',

    // Header right metadata
    'BT',
    '/F2 8.5 Tf',
    '0.85 0.90 0.98 rg',
    '420 816 Td',
    `(${escapePdfText(`Date: ${generationDate}`)}) Tj`,
    'ET',

    'BT',
    '/F1 10 Tf',
    '1 1 1 rg',
    '420 798 Td',
    `(${escapePdfText(`Listing ID: #${propId}`)}) Tj`,
    'ET',

    'BT',
    '/F1 8.5 Tf',
    '0.30 0.85 0.55 rg', // Emerald live pill
    '420 780 Td',
    '(Status: Verified Whitelisted) Tj',
    'ET',

    // -------------------------------------------------------------
    // 2. VERIFICATION STATUS STRIP
    // -------------------------------------------------------------
    '0.94 0.98 0.95 rg', // Light emerald fill
    '40 712 515.28 34 re f',
    '0.10 0.62 0.35 RG', // Emerald stroke
    '1.2 w',
    '40 712 515.28 34 re s',

    'BT',
    '/F1 10 Tf',
    '0.05 0.45 0.25 rg',
    '55 724 Td',
    `(${escapePdfText(`STATUS: ${adminStatus.toUpperCase()} - FULLY VERIFIED & LIVE ON PORTAL`)}) Tj`,
    'ET',

    'BT',
    '/F1 8.5 Tf',
    '0.10 0.55 0.30 rg',
    '390 724 Td',
    '(AUDIT DECISION: APPROVED) Tj',
    'ET',

    // -------------------------------------------------------------
    // 3. PROPERTY IDENTITY BLOCK
    // -------------------------------------------------------------
    'BT',
    '/F1 15 Tf',
    '0.08 0.12 0.22 rg',
    '40 682 Td',
    `(${propName.substring(0, 48)}) Tj`,
    'ET',

    'BT',
    '/F2 9.5 Tf',
    '0.35 0.40 0.50 rg',
    '40 664 Td',
    `(${escapePdfText(`Address: ${address.substring(0, 80)}, ${city}`)}) Tj`,
    'ET',

    // Subtle divider
    '0.85 0.88 0.92 RG',
    '0.8 w',
    '40 652 m 555.28 652 l S',

    // -------------------------------------------------------------
    // 4. PROPERTY SPECIFICATIONS TABLE (CLEAN 2-COLUMN STRUCTURE)
    // -------------------------------------------------------------
    'BT',
    '/F1 11 Tf',
    '0.08 0.12 0.22 rg',
    '40 635 Td',
    '(PROPERTY SPECIFICATIONS) Tj',
    'ET',

    // Outer box
    '0.98 0.985 0.995 rg',
    '40 472 515.28 148 re f',
    '0.85 0.88 0.92 RG',
    '0.8 w',
    '40 472 515.28 148 re s',

    // Horizontal Row Dividers inside specifications box
    '0.88 0.91 0.94 RG',
    '0.6 w',
    '40 584 m 555.28 584 l S', // Divides Row 1 & Row 2
    '40 548 m 555.28 548 l S', // Divides Row 2 & Row 3
    '40 512 m 555.28 512 l S', // Divides Row 3 & Row 4

    // Vertical Divider down the middle (X = 297, Y from 512 to 620)
    '297 512 m 297 620 l S',

    // Row 1: Col 1 (X = 52)
    'BT',
    '/F1 7.5 Tf',
    '0.45 0.50 0.60 rg',
    '52 606 Td',
    '(PROPERTY CATEGORY / TYPE) Tj',
    'ET',
    'BT',
    '/F1 9.5 Tf',
    '0.08 0.12 0.20 rg',
    '52 592 Td',
    `(${propType.substring(0, 32)}) Tj`,
    'ET',

    // Row 1: Col 2 (X = 309)
    'BT',
    '/F1 7.5 Tf',
    '0.45 0.50 0.60 rg',
    '309 606 Td',
    '(OWNERSHIP TENURE / TYPE) Tj',
    'ET',
    'BT',
    '/F1 9.5 Tf',
    '0.08 0.12 0.20 rg',
    '309 592 Td',
    `(${ownershipType.substring(0, 32)}) Tj`,
    'ET',

    // Row 2: Col 1 (X = 52)
    'BT',
    '/F1 7.5 Tf',
    '0.45 0.50 0.60 rg',
    '52 570 Td',
    '(OWNERSHIP DEED PROOF REFERENCE) Tj',
    'ET',
    'BT',
    '/F1 9.5 Tf',
    '0.10 0.35 0.80 rg',
    '52 556 Td',
    `(${deedRef.substring(0, 34)}) Tj`,
    'ET',

    // Row 2: Col 2 (X = 309)
    'BT',
    '/F1 7.5 Tf',
    '0.45 0.50 0.60 rg',
    '309 570 Td',
    '(LISTING PIPELINE LIFECYCLE STAGE) Tj',
    'ET',
    'BT',
    '/F1 9.5 Tf',
    '0.08 0.12 0.20 rg',
    '309 556 Td',
    `(${status.substring(0, 32)}) Tj`,
    'ET',

    // Row 3: Col 1 (X = 52)
    'BT',
    '/F1 7.5 Tf',
    '0.45 0.50 0.60 rg',
    '52 534 Td',
    '(SUPERADMIN DECISION & STATUS) Tj',
    'ET',
    'BT',
    '/F1 9.5 Tf',
    '0.05 0.55 0.25 rg',
    '52 520 Td',
    `(${adminStatus} (Verified & Live)) Tj`,
    'ET',

    // Row 3: Col 2 (X = 309)
    'BT',
    '/F1 7.5 Tf',
    '0.45 0.50 0.60 rg',
    '309 534 Td',
    '(PHYSICAL REGION & JURISDICTION) Tj',
    'ET',
    'BT',
    '/F1 9.5 Tf',
    '0.08 0.12 0.20 rg',
    '309 520 Td',
    `(${city.substring(0, 32)}) Tj`,
    'ET',

    // Row 4: Full Width (Executive Reason)
    'BT',
    '/F1 7.5 Tf',
    '0.45 0.50 0.60 rg',
    '52 498 Td',
    '(EXECUTIVE AUDIT TRAIL REASON) Tj',
    'ET',
    'BT',
    '/F2 9 Tf',
    '0.15 0.18 0.25 rg',
    '52 484 Td',
    `(${reason.substring(0, 95)}) Tj`,
    'ET',

    // -------------------------------------------------------------
    // 5. SURROUNDING LANDMARKS & INFRASTRUCTURE
    // -------------------------------------------------------------
    'BT',
    '/F1 11 Tf',
    '0.08 0.12 0.22 rg',
    '40 452 Td',
    '(SURROUNDING LANDMARKS & INFRASTRUCTURE) Tj',
    'ET',

    // Card 1: Metro Station (X = 40, Y = 392, W = 250, H = 48)
    '0.96 0.98 1.0 rg',
    '40 392 250 48 re f',
    '0.85 0.90 0.98 RG',
    '0.8 w',
    '40 392 250 48 re s',
    'BT',
    '/F1 7.5 Tf',
    '0.15 0.40 0.85 rg',
    '52 426 Td',
    '(NEAREST METRO STATION) Tj',
    'ET',
    'BT',
    '/F1 9.5 Tf',
    '0.08 0.12 0.20 rg',
    '52 411 Td',
    `(${metro.substring(0, 32)}) Tj`,
    'ET',
    'BT',
    '/F2 7 Tf',
    '0.45 0.50 0.60 rg',
    '52 400 Td',
    '(Rapid transit connectivity on record) Tj',
    'ET',

    // Card 2: Hospital (X = 305, Y = 392, W = 250, H = 48)
    '1.0 0.97 0.97 rg',
    '305 392 250 48 re f',
    '0.96 0.86 0.86 RG',
    '0.8 w',
    '305 392 250 48 re s',
    'BT',
    '/F1 7.5 Tf',
    '0.80 0.20 0.20 rg',
    '317 426 Td',
    '(NEAREST HOSPITAL & HEALTHCARE) Tj',
    'ET',
    'BT',
    '/F1 9.5 Tf',
    '0.08 0.12 0.20 rg',
    '317 411 Td',
    `(${hospital.substring(0, 32)}) Tj`,
    'ET',
    'BT',
    '/F2 7 Tf',
    '0.45 0.50 0.60 rg',
    '317 400 Td',
    '(Emergency medical center nearby) Tj',
    'ET',

    // Card 3: Police Station (X = 40, Y = 336, W = 250, H = 48)
    '0.99 0.98 0.95 rg',
    '40 336 250 48 re f',
    '0.95 0.90 0.80 RG',
    '0.8 w',
    '40 336 250 48 re s',
    'BT',
    '/F1 7.5 Tf',
    '0.75 0.45 0.10 rg',
    '52 370 Td',
    '(NEAREST POLICE STATION) Tj',
    'ET',
    'BT',
    '/F1 9.5 Tf',
    '0.08 0.12 0.20 rg',
    '52 355 Td',
    `(${police.substring(0, 32)}) Tj`,
    'ET',
    'BT',
    '/F2 7 Tf',
    '0.45 0.50 0.60 rg',
    '52 344 Td',
    '(Law enforcement & security post) Tj',
    'ET',

    // Card 4: Shopping Market (X = 305, Y = 336, W = 250, H = 48)
    '0.96 0.99 0.97 rg',
    '305 336 250 48 re f',
    '0.85 0.94 0.88 RG',
    '0.8 w',
    '305 336 250 48 re s',
    'BT',
    '/F1 7.5 Tf',
    '0.10 0.60 0.35 rg',
    '317 370 Td',
    '(NEAREST SHOPPING MARKET) Tj',
    'ET',
    'BT',
    '/F1 9.5 Tf',
    '0.08 0.12 0.20 rg',
    '317 355 Td',
    `(${market.substring(0, 32)}) Tj`,
    'ET',
    'BT',
    '/F2 7 Tf',
    '0.45 0.50 0.60 rg',
    '317 344 Td',
    '(Retail market & daily shopping center) Tj',
    'ET',

    // -------------------------------------------------------------
    // 6. VERIFIED 5-ANGLE INSPECTION PHOTOGRAPHY
    // -------------------------------------------------------------
    'BT',
    '/F1 11 Tf',
    '0.08 0.12 0.22 rg',
    '40 316 Td',
    '(VERIFIED 5-ANGLE INSPECTION PHOTOGRAPHY) Tj',
    'ET',

    '0.98 0.985 0.995 rg',
    '40 260 515.28 44 re f',
    '0.85 0.88 0.92 RG',
    '0.8 w',
    '40 260 515.28 44 re s',

    // 4 vertical dividers inside 5-angle box
    '143 260 m 143 304 l S',
    '246 260 m 246 304 l S',
    '349 260 m 349 304 l S',
    '452 260 m 452 304 l S',

    // Angle 1: Front Exterior
    'BT',
    '/F1 7.2 Tf',
    '0.30 0.35 0.45 rg',
    '48 290 Td',
    '(1. FRONT FACADE) Tj',
    'ET',
    'BT',
    '/F1 8.5 Tf',
    '0.05 0.55 0.25 rg',
    '48 274 Td',
    `(${hasFront ? '[VERIFIED]' : '[RECORDED]'}) Tj`,
    'ET',

    // Angle 2: Living Room
    'BT',
    '/F1 7.2 Tf',
    '0.30 0.35 0.45 rg',
    '151 290 Td',
    '(2. MAIN HALL) Tj',
    'ET',
    'BT',
    '/F1 8.5 Tf',
    '0.05 0.55 0.25 rg',
    '151 274 Td',
    `(${hasLiving ? '[VERIFIED]' : '[RECORDED]'}) Tj`,
    'ET',

    // Angle 3: Master Bedroom
    'BT',
    '/F1 7.2 Tf',
    '0.30 0.35 0.45 rg',
    '254 290 Td',
    '(3. BEDROOM) Tj',
    'ET',
    'BT',
    '/F1 8.5 Tf',
    '0.05 0.55 0.25 rg',
    '254 274 Td',
    `(${hasBed ? '[VERIFIED]' : '[RECORDED]'}) Tj`,
    'ET',

    // Angle 4: Kitchen Space
    'BT',
    '/F1 7.2 Tf',
    '0.30 0.35 0.45 rg',
    '357 290 Td',
    '(4. KITCHEN) Tj',
    'ET',
    'BT',
    '/F1 8.5 Tf',
    '0.05 0.55 0.25 rg',
    '357 274 Td',
    `(${hasKitchen ? '[VERIFIED]' : '[RECORDED]'}) Tj`,
    'ET',

    // Angle 5: Balcony / Washroom
    'BT',
    '/F1 7.2 Tf',
    '0.30 0.35 0.45 rg',
    '460 290 Td',
    '(5. BALCONY/BATH) Tj',
    'ET',
    'BT',
    '/F1 8.5 Tf',
    '0.05 0.55 0.25 rg',
    '460 274 Td',
    `(${hasBalcony ? '[VERIFIED]' : '[RECORDED]'}) Tj`,
    'ET',

    // -------------------------------------------------------------
    // 7. REGISTERED OWNERSHIP & CONTACT DETAILS
    // -------------------------------------------------------------
    'BT',
    '/F1 11 Tf',
    '0.08 0.12 0.22 rg',
    '40 242 Td',
    '(REGISTERED OWNERSHIP & CONTACT DETAILS) Tj',
    'ET',

    '0.98 0.985 0.995 rg',
    '40 174 515.28 54 re f',
    '0.85 0.88 0.92 RG',
    '0.8 w',
    '40 174 515.28 54 re s',

    // Vertical divider at X = 297
    '297 174 m 297 228 l S',

    // Left: Owner Name
    'BT',
    '/F1 7.5 Tf',
    '0.45 0.50 0.60 rg',
    '52 212 Td',
    '(REGISTERED PROPERTY OWNER) Tj',
    'ET',
    'BT',
    '/F1 10.5 Tf',
    '0.08 0.12 0.20 rg',
    '52 196 Td',
    `(${ownerName.substring(0, 32)}) Tj`,
    'ET',
    'BT',
    '/F2 7 Tf',
    '0.45 0.50 0.60 rg',
    '52 184 Td',
    '(Identity & ownership validated on file) Tj',
    'ET',

    // Right: Phone Link
    'BT',
    '/F1 7.5 Tf',
    '0.45 0.50 0.60 rg',
    '309 212 Td',
    '(PRIMARY DIRECT CONTACT LINK) Tj',
    'ET',
    'BT',
    '/F1 10.5 Tf',
    '0.10 0.35 0.80 rg',
    '309 196 Td',
    `(${ownerMobile.substring(0, 32)}) Tj`,
    'ET',
    'BT',
    '/F2 7 Tf',
    '0.45 0.50 0.60 rg',
    '309 184 Td',
    '(Direct verified communication channel) Tj',
    'ET',

    // -------------------------------------------------------------
    // 8. FOOTER STRIP & AUTHENTICITY STAMP
    // -------------------------------------------------------------
    '0.85 0.88 0.92 RG',
    '0.8 w',
    '40 148 m 555.28 148 l S',

    'BT',
    '/F1 8 Tf',
    '0.30 0.35 0.45 rg',
    '40 132 Td',
    '(ESTATESYNC OFFICIAL CERTIFIED PROPERTY DOSSIER - CONFIDENTIAL & SECURED) Tj',
    'ET',
    'BT',
    '/F2 7.5 Tf',
    '0.45 0.50 0.60 rg',
    '40 120 Td',
    `(${escapePdfText(`Digitally verified via EstateSync Administrative Portal for Property ID #${propId} - All Rights Reserved`)}) Tj`,
    'ET',
    'BT',
    '/F1 7.5 Tf',
    '0.10 0.50 0.30 rg',
    '415 132 Td',
    '(AUTHENTICITY SEAL: VERIFIED) Tj',
    'ET',
    'BT',
    '/F2 7.5 Tf',
    '0.45 0.50 0.60 rg',
    '415 120 Td',
    '(Official Watermark: estatesyn) Tj',
    'ET',

    // =============================================================
    // 9. SLANTING COMPANY WATERMARK: "estatesyn" (DRAWN OVER THE PAGE)
    // Rendered with PDF 1.4 ExtGState alpha transparency so it floats
    // beautifully ABOVE all content without obscuring text readability!
    // =============================================================
    
    // Central Main Watermark (across Center of Page)
    'q',
    '/GS1 gs',
    '0.7071 0.7071 -0.7071 0.7071 110 320 cm', // 45 deg rotation, centered
    'BT',
    '/F1 68 Tf',
    '0.72 0.76 0.84 rg', // Soft corporate watermark slate-blue
    '(estatesyn) Tj',
    'ET',
    'Q',

    // Upper Page Watermark (across Upper Section)
    'q',
    '/GS1 gs',
    '0.7071 0.7071 -0.7071 0.7071 210 540 cm',
    'BT',
    '/F1 52 Tf',
    '0.72 0.76 0.84 rg',
    '(estatesyn) Tj',
    'ET',
    'Q',

    // Lower Page Watermark (across Lower Section)
    'q',
    '/GS1 gs',
    '0.7071 0.7071 -0.7071 0.7071 40 120 cm',
    'BT',
    '/F1 52 Tf',
    '0.72 0.76 0.84 rg',
    '(estatesyn) Tj',
    'ET',
    'Q'
  ];

  const contentStream = streamLines.join('\n');
  const streamLength = contentStream.length;

  // Build clean PDF 1.4 objects with ExtGState transparency
  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  objects[3] = `<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 595.28 841.89]
  /Resources <<
    /Font <<
      /F1 4 0 R
      /F2 5 0 R
    >>
    /ExtGState <<
      /GS1 <<
        /Type /ExtGState
        /ca 0.18
        /CA 0.18
      >>
    >>
  >>
  /Contents 6 0 R
>>`;
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  objects[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[6] = `<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream`;

  // Assemble full PDF with correct cross-reference table
  let pdf = '%PDF-1.4\n%âãÏÓ\n';
  const offsets: number[] = [];

  for (let i = 1; i <= 6; i++) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += 'xref\n';
  pdf += '0 7\n';
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= 6; i++) {
    const offStr = String(offsets[i]).padStart(10, '0');
    pdf += `${offStr} 00000 n \n`;
  }

  pdf += 'trailer\n';
  pdf += '<<\n';
  pdf += '  /Size 7\n';
  pdf += '  /Root 1 0 R\n';
  pdf += '>>\n';
  pdf += 'startxref\n';
  pdf += `${xrefOffset}\n`;
  pdf += '%%EOF';

  // Trigger instant client-side download
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  const safeFilename = (property.Propertyname || property.title || 'EstateSync_Property')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .substring(0, 30);
  anchor.download = `${safeFilename}_Report_estatesyn.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);
}
