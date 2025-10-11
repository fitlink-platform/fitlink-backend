// models/Package.js
import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema(
  {
    pt: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Tên gói: required + trim + unique trong phạm vi 1 PT
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 80
    },

    description: { type: String, trim: true, maxlength: 1000 },

    // Giá: lưu VND (integer), cho phép 0 (dùng nội bộ/khuyến mãi)
    price: {
      type: Number,
      default: 0,
      min: 0,
      max: 100_000_000 // chặn lỗi nhập nhầm
    },

    // Quy mô gói
    totalSessions: { type: Number, required: true, min: 1, max: 500 },
    durationDays:  { type: Number, required: true, min: 1, max: 3650 }, // tối đa ~10 năm

    // Trạng thái template
    isActive:   { type: Boolean, default: true },

    // (Tuỳ chọn) phạm vi hiển thị, để mở marketplace sau này
    visibility: { type: String, enum: ['private', 'public'], default: 'private' },

    // (Tuỳ chọn) meta khác
    tags:       { type: [String], default: [] }
  },
  { timestamps: true }
);

// Unique tên gói trong phạm vi 1 PT
packageSchema.index({ pt: 1, name: 1 }, { unique: true });

// Listing phổ biến: theo PT + active
packageSchema.index({ pt: 1, isActive: 1 });

// Làm sạch trước khi validate/lưu
packageSchema.pre('validate', function (next) {
  if (typeof this.name === 'string') this.name = this.name.trim();
  if (typeof this.description === 'string') this.description = this.description.trim();
  if (typeof this.price === 'number') this.price = Math.round(this.price); // tránh số lẻ
  next();
});

// Helper tiện: clone template sang StudentPackage payload
packageSchema.methods.toAssignmentDefaults = function () {
  return {
    totalSessions: this.totalSessions,
    durationDays:  this.durationDays,
    price:         this.price
  };
};

export default mongoose.model('Package', packageSchema);
