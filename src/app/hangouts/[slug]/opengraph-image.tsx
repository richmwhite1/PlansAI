import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const revalidate = 60; // Revalidate every minute
export const alt = 'Hangout Details';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

export default async function Image(props: { params: Promise<{ slug: string }> }) {
    const params = await props.params;
    const hangout = await prisma.hangout.findUnique({
        where: { slug: params.slug },
        include: {
            creator: true,
            participants: {
                include: {
                    profile: true,
                    guest: true
                },
                take: 3
            },
            finalActivity: true,
            photos: {
                take: 1,
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!hangout) {
        return new ImageResponse(
            (
                <div
                    style={{
                        background: 'linear-gradient(135deg, #4C1D95 0%, #0F172A 100%)',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        color: 'white',
                    }}
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255, 255, 255, 0.1)',
                        padding: '40px 80px',
                        borderRadius: 32,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        flexDirection: 'column'
                    }}>
                        <div style={{ fontSize: 80, fontWeight: 'bold', marginBottom: 20 }}>Plans AI</div>
                        <div style={{ fontSize: 30, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Social Coordination Engine</div>
                    </div>
                </div>
            ),
            { ...size }
        );
    }

    const dateStr = hangout.scheduledFor
        ? new Date(hangout.scheduledFor).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : 'Planning...';

    const image = hangout.finalActivity?.imageUrl || hangout.photos[0]?.url;

    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(135deg, #4C1D95 0%, #0F172A 100%)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    fontFamily: 'sans-serif',
                }}
            >
                {/* Background Image */}
                {image && (
                    <img
                        src={image}
                        alt={hangout.title}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: 'blur(4px)',
                            transform: 'scale(1.1)', // Prevent blur edges
                        }}
                    />
                )}

                {/* Overlay for readability */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: image ? 'rgba(15, 23, 42, 0.7)' : 'transparent',
                }} />

                {/* Background Decor (only if no image) */}
                {!image && (
                    <>
                        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: '#8B5CF6', opacity: 0.2, borderRadius: '50%', filter: 'blur(80px)' }} />
                        <div style={{ position: 'absolute', bottom: -100, left: -100, width: 400, height: 400, background: '#D946EF', opacity: 0.2, borderRadius: '50%', filter: 'blur(80px)' }} />
                    </>
                )}

                {/* Content Card */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 32,
                        padding: '40px 60px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                        maxWidth: 1000,
                        textAlign: 'center',
                        backdropFilter: 'blur(12px)',
                        zIndex: 10,
                    }}
                >
                    <div style={{ fontSize: 24, letterSpacing: '0.1em', color: '#A78BFA', textTransform: 'uppercase', marginBottom: 20 }}>
                        You're invited via Plans AI
                    </div>

                    <div style={{ fontSize: 72, fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: 20, textShadow: '0 4px 20px rgba(139, 92, 246, 0.5)' }}>
                        {hangout.title}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40 }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: 99, color: '#E2E8F0', fontSize: 32 }}>
                            🗓 {dateStr}
                        </div>
                        {hangout.finalActivity && (
                            <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '10px 20px', borderRadius: 99, color: '#C4B5FD', fontSize: 32, border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                                📍 {hangout.finalActivity.name}
                            </div>
                        )}
                    </div>

                    {/* Participants preview */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
                        {hangout.participants.map((p, i) => (
                            <div key={i} style={{ display: 'flex' }}>
                                {/* Simulate Avatar */}
                                <div style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: '50%',
                                    background: '#334155',
                                    border: '4px solid #1E293B',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 24,
                                    color: 'white',
                                    marginLeft: i > 0 ? -20 : 0
                                }}>
                                    {(p.profile?.displayName?.[0] || p.guest?.displayName?.[0] || '?').toUpperCase()}
                                </div>
                            </div>
                        ))}
                        {hangout.participants.length > 0 && (
                            <div style={{ fontSize: 24, color: '#94A3B8', marginLeft: 20 }}>
                                and friends
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ),
        { ...size }
    );
}
