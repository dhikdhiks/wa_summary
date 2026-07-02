import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buatRingkasanLokal(teks: string): string {
  const baris = teks.split('\n').filter((b) => b.trim() !== '');
  if (baris.length === 0) return 'Tidak ada data.';
  const jumlah = baris.length;
  const semuaKata = teks.toLowerCase().split(/\W+/).filter((k) => k.length > 3);
  const frek: Record<string, number> = {};
  semuaKata.forEach((k) => (frek[k] = (frek[k] || 0) + 1));
  const top = Object.entries(frek)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k)
    .join(', ');
  return (
    `Ringkasan lokal (AI tidak tersedia):\n` +
    `- Jumlah pesan: ${jumlah}\n` +
    `- Topik sering muncul: ${top || 'tidak terdeteksi'}\n` +
    `- Cuplikan: "${baris[0].slice(0, 100)}..."`
  );
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    if (!text) {
      return new Response('Teks gabungan diperlukan', { status: 400 });
    }

    if (!process.env.GEMINI_KEY || process.env.GEMINI_KEY.startsWith('AQ.')) {
      const lokal = buatRingkasanLokal(text);
      return new Response(lokal, { headers: { 'Content-Type': 'text/plain' } });
    }

    const prompt = `Berikut adalah gabungan catatan harian. Buat ringkasan singkat dalam Bahasa Indonesia yang mencakup poin-poin penting, suasana, dan kesimpulan:\n\n${text}\n\nRingkasan:`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContentStream(prompt);

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const textChunk = chunk.text();
            if (textChunk) controller.enqueue(encoder.encode(textChunk));
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('POST /api/summary error:', error.message);
    try {
      const { text } = await request.clone().json(); // fallback baca ulang
      return new Response(buatRingkasanLokal(text || ''), {
        headers: { 'Content-Type': 'text/plain' },
      });
    } catch {
      return new Response('Gagal memproses ringkasan.', { status: 500 });
    }
  }
}

// GET tetap untuk backward compatibility (mengambil dari DB)
import dbConnect from '@/lib/mongodb';
import MateriHalim from '@/models/MateriHalim';

export async function GET(request: NextRequest) {
  await dbConnect();
  const { searchParams } = request.nextUrl;
  const mulai = searchParams.get('mulai');
  const sampai = searchParams.get('sampai');

  const filter: any = {};
  if (mulai || sampai) {
    filter.Tanggal = {};
    if (mulai) filter.Tanggal.$gte = new Date(mulai);
    if (sampai) filter.Tanggal.$lte = new Date(sampai);
  }

  try {
    const messages = await MateriHalim.find(filter)
      .sort({ Tanggal: 1 })
      .select('Tanggal Pesan')
      .lean()
      .exec();

    if (messages.length === 0) {
      return new Response('Tidak ada data untuk dirangkum.', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const teks = messages
      .map((m) => `[${new Date(m.Tanggal).toISOString().slice(0, 10)}] ${m.Pesan}`)
      .join('\n');

    // fallback handling sama seperti POST
    if (!process.env.GEMINI_KEY || process.env.GEMINI_KEY.startsWith('AQ.')) {
      return new Response(buatRingkasanLokal(teks), {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    try {
      const prompt = `Berikut adalah catatan harian. Buat ringkasan singkat dalam Bahasa Indonesia yang mencakup poin-poin penting, suasana, dan kesimpulan:\n\n${teks}\n\nRingkasan:`;
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContentStream(prompt);

      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.stream) {
              const textChunk = chunk.text();
              if (textChunk) controller.enqueue(encoder.encode(textChunk));
            }
          } catch (err) {
            controller.error(err);
          } finally {
            controller.close();
          }
        },
      });
      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (geminiError: any) {
      console.error('Gemini error:', geminiError.message);
      return new Response(buatRingkasanLokal(teks), {
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  } catch (error: any) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}