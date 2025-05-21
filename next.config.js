/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        // No pathname specified, should allow any path on this host
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // Add any other trusted image hostnames here
    ],
  },
  // experimental: {
  //   serverComponentsExternalPackages: ['@tremor/react'], // If you were using this from previous context
  // },
  // Add other Next.js configurations here if needed
  async headers() {
    return [
        {
            // matching all API routes
            source: "/api/:path*",
            headers: [
                { key: "Access-Control-Allow-Credentials", value: "true" },
                { key: "Access-Control-Allow-Origin", value: "*" }, // Replace with your frontend origin in production
                { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
                { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
            ]
        }
    ]
  }
};

module.exports = nextConfig; 