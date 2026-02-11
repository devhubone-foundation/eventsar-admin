export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
};

// Optional: small guard (dev only)
if (!config.apiBaseUrl) {
  console.warn("NEXT_PUBLIC_API_BASE_URL is not set");
}
