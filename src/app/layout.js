import "./globals.css";
import StyledComponentsRegistry from "../lib/registry";

export const metadata = {
  title: "kaleidoscope",
  description: "Design kaleidoscopic postcards. Write to your friends!",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
