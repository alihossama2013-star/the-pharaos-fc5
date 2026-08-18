import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  orderBy, 
  writeBatch,
  handleFirestoreError,
  OperationType 
} from './firebase';

const CHUNK_SIZE = 400000; // ~400KB safe size per chunk for Firestore
const IDB_DB_NAME = 'pharaohs_fc_video_cache_v2';
const IDB_STORE_NAME = 'videos';

// Open / initialize IndexedDB
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(IDB_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get cached Blob from IndexedDB
export async function getCachedVideoBlob(key: string): Promise<Blob | null> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve) => {
      const transaction = idb.transaction(IDB_STORE_NAME, 'readonly');
      const store = transaction.objectStore(IDB_STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result instanceof Blob) {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

// Save Blob to IndexedDB
export async function cacheVideoBlob(key: string, blob: Blob): Promise<void> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve) => {
      const transaction = idb.transaction(IDB_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(IDB_STORE_NAME);
      const request = store.put(blob, key);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch (e) {
    // Ignore cache write errors
  }
}

// Remove from IndexedDB
export async function removeCachedVideoBlob(key: string): Promise<void> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve) => {
      const transaction = idb.transaction(IDB_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(IDB_STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch (e) {
    // Ignore
  }
}

// Efficient Base64 Data URL to Blob conversion using ByteArrays
export function dataURLtoBlob(dataurl: string, fallbackMime = 'video/mp4'): Blob {
  try {
    const parts = dataurl.split(',');
    if (parts.length < 2) {
      return new Blob([], { type: fallbackMime });
    }
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    return new Blob([], { type: fallbackMime });
  }
}

/**
 * Save video file to Firestore with chunking and global synchronization
 */
export async function saveVideoWithChunks(
  collectionPath: string,
  docId: string,
  metadata: Record<string, any>,
  dataUrl: string,
  fileType: string = 'video/mp4',
  onProgress?: (progressPercent: number) => void
): Promise<string> {
  const isBase64 = dataUrl.startsWith('data:');
  const shouldChunk = isBase64 && dataUrl.length > 200000;
  const totalChunks = shouldChunk ? Math.ceil(dataUrl.length / CHUNK_SIZE) : 0;

  const docPayload = {
    ...metadata,
    id: docId,
    videoUrl: shouldChunk ? '' : dataUrl,
    isChunked: shouldChunk,
    totalChunks,
    fileType: fileType || 'video/mp4',
    updatedAt: new Date().toISOString()
  };

  // Write parent metadata document
  await setDoc(doc(db, collectionPath, docId), docPayload);

  if (shouldChunk && totalChunks > 0) {
    const BATCH_SIZE = 4;
    for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
      const batchPromises = [];
      const end = Math.min(i + BATCH_SIZE, totalChunks);
      for (let j = i; j < end; j++) {
        const chunkStr = dataUrl.substring(j * CHUNK_SIZE, (j + 1) * CHUNK_SIZE);
        batchPromises.push(
          setDoc(doc(db, collectionPath, docId, 'chunks', `chunk_${j}`), {
            index: j,
            data: chunkStr
          })
        );
      }
      await Promise.all(batchPromises);
      if (onProgress) {
        onProgress(Math.round((end / totalChunks) * 100));
      }
    }

    // Cache local blob in IndexedDB
    const blob = dataURLtoBlob(dataUrl, fileType);
    await cacheVideoBlob(`${collectionPath}_${docId}`, blob);
    return URL.createObjectURL(blob);
  } else {
    if (onProgress) onProgress(100);
    return dataUrl;
  }
}

/**
 * Load chunked video from Firestore, reassemble chunks into Blob URL, with IndexedDB caching
 */
export async function loadChunkedVideo(
  collectionPath: string,
  docId: string,
  fileType: string = 'video/mp4'
): Promise<string | null> {
  const cacheKey = `${collectionPath}_${docId}`;

  // 1. Check local IndexedDB cache first
  const cachedBlob = await getCachedVideoBlob(cacheKey);
  if (cachedBlob && cachedBlob.size > 0) {
    return URL.createObjectURL(cachedBlob);
  }

  // 2. Fetch all chunks from Firestore
  try {
    const chunksColRef = collection(db, collectionPath, docId, 'chunks');
    const q = query(chunksColRef, orderBy('index', 'asc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const chunksData: string[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (typeof d.index === 'number' && typeof d.data === 'string') {
          chunksData[d.index] = d.data;
        }
      });

      const fullDataUrl = chunksData.join('');
      if (fullDataUrl) {
        const blob = dataURLtoBlob(fullDataUrl, fileType);
        await cacheVideoBlob(cacheKey, blob);
        return URL.createObjectURL(blob);
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch video chunks for ${collectionPath}/${docId}:`, err);
  }

  return null;
}

/**
 * Delete video and all its chunks from Firestore & cache
 */
export async function deleteVideoWithChunks(
  collectionPath: string,
  docId: string,
  isChunked: boolean = true
): Promise<void> {
  const cacheKey = `${collectionPath}_${docId}`;
  await removeCachedVideoBlob(cacheKey);

  if (isChunked) {
    try {
      const chunksColRef = collection(db, collectionPath, docId, 'chunks');
      const snapshot = await getDocs(chunksColRef);
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn('Error deleting video chunks:', e);
    }
  }

  await deleteDoc(doc(db, collectionPath, docId));
}
