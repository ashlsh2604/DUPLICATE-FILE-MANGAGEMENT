/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VirtualFile } from '../types/dedup';
import { generateDeterministicHash } from './crypto';

/**
 * Helper to build a VirtualFile with a specific content seed.
 * Identical content seeds will yield exact matching SHA-256 hashes and partial hashes!
 */
function createFile(
  id: string,
  path: string,
  size: number,
  contentSeed: string,
  date: string,
  contentPreview?: string
): VirtualFile {
  const parts = path.split('/');
  const name = parts[parts.length - 1];
  const extParts = name.split('.');
  const extension = extParts.length > 1 ? extParts[extParts.length - 1].toLowerCase() : '';

  const fullHash = generateDeterministicHash(contentSeed);
  const partialHash = generateDeterministicHash(contentSeed.slice(0, 32) + '_headtail');
  const md5Hash = fullHash.slice(0, 32);

  return {
    id,
    path,
    name,
    size,
    extension,
    modifiedAt: date,
    contentSample: contentPreview || `Header bytes: [${contentSeed.slice(0, 16)}...]`,
    fullHash,
    partialHash,
    md5Hash,
  };
}

/**
 * Preset 1: Monorepo & Dependencies Bloat
 * Simulates real-world duplicated vendor libraries, build artifacts, and asset clones.
 */
