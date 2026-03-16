import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";

export default async function NotificationsPageRoute() {
    const { userId } = await auth();
    if (!userId) {
        redirect("/");
    }

    const profile = await prisma.profile.findUnique({
        where: { clerkId: userId },
    });

    if (!profile) {
        redirect("/");
    }

    const notifications = await prisma.notification.findMany({
        where: { userId: profile.id },
        orderBy: { createdAt: "desc" },
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    // Serialize dates to strings for client component
    const serialized = notifications.map((n) => ({
        id: n.id,
        type: n.type as string,
        content: n.content,
        link: n.link ?? undefined,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
    }));

    return <NotificationsPage initialNotifications={serialized} initialUnreadCount={unreadCount} />;
}
