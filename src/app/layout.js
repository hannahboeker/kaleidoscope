import "./globals.css";

export const metadata = {
  title: "kaleidoscope",
  description: "Design kaleidoscopic postcards. Write to your friends!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