export function getMonorepoPreset(): VirtualFile[] {
  const files: VirtualFile[] = [];

  // Content seeds that have duplicates
  const SEED_LODASH = 'npm:lodash:4.17.21:bundle:content:v1';
  const SEED_LOGO = 'svg:brand:vector:logo:2026:official';
  const SEED_BUNDLE_REACT = 'dist:prod:react:bundle:main.5b8a9.js';
  const SEED_CONFIG_TS = 'config:tsconfig:base:strict:true';
  const SEED_TEST_FIXTURE_JSON = 'fixtures:users:mock:database:dump:5000:records';
  const SEED_HERO_IMAGE = 'png:marketing:hero:render:banner:highres:1080p';
  const SEED_UTILS_POLYFILL = 'core:polyfills:textencoder:polyfill:es2022';
  const SEED_DOCS_STYLING = 'css:tailwind:output:compiled:styles:global';

  // Group 1: Lodash duplicated across packages
  files.push(createFile('f101', '/packages/frontend/node_modules/lodash/lodash.js', 544280, SEED_LODASH, '2026-08-12', '/** @license Lodash <https://lodash.com/> */ (function() { ... })'));
  files.push(createFile('f102', '/packages/admin/node_modules/lodash/lodash.js', 544280, SEED_LODASH, '2026-08-15', '/** @license Lodash <https://lodash.com/> */ (function() { ... })'));
  files.push(createFile('f103', '/packages/backend/node_modules/lodash/lodash.js', 544280, SEED_LODASH, '2026-09-01', '/** @license Lodash <https://lodash.com/> */ (function() { ... })'));

  // Group 2: Company SVG Logo copied across repos
  files.push(createFile('f104', '/packages/frontend/public/assets/logo.svg', 18420, SEED_LOGO, '2026-06-10', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60"><path d="M12...'));
  files.push(createFile('f105', '/packages/admin/public/brand/logo.svg', 18420, SEED_LOGO, '2026-07-22', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60"><path d="M12...'));
  files.push(createFile('f106', '/docs/static/img/logo.svg', 18420, SEED_LOGO, '2026-08-01', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60"><path d="M12...'));
  files.push(createFile('f107', '/marketing/landing-page/assets/logo.svg', 18420, SEED_LOGO, '2026-09-14', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60"><path d="M12...'));

  // Group 3: Stale Build Artifacts duplicated in backups
  files.push(createFile('f108', '/dist/main.bundle.js', 2489120, SEED_BUNDLE_REACT, '2026-10-20', '!function(e){var t={};function n(r){...'));
  files.push(createFile('f109', '/build_backup_v2/main.bundle.js', 2489120, SEED_BUNDLE_REACT, '2026-10-18', '!function(e){var t={};function n(r){...'));

  // Group 4: Identical tsconfig.json templates
  files.push(createFile('f110', '/packages/frontend/tsconfig.json', 1240, SEED_CONFIG_TS, '2026-05-02', '{\n  "compilerOptions": { "target": "ES2022", "strict": true }\n}'));
  files.push(createFile('f111', '/packages/admin/tsconfig.json', 1240, SEED_CONFIG_TS, '2026-05-02', '{\n  "compilerOptions": { "target": "ES2022", "strict": true }\n}'));
  files.push(createFile('f112', '/packages/shared-ui/tsconfig.json', 1240, SEED_CONFIG_TS, '2026-05-02', '{\n  "compilerOptions": { "target": "ES2022", "strict": true }\n}'));

  // Group 5: Large test fixture JSON duplicated
  files.push(createFile('f113', '/packages/backend/test/fixtures/users_dump.json', 8920150, SEED_TEST_FIXTURE_JSON, '2026-04-11', '[\n  { "id": "usr_001", "name": "Elena Rostova", "role": "admin" }, ...'));
  files.push(createFile('f114', '/packages/frontend/test/mocks/users_dump.json', 8920150, SEED_TEST_FIXTURE_JSON, '2026-06-30', '[\n  { "id": "usr_001", "name": "Elena Rostova", "role": "admin" }, ...'));

  // Group 6: Marketing Hero PNG duplicated
  files.push(createFile('f115', '/marketing/assets/hero_banner.png', 4518200, SEED_HERO_IMAGE, '2026-09-02', 'PNG signature: \\x89PNG\\r\\n\\x1a\\n [4.3MB binary RGBA]'));
  files.push(createFile('f116', '/packages/frontend/public/images/hero_banner.png', 4518200, SEED_HERO_IMAGE, '2026-09-10', 'PNG signature: \\x89PNG\\r\\n\\x1a\\n [4.3MB binary RGBA]'));

  // Group 7: Cloned Directory (entire /dist_v1 directory duplicate of /dist_v2)
  files.push(createFile('f117', '/backups/dist_v1/app.js', 1420800, 'app:bundle:v1:unified', '2026-08-01'));
  files.push(createFile('f118', '/backups/dist_v2/app.js', 1420800, 'app:bundle:v1:unified', '2026-08-01'));
  files.push(createFile('f119', '/backups/dist_v1/styles.css', 184500, SEED_DOCS_STYLING, '2026-08-01'));
  files.push(createFile('f120', '/backups/dist_v2/styles.css', 184500, SEED_DOCS_STYLING, '2026-08-01'));

  // Group 8: Core polyfills
  files.push(createFile('f121', '/packages/frontend/src/polyfills/encoder.ts', 12400, SEED_UTILS_POLYFILL, '2026-03-14'));
  files.push(createFile('f122', '/packages/mobile/src/polyfills/encoder.ts', 12400, SEED_UTILS_POLYFILL, '2026-03-14'));

  // Unique Files (to realistically test Tier 0 size filtering and Tier 1 fast hash pruning)
  // Edge Case 1: Same size (32,450 bytes) but different contents (tests Tier 1 rejection)
  files.push(createFile('u1', '/packages/frontend/src/components/Header.tsx', 32450, 'src:unique:header:tsx:v1', '2026-10-01'));
  files.push(createFile('u2', '/packages/admin/src/components/Sidebar.tsx', 32450, 'src:unique:sidebar:tsx:v2', '2026-10-02'));
  
  // Edge Case 2: Same size and same head bytes, but different tail bytes (tests Tier 2 full SHA-256)
  files.push(createFile('u3', '/packages/backend/data/index_alpha.bin', 65536, 'same_head_diff_tail_A', '2026-10-05'));
  files.push(createFile('u4', '/packages/backend/data/index_beta.bin', 65536, 'same_head_diff_tail_B', '2026-10-05'));

  // Additional unique files to populate directory tree
  const uniqueNames = [
    { p: '/README.md', s: 4210, c: 'doc:readme:main' },
    { p: '/package.json', s: 2950, c: 'json:pkg:root' },
    { p: '/packages/frontend/package.json', s: 3120, c: 'json:pkg:front' },
    { p: '/packages/admin/package.json', s: 2890, c: 'json:pkg:adm' },
    { p: '/packages/backend/src/server.ts', s: 15420, c: 'ts:srv:main' },
    { p: '/packages/backend/src/db/schema.sql', s: 28410, c: 'sql:schema:v1' },
    { p: '/docs/architecture.md', s: 9420, c: 'doc:arch:v1' },
    { p: '/scripts/deploy.sh', s: 1820, c: 'sh:deploy:k8s' },
    { p: '/scripts/seed_db.py', s: 5410, c: 'py:seed:db' },
    { p: '/packages/frontend/src/App.tsx', s: 8490, c: 'tsx:app:entry' },
    { p: '/packages/frontend/src/index.css', s: 4900, c: 'css:tailwind:src' },
    { p: '/packages/backend/.env.sample', s: 890, c: 'env:sample:be' },
    { p: '/docker-compose.yml', s: 1650, c: 'yml:docker:compose' },
    { p: '/infra/terraform/main.tf', s: 22400, c: 'tf:main:aws' },
    { p: '/infra/kubernetes/deployment.yaml', s: 4120, c: 'k8s:deploy:yaml' },
  ];

  uniqueNames.forEach((item, idx) => {
    files.push(createFile(`uniq_${idx}`, item.p, item.s, item.c, '2026-09-20'));
  });

  return files;
}

/**
 * Preset 2: Photographer & Media Storage
 * High-resolution RAW photos, duplicated backups across SD Cards and Lightroom catalogs.
 */
export function getPhotographerPreset(): VirtualFile[] {
  const files: VirtualFile[] = [];

  const SEED_RAW_SUNSET = 'raw:cr3:canon:r5:sunset:over:alps:45mp:lossless';
  const SEED_RAW_PORTRAIT = 'raw:nef:nikon:z9:studio:portrait:8k:lossless';
  const SEED_RAW_WILDLIFE = 'raw:arw:sony:a1:eagle:in:flight:burst04';
  const SEED_VIDEO_4K = 'mov:prores:422hq:cinematic:drone:iceland:4k60';
  const SEED_JPEG_PRINT = 'jpg:highres:300dpi:wedding:master:final';

  // Group 1: 45MP Canon RAW cloned from SD Card to Edit folder and Backup drive
  files.push(createFile('p1', '/Volumes/SanDisk_1TB/DCIM/100CANON/IMG_8820.CR3', 52428800, SEED_RAW_SUNSET, '2026-07-14', 'Canon RAW CR3 Header (50 MB)'));
  files.push(createFile('p2', '/Users/Alex/Pictures/2026_Summer_Alps/IMG_8820.CR3', 52428800, SEED_RAW_SUNSET, '2026-07-15', 'Canon RAW CR3 Header (50 MB)'));
  files.push(createFile('p3', '/Volumes/NAS_Archive/Backups/2026/Alps_RAW/IMG_8820.CR3', 52428800, SEED_RAW_SUNSET, '2026-07-20', 'Canon RAW CR3 Header (50 MB)'));

  // Group 2: Nikon Z9 Studio RAW
  files.push(createFile('p4', '/Volumes/CFExpress_B/DCIM/NIKON_Z9/DSC_0194.NEF', 48120000, SEED_RAW_PORTRAIT, '2026-08-02'));
  files.push(createFile('p5', '/Users/Alex/Pictures/Client_Shoots/Studio_Elena/DSC_0194.NEF', 48120000, SEED_RAW_PORTRAIT, '2026-08-03'));

  // Group 3: Sony A1 Wildlife Burst
  files.push(createFile('p6', '/Volumes/SDCard_Wildlife/DCIM/DSC04122.ARW', 61200400, SEED_RAW_WILDLIFE, '2026-09-11'));
  files.push(createFile('p7', '/Users/Alex/Pictures/Wildlife_2026/Raw_Imports/DSC04122.ARW', 61200400, SEED_RAW_WILDLIFE, '2026-09-12'));
  files.push(createFile('p8', '/Users/Alex/Pictures/Wildlife_2026/Selected_Picks/DSC04122_original.ARW', 61200400, SEED_RAW_WILDLIFE, '2026-09-12'));

  // Group 4: 4K ProRes Video Clip
  files.push(createFile('p9', '/Users/Alex/Movies/Iceland_Project/Footage/Reel_04.mov', 214748364, SEED_VIDEO_4K, '2026-06-18', 'Apple ProRes 422 HQ (204 MB)'));
  files.push(createFile('p10', '/Users/Alex/Desktop/Client_Deliverables/Preview_Clip.mov', 214748364, SEED_VIDEO_4K, '2026-06-25', 'Apple ProRes 422 HQ (204 MB)'));

  // Group 5: Master JPEG Print
  files.push(createFile('p11', '/Users/Alex/Pictures/Exports/Print_Ready/Wedding_Hero_300dpi.jpg', 16420100, SEED_JPEG_PRINT, '2026-08-20'));
  files.push(createFile('p12', '/Users/Alex/Dropbox/Client_Gallery/Wedding_Hero_300dpi.jpg', 16420100, SEED_JPEG_PRINT, '2026-08-20'));

  // Unique Media Files
  const uniquePhotos = [
    { p: '/Users/Alex/Pictures/2026_Summer_Alps/IMG_8821.CR3', s: 51200000, c: 'raw:sunset:angle2' },
    { p: '/Users/Alex/Pictures/2026_Summer_Alps/IMG_8822.CR3', s: 53100000, c: 'raw:sunset:angle3' },
    { p: '/Users/Alex/Pictures/Client_Shoots/Studio_Elena/DSC_0195.NEF', s: 47900000, c: 'raw:portrait:elena:02' },
    { p: '/Users/Alex/Pictures/Lightroom/Lightroom Catalog.lrcat', s: 34120000, c: 'sqlite:catalog:lrcat' },
    { p: '/Users/Alex/Pictures/Exports/Instagram/IMG_8820_1080p.jpg', s: 1240000, c: 'jpg:instagram:scaled' },
    { p: '/Users/Alex/Pictures/Presets/Cinematic_Kodak_Gold.xmp', s: 8400, c: 'xmp:lut:kodak' },
    { p: '/Users/Alex/Pictures/Presets/Moody_Nordic_Forest.xmp', s: 9200, c: 'xmp:lut:nordic' },
  ];

  uniquePhotos.forEach((item, idx) => {
    files.push(createFile(`u_photo_${idx}`, item.p, item.s, item.c, '2026-09-01'));
  });

  return files;
}

/**
 * Preset 3: Messy Downloads & Corporate Office Archive
 * Duplicate PDFs, invoices, spreadsheets, and zip files.
 */
export function getOfficePreset(): VirtualFile[] {
  const files: VirtualFile[] = [];

  const SEED_AUDIT_PDF = 'pdf:financial:annual:audit:report:fy2026:pwc:official';
  const SEED_SALES_XLSX = 'xlsx:q3:enterprise:pipeline:forecast:updated:final';
  const SEED_BRAND_DECK = 'pptx:board:pitch:deck:series:b:keynote:v4';
  const SEED_EMPLOYEE_HANDBOOK = 'pdf:hr:company:handbook:benefits:2026:revised';
  const SEED_BACKUP_ZIP = 'zip:source:archive:quarterly:compliance:backup';

  // Group 1: Duplicate Financial Audit PDFs with " (1)" and " FINAL" suffixes
  files.push(createFile('o1', '/Users/Sarah/Downloads/FY26_Audit_Report.pdf', 8420100, SEED_AUDIT_PDF, '2026-09-01', '%PDF-1.7 PwC Audit Report 2026'));
  files.push(createFile('o2', '/Users/Sarah/Downloads/FY26_Audit_Report (1).pdf', 8420100, SEED_AUDIT_PDF, '2026-09-05', '%PDF-1.7 PwC Audit Report 2026'));
  files.push(createFile('o3', '/Users/Sarah/Desktop/FY26_Audit_Report_FINAL.pdf', 8420100, SEED_AUDIT_PDF, '2026-09-10', '%PDF-1.7 PwC Audit Report 2026'));
  files.push(createFile('o4', '/Volumes/Shared/Finance/Audits/FY26_Audit_Report.pdf', 8420100, SEED_AUDIT_PDF, '2026-09-12', '%PDF-1.7 PwC Audit Report 2026'));

  // Group 2: Sales Pipeline Excel Spreadsheets
  files.push(createFile('o5', '/Users/Sarah/Documents/Sales_Pipeline_Q3.xlsx', 3120400, SEED_SALES_XLSX, '2026-08-25', 'PK\\x03\\x04 [OpenXML Spreadsheet Workbook]'));
  files.push(createFile('o6', '/Users/Sarah/Downloads/Sales_Pipeline_Q3 (copy).xlsx', 3120400, SEED_SALES_XLSX, '2026-08-28', 'PK\\x03\\x04 [OpenXML Spreadsheet Workbook]'));
  files.push(createFile('o7', '/Volumes/Shared/Sales/2026/Pipeline_Q3.xlsx', 3120400, SEED_SALES_XLSX, '2026-09-02', 'PK\\x03\\x04 [OpenXML Spreadsheet Workbook]'));

  // Group 3: Pitch Deck PPTX
  files.push(createFile('o8', '/Users/Sarah/Desktop/Series_B_Investor_Deck.pptx', 42100800, SEED_BRAND_DECK, '2026-07-15', 'PK\\x03\\x04 [PowerPoint Presentation, 42MB]'));
  files.push(createFile('o9', '/Users/Sarah/Downloads/Series_B_Investor_Deck_v4.pptx', 42100800, SEED_BRAND_DECK, '2026-07-18', 'PK\\x03\\x04 [PowerPoint Presentation, 42MB]'));

  // Group 4: Employee Handbook
  files.push(createFile('o10', '/Volumes/Shared/HR/2026_Handbook_v2.pdf', 1450200, SEED_EMPLOYEE_HANDBOOK, '2026-01-10'));
  files.push(createFile('o11', '/Users/Sarah/Downloads/Employee_Handbook.pdf', 1450200, SEED_EMPLOYEE_HANDBOOK, '2026-02-14'));

  // Group 5: Large Zip Backup
  files.push(createFile('o12', '/Volumes/Shared/Archives/Q2_Compliance.zip', 98450000, SEED_BACKUP_ZIP, '2026-06-30'));
  files.push(createFile('o13', '/Volumes/External_HDD/Backups/Q2_Compliance_Archive.zip', 98450000, SEED_BACKUP_ZIP, '2026-07-02'));

  // Unique Office Files
  const uniqueOffice = [
    { p: '/Users/Sarah/Documents/Resume_Sarah_Chen.docx', s: 48200, c: 'docx:resume:chen' },
    { p: '/Users/Sarah/Documents/NDA_TechCorp.pdf', s: 245000, c: 'pdf:legal:nda' },
    { p: '/Users/Sarah/Downloads/zoom_installer.pkg', s: 48900000, c: 'pkg:installer:zoom' },
    { p: '/Users/Sarah/Downloads/Receipt_Uber_10_22.pdf', s: 124000, c: 'pdf:receipt:uber' },
    { p: '/Users/Sarah/Desktop/Screen Shot 2026-10-24 at 14.22.10.png', s: 1840200, c: 'png:screenshot:macos' },
    { p: '/Volumes/Shared/Legal/Terms_of_Service_v3.docx', s: 92400, c: 'docx:legal:tos' },
  ];

  uniqueOffice.forEach((item, idx) => {
    files.push(createFile(`u_office_${idx}`, item.p, item.s, item.c, '2026-09-15'));
  });

  return files;
}

/**
 * Generator for synthetic files with configurable count and duplicate percentage.
 */
export function generateSyntheticDataset(
  count: number = 200,
  duplicatePercent: number = 30
): VirtualFile[] {
  const files: VirtualFile[] = [];
  const duplicateCount = Math.floor(count * (duplicatePercent / 100));
  const uniqueCount = count - duplicateCount;

  const extensions = ['pdf', 'png', 'jpg', 'zip', 'csv', 'docx', 'mp4', 'js', 'json', 'iso'];
  const folders = ['/Documents', '/Downloads', '/Backups/Drive1', '/Backups/Drive2', '/Projects/Core', '/Archive/2026', '/Media/Clips'];

  // Create unique files
  for (let i = 0; i < uniqueCount; i++) {
    const ext = extensions[i % extensions.length];
    const folder = folders[i % folders.length];
    const name = `file_${i.toString().padStart(4, '0')}.${ext}`;
    const size = 1024 * (10 + (fnv1a(`size_${i}`) % 8000)); // 10KB to 8MB
    const seed = `synth_unique_${i}_${size}`;
    files.push(createFile(`synth_${i}`, `${folder}/${name}`, size, seed, '2026-09-10'));
  }

  // Create duplicate files (cloning random files from the unique set into different directories)
  for (let i = 0; i < duplicateCount; i++) {
    const targetOriginal = files[i % uniqueCount];
    const targetFolder = folders[(i + 3) % folders.length];
    const suffix = i % 3 === 0 ? ' (copy)' : i % 3 === 1 ? `_backup` : `_v${i}`;
    const dotIdx = targetOriginal.name.lastIndexOf('.');
    const baseName = dotIdx !== -1 ? targetOriginal.name.slice(0, dotIdx) : targetOriginal.name;
    const ext = targetOriginal.extension ? `.${targetOriginal.extension}` : '';
    const dupName = `${baseName}${suffix}${ext}`;

    const seed = `synth_unique_${i % uniqueCount}_${targetOriginal.size}`;
    files.push(createFile(
      `synth_dup_${i}`,
      `${targetFolder}/${dupName}`,
      targetOriginal.size,
      seed,
      '2026-10-01'
    ));
  }

  return files;
}

/**
 * Fast FNV-1a helper for string hashing in generator.
 */
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}
