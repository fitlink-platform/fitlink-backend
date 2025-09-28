import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 }, // phần trăm giảm
  stock: { type: Number, default: 0 },
  images: [String],
  category: {
    type: String,
    enum: ['đồ ăn', 'đồ chơi', 'phụ kiện', 'chăm sóc'],
    default: 'phụ kiện'
  },
  ratings: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  isVisible: { type: Boolean, default: true }
}, { timestamps: true })

// Virtual: tính giá sau giảm
productSchema.virtual('finalPrice').get(function () {
  return this.price - (this.price * this.discount / 100)
})

// Enable virtuals in JSON output
productSchema.set('toJSON', { virtuals: true })

// Instance method: kiểm tra hết hàng
productSchema.methods.isOutOfStock = function () {
  return this.stock <= 0
}

// Static method: tìm theo tên gần giống
productSchema.statics.searchByName = function (keyword) {
  return this.find({ name: new RegExp(keyword, 'i') })
}

// Middleware: log khi tạo sản phẩm mới
productSchema.pre('save', function (next) {
  console.log(`Đang lưu sản phẩm mới: ${this.name}`)
  next()
})

const Product = mongoose.model('Product', productSchema)
export default Product