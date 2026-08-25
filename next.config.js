const nextConfig = {
  output: process.env.NODE_ENV === 'development' ? undefined : 'export',
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['172.20.10.6'],
};

module.exports = nextConfig;
