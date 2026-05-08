/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  compiler: {
    styledComponents: true,
  },
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
