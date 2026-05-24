import puppeteer from 'puppeteer';
import { URL } from 'url';

const BASE_URL = process.argv[2] || 'https://www.sewakhoj.com';
const MAX_PAGES = 100; // Limit to prevent infinite loops

console.log(`\n🚀 Starting Deep QA Crawl on: ${BASE_URL}\n`);

const visited = new Set();
const toVisit = [BASE_URL];

const results = {
  brokenLinks: new Set(),
  notFoundPages: new Set(),
  failedApiRequests: new Set(),
  consoleErrors: [],
  missingImages: new Set(),
  redirectLoops: new Set(),
};

let pagesCrawled = 0;

async function crawl() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set user agent to avoid bot blocks
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SewaKhojQABot/1.0');

  // Intercept requests to detect failures
  page.on('requestfailed', request => {
    const url = request.url();
    const type = request.resourceType();
    const failure = request.failure();
    const errorText = failure ? failure.errorText : 'Unknown error';

    if (errorText === 'net::ERR_BLOCKED_BY_CLIENT') return; // Ignore AdBlockers

    if (type === 'fetch' || type === 'xhr') {
      results.failedApiRequests.add(`${url} (${errorText})`);
    } else if (type === 'image') {
      results.missingImages.add(`${url} (${errorText})`);
    }
  });

  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    const type = response.request().resourceType();

    if (status >= 400) {
      if (type === 'document' && url.startsWith(BASE_URL)) {
        results.notFoundPages.add(`${url} (Status: ${status})`);
      }
      if (type === 'fetch' || type === 'xhr') {
        results.failedApiRequests.add(`${url} (Status: ${status})`);
      }
      if (type === 'image') {
        results.missingImages.add(`${url} (Status: ${status})`);
      }
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out non-critical console errors
      if (!text.includes('favicon.ico') && !text.includes('Third-party cookie')) {
        results.consoleErrors.push(`[${page.url()}] ${text}`);
      }
    }
  });

  while (toVisit.length > 0 && pagesCrawled < MAX_PAGES) {
    const currentUrl = toVisit.pop();
    if (visited.has(currentUrl)) continue;

    visited.add(currentUrl);
    pagesCrawled++;

    process.stdout.write(`\r⏳ Crawling (${pagesCrawled}/${MAX_PAGES}): ${currentUrl}`.padEnd(80));

    try {
      const response = await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 15000 });

      // Check redirect loops
      const chain = response.request().redirectChain();
      if (chain.length > 3) {
        results.redirectLoops.add(`${currentUrl} (Redirected ${chain.length} times)`);
      }

      // Find all internal links to continue crawling
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => a.href)
          .filter(href => href.startsWith('http'));
      });

      for (const link of links) {
        try {
          const urlObj = new URL(link);
          const baseHostname = new URL(BASE_URL).hostname.replace('www.', '');
          const linkHostname = urlObj.hostname.replace('www.', '');

          // Allow internal links even if www or non-www varies
          if (linkHostname === baseHostname) {
            urlObj.hash = ''; // Remove hash fragments
            const cleanUrl = urlObj.toString();

            if (!visited.has(cleanUrl) && !toVisit.includes(cleanUrl)) {
              toVisit.push(cleanUrl);
            }
          }
        } catch (e) {
           results.brokenLinks.add(`${link} (Found on: ${currentUrl})`);
        }
      }
    } catch (error) {
      results.brokenLinks.add(`${currentUrl} - Error: ${error.message}`);
    }
  }

  await browser.close();

  console.log('\n\n✅ Crawl Completed!\n');
  console.log('--- 📊 QA CRAWL RESULTS 📊 ---');
  console.log(`Pages Crawled: ${pagesCrawled}\n`);

  printResult('🔴 404 Pages / Broken Routes', results.notFoundPages);
  printResult('🔴 Broken Links', results.brokenLinks);
  printResult('🔴 Failed API Requests', results.failedApiRequests);
  printResult('🔴 Missing Images', results.missingImages);
  printResult('🔴 Redirect Loops', results.redirectLoops);

  console.log(`\n🔴 Console Errors: ${results.consoleErrors.length}`);
  const uniqueErrors = [...new Set(results.consoleErrors)];
  uniqueErrors.slice(0, 20).forEach(u => console.log('  - ' + u));
  if (uniqueErrors.length > 20) console.log(`  ... and ${uniqueErrors.length - 20} more.`);

  console.log('\n');
}

function printResult(title, set) {
  if (set.size === 0) {
    console.log(`${title}: 0 (Perfect! ✨)`);
    return;
  }
  console.log(`${title}: ${set.size}`);
  Array.from(set).slice(0, 20).forEach(u => console.log('  - ' + u));
  if (set.size > 20) console.log(`  ... and ${set.size - 20} more.`);
  console.log('');
}

crawl().catch(console.error);
