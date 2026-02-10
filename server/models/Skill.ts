import mongoose, { Schema, Document } from "mongoose";

export interface ISkill extends Document {
  name: string;
  symbol: string;
  description: string;
  category: string;
  version: string;
  content: string; // raw SKILL.md content
  contentHash: string; // keccak256 hash for on-chain verification
  author: {
    address: string;
    name: string;
    avatar?: string;
  };
  pricing: {
    model: "free" | "one-time" | "subscription";
    amount: number; // in $OPENWORK (wei)
  };
  compatibility: string[]; // ["claude-code", "cursor", "devin"]
  dependencies: string[]; // skill IDs this depends on
  stats: {
    installs: number;
    rating: number;
    ratingCount: number;
    revenue: number;
  };
  tags: string[];
  verified: boolean;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SkillSchema = new Schema<ISkill>(
  {
    name: { type: String, required: true, index: true },
    symbol: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: [
        "defi",
        "coding",
        "analytics",
        "social",
        "trading",
        "security",
        "infrastructure",
        "content",
        "data",
        "other",
      ],
      index: true,
    },
    version: { type: String, default: "1.0.0" },
    content: { type: String, required: true },
    contentHash: { type: String, required: true },
    author: {
      address: { type: String, required: true, index: true },
      name: { type: String, required: true },
      avatar: String,
    },
    pricing: {
      model: {
        type: String,
        enum: ["free", "one-time", "subscription"],
        default: "free",
      },
      amount: { type: Number, default: 0 },
    },
    compatibility: [{ type: String }],
    dependencies: [{ type: Schema.Types.ObjectId, ref: "Skill" }],
    stats: {
      installs: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
      ratingCount: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
    },
    tags: [{ type: String }],
    verified: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Text search index
SkillSchema.index({ name: "text", description: "text", tags: "text" });

export default mongoose.model<ISkill>("Skill", SkillSchema);