/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  compiler: {
    styledComponents: true,
  },
  serverExternalPackages: ["sharp"],
  allowedDevOrigins: ["10.61.21.173"],
};

export default nextConfig;
