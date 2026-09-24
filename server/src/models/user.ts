import { model, models, Schema } from 'mongoose';

export type UserRole = 'DONOR' | 'NGO' | 'DRIVER' | 'ADMIN';

export interface MongoUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  profileData: Record<string, unknown>;
}

const userSchema = new Schema<MongoUser>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['DONOR', 'NGO', 'DRIVER', 'ADMIN'],
    },
    profileData: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const User = models.User || model<MongoUser>('User', userSchema);

export default User;
