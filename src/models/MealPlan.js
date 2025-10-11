// models/MealPlan.js
import mongoose from 'mongoose'

const mealPlanSchema = new mongoose.Schema({
  session: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Session', 
    index: true 
  },
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  date: { 
    type: Date, 
    required: true 
  },
  
  // ✅ THÊM MỚI: Structure meals chi tiết
  meals: [{
    time: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack']
    },
    food: String,
    calories: Number,
    protein: Number,
    carbs: Number,
    fats: Number,
    note: String
  }],
  
  totalCalories: {
    type: Number,
    default: 0
  },
  
  note: String  // Note chung cho cả ngày
}, { timestamps: true })

// ✅ INDEXES
mealPlanSchema.index({ student: 1, date: -1 })

export default mongoose.model('MealPlan', mealPlanSchema)