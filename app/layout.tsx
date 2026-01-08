import "./globals.css";

export const metadata = {
  title: "Zoho Fedex Integration",
  description: "Integration with Zoho OAuth + Multipart Shipment Box Packaging",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
