import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI!;
if (!MONGODB_URI) throw new Error('MONGO_URI tidak diatur');

const DB_NAME = 'database_materi'; // database Anda

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      dbName: DB_NAME,
    }).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;