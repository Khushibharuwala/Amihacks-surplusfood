import { model, models, Schema } from 'mongoose';

export interface MongoDelivery {
  id: string;
  donation_id: string;
  driver_id: string;
  ngo_id: string;
  pickup_time?: string;
  delivery_time?: string;
  status: string;
  cancellation_reason?: string;
  driver_lat?: number;
  driver_lng?: number;
  created_at?: Date;
  updated_at?: Date;
}

const deliverySchema = new Schema<MongoDelivery>(
  {
    id: { type: String, required: true, unique: true, index: true },
    donation_id: { type: String, required: true, unique: true, index: true },
    driver_id: { type: String, required: true, index: true },
    ngo_id: { type: String, required: true, index: true },
    pickup_time: { type: String },
    delivery_time: { type: String },
    status: { type: String, required: true, default: 'ASSIGNED', index: true },
    cancellation_reason: { type: String },
    driver_lat: { type: Number },
    driver_lng: { type: Number },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const DeliveryModel = models.Delivery || model<MongoDelivery>('Delivery', deliverySchema);

export default DeliveryModel;
