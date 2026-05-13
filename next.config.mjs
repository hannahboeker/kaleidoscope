/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  compiler: {
    styledComponents: true,
  },
  serverExternalPackages: ["sharp"],
  allowedDevOrigins: ["10.61.21.173"],
  outputFileTracingIncludes: {
    "/api/export": [
      "./public/fonts/neumarkt-regular-v01.woff",
      "./public/postcard-back.svg",
    ],
  },
};

export default nextConfig;
