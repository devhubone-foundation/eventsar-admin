// src/lib/config.ts
export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  storageBaseUrl: process.env.NEXT_PUBLIC_STORAGE_BASE_URL ?? "",
};


// Optional: small guard (dev only)
if (!config.apiBaseUrl) {
  console.warn("NEXT_PUBLIC_API_BASE_URL is not set");
}

if (!config.storageBaseUrl) {
  console.warn("NEXT_PUBLIC_STORAGE_BASE_URL is not set");
}
