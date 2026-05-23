import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Server-side guard for all /admin/* routes.
 * Runs on the server before any admin page is rendered or any JS is sent to the client.
 * "use client" pages inside /admin/ are still protected because this layout wraps them.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/admin");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <>{children}</>;
}
