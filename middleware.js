// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const url = request.nextUrl.pathname;
  const referer = request.headers.get('referer');
  
  // Ganti dengan domain asli Anda
  const allowedDomain = 'comice.vercel.app'; 

  // Daftar file yang mau dilindungi
  const protectedFiles = ['.js', '.css', '.json'];

  // Cek apakah request mengarah ke file yang dilindungi
  const isProtectedFile = protectedFiles.some(ext => url.endsWith(ext));

  if (isProtectedFile) {
    // Jika tidak ada referer (akses langsung via browser bar / bot) 
    // ATAU referer bukan dari domain sendiri
    if (!referer || !referer.includes(allowedDomain)) {
      // Return 403 Forbidden atau redirect ke warning
      return new NextResponse(
        JSON.stringify({ success: false, message: 'Access Denied: Direct file access is restricted.' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  return NextResponse.next();
}

// Konfigurasi agar middleware berjalan di file statis juga
export const config = {
  matcher: [
    '/style.css',
    '/script.js',
    '/api/:path*', // Melindungi API internal juga
  ],
};
