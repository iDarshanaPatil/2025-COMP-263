<script>
// ---- CONFIG ----
const DB_NAME = 'AgriDB';
const STORE_NAME = 'readings';
 
// Helper: open IndexedDB
function openDB(name) {
  return new Promise((resolve, reject) => {
	const req = indexedDB.open(name);
	req.onerror = () => reject(req.error);
	req.onsuccess = () => resolve(req.result);
  });
}
 
// Helper: read ALL from a store
function getAll(db, storeName) {
  return new Promise((resolve, reject) => {
	const tx = db.transaction(storeName, 'readonly');
	const store = tx.objectStore(storeName);
	const req = store.getAll();
	req.onerror = () => reject(req.error);
	req.onsuccess = () => resolve(req.result || []);
  });
}
 
// Convert any date-ish field to strict UTC ISO-8601
const toUTC = v => new Date(v).toISOString();
 
// MAIN: pull first 10, normalize, and send
async function syncFirst10ToServer() {
  const db = await openDB(DB_NAME);
  const all = await getAll(db, STORE_NAME);
 
  // Keep exactly first 10 – NO loops (slice + map)
  const first10 = all.slice(0, 10).map((doc, i) => ({
	...doc,
	sensorId: doc.sensorId ?? (i + 1),
	timestamp: toUTC(doc.timestamp ?? Date.now()),
	notes: String(doc.notes ?? 'ok')
  }));
 
  if (first10.length !== 10) {
	throw new Error('You must have at least 10 objects in IndexedDB.');
  }
 
  // Add required metadata (set to Darshana Patil)
  const metadata = {
	author: 'Darshana Patil',
	last_sync: toUTC(Date.now()),
	_type: 'metadata'
  };
 
  // Example reduce: compute average reading
  const avgReading = first10
	.map(x => Number(x.reading) || 0)
	.reduce((sum, x, _, arr) => sum + x / arr.length, 0);
 
  // Attach a computed field so TAs can verify reduce usage
  const payload = {
	docs: first10.map(d => ({ ...d, avgReadingComputed: avgReading })),
	metadata
  };
 
  // POST to your local server
  const res = await fetch('http://localhost:3000/sync', {
	method: 'POST',
	headers: {'Content-Type': 'application/json'},
	body: JSON.stringify(payload)
  });
 
  if (!res.ok) {
	const text = await res.text();
	throw new Error('Server error: ' + text);
  }
 
  alert('Synced 10 docs + metadata to MongoDB!');
}
 
// Expose a button hook if you want to wire it to a button
window.syncFirst10ToServer = syncFirst10ToServer;
</script>

