
export { default } from 'next-auth/middleware';

export const config = { matcher: ['/dashboard', '/practice/:path*', '/prep/:path*', '/live/:path*'] };
