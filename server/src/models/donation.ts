import { model, models, Schema } from 'mongoose';

export interface MongoDonation {
  id: string;
  donor_id: string;
  donor_name?: string;
  food_type: string;
  description: string;
  quantity_kg: number;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  available_from: string;
  safe_until: string;
  image_url?: string;
  status: string;
  created_at?: Date;
  updated_at?: Date;
}

const donationSchema = new Schema<MongoDonation>(
  {
    id: { type: String, required: true, unique: true, index: true },
    donor_id: { type: String, required: true, index: true },
    donor_name: { type: String },
    food_type: { type: String, required: true },
    description: { type: String, required: true },
    quantity_kg: { type: Number, required: true },
    pickup_address: { type: String, required: true },
    pickup_latitude: { type: Number, required: true },
    pickup_longitude: { type: Number, required: true },
    available_from: { type: String },
    safe_until: { type: String, required: true },
    image_url: { type: String },
    status: { type: String, required: true, default: 'POSTED', index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const DonationModel = models.Donation || model<MongoDonation>('Donation', donationSchema);

export default DonationModel;
