const nextConfig = {
  // Static export must be OFF during `next dev`: the dev server has no
  // prerender manifest, so dynamic /r/[id] routes would 500 with
  // "missing generateStaticParams". Production builds (`next build`,
  // NODE_ENV=production) always export to out/ for Cloudflare Pages.
  output: process.env.NODE_ENV === 'development' ? undefined : 'export',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
