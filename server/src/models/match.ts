import { model, models, Schema } from 'mongoose';

export interface MongoMatch {
  id: string;
  donation_id: string;
  ngo_id: string;
  driver_id?: string;
  match_score: number;
  distance_km: number;
  estimated_minutes: number;
  status: string;
  rejection_reason?: string;
  created_at?: Date;
  updated_at?: Date;
}

const matchSchema = new Schema<MongoMatch>(
  {
    id: { type: String, required: true, unique: true, index: true },
    donation_id: { type: String, required: true, index: true },
    ngo_id: { type: String, required: true, index: true },
    driver_id: { type: String, index: true },
    match_score: { type: Number, default: 95 },
    distance_km: { type: Number, default: 3.5 },
    estimated_minutes: { type: Number, default: 15 },
    status: { type: String, required: true, default: 'PENDING', index: true },
    rejection_reason: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const MatchModel = models.Match || model<MongoMatch>('Match', matchSchema);

export default MatchModel;
