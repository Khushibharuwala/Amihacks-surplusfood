import { model, models, Schema } from 'mongoose';

export interface MongoFoodPackage {
  package_id: string;
  donation_id: string;
  qr_token: string;
  seal_code?: string;
  expected_quantity_kg: number;
  verified_at_pickup?: boolean;
  verified_at_delivery?: boolean;
  donor_photo_url?: string;
  pickup_photo_url?: string;
  delivery_photo_url?: string;
  status: string;
  created_at?: Date;
}

const foodPackageSchema = new Schema<MongoFoodPackage>(
  {
    package_id: { type: String, required: true, unique: true, index: true },
    donation_id: { type: String, required: true, index: true },
    qr_token: { type: String, required: true, unique: true },
    seal_code: { type: String },
    expected_quantity_kg: { type: Number, required: true },
    verified_at_pickup: { type: Boolean, default: false },
    verified_at_delivery: { type: Boolean, default: false },
    donor_photo_url: { type: String },
    pickup_photo_url: { type: String },
    delivery_photo_url: { type: String },
    status: { type: String, default: 'CREATED' },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const FoodPackageModel = models.FoodPackage || model<MongoFoodPackage>('FoodPackage', foodPackageSchema);

export default FoodPackageModel;
