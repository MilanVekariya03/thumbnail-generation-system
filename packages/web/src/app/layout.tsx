import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Thumbnail Generation System',
  description: 'Upload images and videos to generate thumbnails',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
