const mongoose = require('mongoose');

const TimelineItemSchema = new mongoose.Schema({
  time:  { type: String, required: true, trim: true },  // e.g. "06:30 AM"
  text:  { type: String, required: true, trim: true },
  order: { type: Number, default: 0 }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  email: {
    type: String, required: true, unique: true,
    lowercase: true, trim: true
  },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isApproved: { type: Boolean, default: false },
  profile: {
    age: Number,
    heightCm: Number,
    startWeightKg: Number,
    goalWeightKg: Number,
    startDate: Date,
    dietaryPreferences: [String]
  },
  // When set, overrides the phase-based PHASE_TASKS for this user's Daily Timeline.
  // undefined/null = use phase default.
  customTimeline: { type: [TimelineItemSchema], default: undefined },
  lastActiveAt: Date
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
