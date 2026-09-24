import mongoose from 'mongoose';

export const connectMongoDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is missing in server/.env');
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log('MongoDB Atlas connected');
  } catch (error) {
    console.error('MongoDB Atlas connection error:', error);
    throw error;
  }
};