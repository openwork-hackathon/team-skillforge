import mongoose, { Schema, Document } from "mongoose";

export interface IInstall extends Document {
  skillId: mongoose.Types.ObjectId;
  agentAddress: string;
  txHash?: string;
  amountPaid: number;
  rating?: number;
  review?: string;
  installedAt: Date;
}

const InstallSchema = new Schema<IInstall>(
  {
    skillId: {
      type: Schema.Types.ObjectId,
      ref: "Skill",
      required: true,
      index: true,
    },
    agentAddress: { type: String, required: true, index: true },
    txHash: String,
    amountPaid: { type: Number, default: 0 },
    rating: { type: Number, min: 1, max: 5 },
    review: String,
  },
  { timestamps: true }
);

// One install per agent per skill
InstallSchema.index({ skillId: 1, agentAddress: 1 }, { unique: true });

export default mongoose.model<IInstall>("Install", InstallSchema);