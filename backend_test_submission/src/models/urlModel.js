const mongoose = require("mongoose");

/**
 * URL Schema Definition
 */
const urlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: [true, "Original URL is required"],
      validate: {
        validator: function (v) {
          // Basic URL validation - must start with http:// or https://
          return /^https?:\/\/.+/.test(v);
        },
        message: "Please provide a valid URL starting with http:// or https://",
      },
      maxlength: [2048, "URL is too long"],
    },
    shortCode: {
      type: String,
      required: [true, "Short code is required"],
      unique: true,
      trim: true,
      minlength: [3, "Short code must be at least 3 characters"],
      maxlength: [20, "Short code cannot exceed 20 characters"],
    },
    validity: {
      type: Number,
      default: () => process.env.DEFAULT_VALIDITY_MINUTES || 30,
      min: [1, "Validity must be at least 1 minute"],
      max: [525600, "Validity cannot exceed 1 year (525600 minutes)"],
    },
    expiry: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    clicks: {
      type: Number,
      default: 0,
      min: [0, "Clicks cannot be negative"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastAccessed: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

/**
 * Indexes for performance
 */
urlSchema.index({ shortCode: 1 }, { unique: true });
urlSchema.index({ originalUrl: 1 });
urlSchema.index({ expiry: 1 });
urlSchema.index({ createdAt: -1 });

/**
 * Instance Methods
 */
urlSchema.methods.isExpired = function () {
  return new Date() > this.expiry;
};

urlSchema.methods.incrementClicks = function () {
  this.clicks += 1;
  this.lastAccessed = new Date();
  return this.save();
};

urlSchema.methods.isValidForRedirect = function () {
  return this.isActive && !this.isExpired();
};

/**
 * Static Methods
 */
urlSchema.statics.findByShortCode = function (shortCode) {
  return this.findOne({ shortCode, isActive: true });
};

urlSchema.statics.findActiveUrls = function () {
  return this.find({ isActive: true, expiry: { $gt: new Date() } });
};

urlSchema.statics.findExpiredUrls = function () {
  return this.find({ expiry: { $lt: new Date() } });
};

urlSchema.statics.cleanupExpiredUrls = function () {
  return this.deleteMany({ expiry: { $lt: new Date() } });
};

/**
 * Virtual Properties
 */
urlSchema.virtual("isExpiredVirtual").get(function () {
  return this.isExpired();
});

urlSchema.virtual("timeRemaining").get(function () {
  if (this.isExpired()) return 0;
  return Math.max(0, this.expiry.getTime() - Date.now());
});

/**
 * Pre-save middleware
 */
urlSchema.pre("save", function (next) {
  // Ensure expiry is set if not provided
  if (this.isNew && !this.expiry) {
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + this.validity);
    this.expiry = expiryDate;
  }
  next();
});

/**
 * Pre-find middleware to exclude inactive URLs by default
 */
urlSchema.pre(/^find/, function (next) {
  // Don't filter if explicitly looking for inactive URLs
  if (!this.getQuery().hasOwnProperty("isActive")) {
    this.find({ isActive: { $ne: false } });
  }
  next();
});

/**
 * Transform JSON output
 */
urlSchema.set("toJSON", {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    ret.isExpired = doc.isExpired();
    ret.timeRemaining = doc.timeRemaining;
    return ret;
  },
});

/**
 * Create and export the model
 */
const Url = mongoose.model("Url", urlSchema);

module.exports = Url;
