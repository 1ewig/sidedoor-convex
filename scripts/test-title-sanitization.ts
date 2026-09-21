import { cleanText } from '../src/lib/html';
import { isValidEventTitle, mineListingEvents } from '../src/lib/discovery/extraction';
import { ScrapedPageInput } from '../src/types/discovery';

console.log('--- Running Title Sanitization & Validation Tests ---');

// Test 1: HTML entity decoding
const test1Raw = 'Sunday Sessions: Live Jazz &#038; Wine Tasting &ndash; Special Edition &lsquo;Fall&rsquo;';
const test1Clean = cleanText(test1Raw);
console.log('Test 1 (HTML entities):', test1Clean);
if (!test1Clean.includes('Live Jazz & Wine Tasting – Special Edition \'Fall\'')) {
  console.error('FAIL Test 1');
  process.exit(1);
}

// Test 2: Markdown bold & italic stripping
const test2Raw = '**Gallery Tours: A Few of Our Favorite Things**';
const test2Clean = cleanText(test2Raw);
console.log('Test 2 (Markdown bold):', test2Clean);
if (test2Clean !== 'Gallery Tours: A Few of Our Favorite Things') {
  console.error('FAIL Test 2');
  process.exit(1);
}

// Test 3: Location label prefix stripping
const test3Raw = '**Location:** Lefrak Center at Lakeside Prospect Park';
const test3Clean = cleanText(test3Raw);
console.log('Test 3 (Prefix stripping):', test3Clean);
if (test3Clean !== 'Lefrak Center at Lakeside Prospect Park') {
  console.error('FAIL Test 3');
  process.exit(1);
}

// Test 4: Time scraps validation rejection
const test4Raw = '** p.m.**_** p.m.**';
const test4Clean = cleanText(test4Raw);
const test4Valid = isValidEventTitle(test4Clean);
console.log('Test 4 (Time scrap validity):', { cleaned: test4Clean, isValid: test4Valid });
if (test4Valid !== false) {
  console.error('FAIL Test 4: Time scrap should be rejected');
  process.exit(1);
}

// Test 5: Broken markdown link fragment rejection
const test5Raw = '](https://sobs.com/events/10-years-of-glow/)';
const test5Clean = cleanText(test5Raw);
const test5Valid = isValidEventTitle(test5Clean);
console.log('Test 5 (Broken link fragment validity):', { cleaned: test5Clean, isValid: test5Valid });
if (test5Valid !== false) {
  console.error('FAIL Test 5: Broken link fragment should be rejected');
  process.exit(1);
}

// Test 6: mineListingEvents with markdown link
const fakePage: ScrapedPageInput = {
  url: 'https://sobs.com/events',
  title: 'SOBs NYC Live Music & Concerts',
  markdown: `
# Upcoming Shows
• [Lavender & Velvet 10-Year Celebration](https://sobs.com/events/10-years) | Friday, Oct 24 at 8:00 PM | $25
• Sunday Sessions: Live Jazz &#038; Cocktails | Oct 26 at 7:00 PM | Free Entry
• **Location:** Blue Note Jazz Club
• 6:00 p.m. - 9:00 p.m.
  `,
};

const mined = mineListingEvents(fakePage);
console.log('Test 6 (Mined events count):', mined.length);
for (const evt of mined) {
  console.log(` - Event: "${evt.title}" at "${evt.venueName}" (${evt.formattedDate}) [${evt.price}]`);
  if (!isValidEventTitle(evt.title)) {
    console.error(`FAIL: Invalid event title was admitted: "${evt.title}"`);
    process.exit(1);
  }
  if (evt.title.includes('](') || evt.title.includes('&#') || evt.title.includes('**')) {
    console.error(`FAIL: Garbled characters in title: "${evt.title}"`);
    process.exit(1);
  }
}

console.log('All sanitization and validation tests passed!');
