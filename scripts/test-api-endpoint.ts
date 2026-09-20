async function testApiEndpoint() {
  console.log('\n--- Calling POST http://localhost:3000/api/scout ---');

  const payload = {
    prompt: 'indie rock shows, outdoor night fleas, or art vernissages',
    location: 'Brooklyn / New York City',
    coordinates: { lat: 40.7128, lng: -73.95 },
    when: 'this weekend',
    country: 'US',
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));

  const t0 = performance.now();
  const res = await fetch('http://localhost:3000/api/scout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const durationMs = performance.now() - t0;
  const data = await res.json();

  console.log(`\nHTTP Status: ${res.status}`);
  console.log(`Total Roundtrip Time: ${(durationMs / 1000).toFixed(2)}s (${durationMs.toFixed(0)}ms)`);
  console.log(`Server Reported Duration: ${data.stats?.totalDurationSec}s`);
  console.log(`Events Discovered: ${data.events?.length ?? 0}`);
  console.log(`Queries Used:`, data.queries);
  console.log(`Vibe Tags:`, data.vibeTags);
  console.log(`Structured Count (Lane A): ${data.stats?.structuredCount}`);
  console.log(`Unstructured Count (Lane B): ${data.stats?.unstructuredCount}`);
  console.log(`Pages Scraped: ${data.pagesScrapedCount}`);
  
  if (data.events && data.events.length > 0) {
    console.log('\nSample Discovered Events:');
    data.events.slice(0, 3).forEach((e: any, i: number) => {
      console.log(` ${i + 1}. [${e.category.toUpperCase()}] ${e.title} @ ${e.venueName} (${e.formattedDate} • ${e.formattedTime}) - Match: ${e.matchScore}%`);
    });
  }
}

testApiEndpoint();
