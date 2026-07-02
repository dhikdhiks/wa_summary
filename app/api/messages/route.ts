import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MateriHalim from '@/models/MateriHalim';

export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const { tanggal, pesan } = await request.json();
    if (!tanggal || !pesan) {
      return NextResponse.json({ error: 'Tanggal dan pesan wajib diisi' }, { status: 400 });
    }
    const entry = await MateriHalim.create({
      Tanggal: new Date(tanggal),
      Pesan: pesan,
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
    const data = await MateriHalim.find(filter)
      .sort({ Tanggal: 1 })
      .select('_id Tanggal Pesan')
      .lean()
      .exec();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  await dbConnect();
  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });

  try {
    await MateriHalim.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Data berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}