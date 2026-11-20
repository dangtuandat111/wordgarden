import type { Metadata, Viewport } from 'next';
import '@fontsource/lora/latin-400.css';
import '@fontsource/lora/vietnamese-400.css';
import '@fontsource/lora/latin-500.css';
import '@fontsource/lora/vietnamese-500.css';
import './globals.css';
export const metadata: Metadata = { title: 'Wordgarden · Từ vựng của bạn', description: 'Gom những từ hay. Học trong ngữ cảnh. Nhớ theo cách của bạn.', manifest: '/manifest.webmanifest', icons: { icon: '/icon.svg', apple: '/icon.svg' } };
export const viewport: Viewport = { themeColor: '#f7f8f2', width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="vi"><body>{children}</body></html>; }
