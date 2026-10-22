import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | Admin | Flowers Kitchen",
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}
