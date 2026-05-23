import './globals.css';

export const metadata = {
  title: 'Ranit Sarkhel Trade Manager',
  description: 'Trade management tool',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
