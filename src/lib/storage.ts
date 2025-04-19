import { Scan } from '@/types';

const DB_NAME = 'medvision';
const STORE_NAME = 'images';
const METADATA_KEY = 'medvision_scans';

// Initialize IndexedDB
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

// Store an image blob in IndexedDB
export const storeImage = async (key: string, imageBlob: Blob): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(imageBlob, key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Get an image blob from IndexedDB
export const getImage = async (key: string): Promise<Blob | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

// Process and store an image, returning a blob URL
export const processAndStoreImage = async (imageUrl: string, scanId: string): Promise<string> => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    await storeImage(scanId, blob);
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to process and store image:', error);
    throw error;
  }
};

// Get image data and create a blob URL
export const getImageData = async (scanId: string): Promise<string | null> => {
  try {
    const blob = await getImage(scanId);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    return null;
  } catch (error) {
    console.error('Failed to get image data:', error);
    return null;
  }
};

// Store scans metadata
export const storeScansMetadata = (scans: Scan[]): void => {
  const metadata = scans.map(scan => ({
    ...scan,
    originalImage: undefined // Don't store blob URLs in metadata
  }));
  localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
};

// Get scans metadata
export const getScansMetadata = (): Scan[] => {
  const metadata = localStorage.getItem(METADATA_KEY);
  return metadata ? JSON.parse(metadata) : [];
};

// Revoke a blob URL
export const revokeImageUrl = (url: string): void => {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

// Clean up unused images from IndexedDB
export const cleanupUnusedImages = async (activeScans: Scan[]): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  const activeScanIds = new Set(activeScans.map(scan => scan.id));

  return new Promise((resolve, reject) => {
    const request = store.getAllKeys();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const keys = request.result as string[];
      keys.forEach(key => {
        if (!activeScanIds.has(key)) {
          store.delete(key);
        }
      });
      resolve();
    };
  });
};

// Hydrate scans with image data from storage
export const hydrateScansWithImages = async (scans: Scan[]): Promise<Scan[]> => {
  const hydratedScans = await Promise.all(
    scans.map(async scan => {
      const imageUrl = await getImageData(scan.id);
      return {
        ...scan,
        originalImage: imageUrl || scan.originalImage
      };
    })
  );
  return hydratedScans;
}; 