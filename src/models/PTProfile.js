// models/PTProfile.js
import mongoose from 'mongoose'

const ptProfileSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    unique: true, 
    required: true 
  },
  
  // ✅ THÊM MỚI: Ảnh bìa (banner)
  coverImage: {
    type: String,
    default: ''
  },
  
  bio: String,
  specialties: [String],
  
  // ✅ THÊM MỚI: Số năm kinh nghiệm
  yearsExperience: {
    type: Number,
    min: 0,
    max: 50
  },
  
  certificates: [{ 
    name: String, 
    issuer: String, 
    year: Number, 
    url: String 
  }],
  
  location: {
    city: String,
    district: String,
    address: String,
    coords: { 
      type: { type: String, enum: ['Point'], default: 'Point' }, 
      coordinates: [Number] 
    }
  },
  
  // ✅ THÊM MỚI: Có nhận học viên mới không
  availableForNewClients: {
    type: Boolean,
    default: true
  },
  
  verified: { 
    type: Boolean, 
    default: false 
  },
  ratingAvg: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 5
  },
  ratingCount: { 
    type: Number, 
    default: 0 
  }
}, { timestamps: true })

// ✅ INDEXES
ptProfileSchema.index({ 'location.coords': '2dsphere' })
ptProfileSchema.index({ verified: 1, availableForNewClients: 1 })

export default mongoose.model('PTProfile', ptProfileSchema)
