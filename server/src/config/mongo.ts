import mongoose from 'mongoose';

export const connectMongoDB = async (): Promise<boolean> => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('[MongoDB] MONGODB_URI is missing in server/.env. Using SQLite primary database.');
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('[MongoDB] MongoDB Atlas connected successfully');
    return true;
  } catch (error) {
    console.warn('[MongoDB] MongoDB Atlas connection error. Falling back to SQLite primary database:', error);
    return false;
  }
};