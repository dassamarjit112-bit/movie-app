/**
 * next.config.js
 * Minimal configuration for Vercel deployment.
 * The API routes live under pages/api and are compiled by Vercel's Next.js builder.
 */
module.exports = {
  // Let Next.js output a serverless function for API routes.
  output: "standalone",
  // Optional: increase the maximum duration for serverless functions.
  // https://vercel.com/docs/functions/serverless-functions/limits
  // maxDuration: 10,
};
