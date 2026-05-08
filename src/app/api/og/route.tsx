import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Dynamic parameters
    const title = searchParams.get('title') || 'SewaKhoj';
    const description = searchParams.get('description') || 'Trusted Local Services in Nepal';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            backgroundImage: 'radial-gradient(circle at 25px 25px, #f1f5f9 2%, transparent 0%), radial-gradient(circle at 75px 75px, #f1f5f9 2%, transparent 0%)',
            backgroundSize: '100px 100px',
            padding: '80px',
          }}
        >
          {/* Logo Placeholder */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: '#e11d48', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
               <span style={{ color: 'white', fontSize: '40px', fontWeight: 'bold', width: '100%', textAlign: 'center' }}>S</span>
            </div>
            <span style={{ marginLeft: '20px', fontSize: '64px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.05em' }}>SewaKhoj</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <h1 style={{ fontSize: '72px', fontWeight: '900', color: '#0f172a', marginBottom: '20px', lineHeight: '1.1' }}>
              {title}
            </h1>
            <p style={{ fontSize: '32px', color: '#64748b', maxWidth: '800px', lineHeight: '1.4' }}>
              {description}
            </p>
          </div>

          <div style={{ marginTop: '60px', display: 'flex', gap: '20px' }}>
             <div style={{ padding: '12px 24px', backgroundColor: '#e11d48', borderRadius: '12px', color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
                Book Now
             </div>
             <div style={{ padding: '12px 24px', border: '2px solid #e2e8f0', borderRadius: '12px', color: '#64748b', fontSize: '24px', fontWeight: 'bold' }}>
                sewakhoj.com
             </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
