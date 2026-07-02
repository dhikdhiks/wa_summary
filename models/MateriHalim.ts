import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMateriHalim extends Document {
  Tanggal: Date;
  Pesan: string;
}

const MateriHalimSchema = new Schema<IMateriHalim>(
  {
    Tanggal: { type: Date, required: true, index: true },
    Pesan: { type: String, required: true },
  },
  {
    collection: 'materi_halim', // koleksi yang sudah ada
    timestamps: false,
  }
);

const MateriHalim: Model<IMateriHalim> =
  mongoose.models.MateriHalim || mongoose.model<IMateriHalim>('MateriHalim', MateriHalimSchema);

export default MateriHalim;