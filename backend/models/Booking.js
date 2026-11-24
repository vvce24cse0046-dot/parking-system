
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    vehicleNumber: {
        type: String,
        required: true
    },

    slotNumber: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        enum: ["active", "expired", "cancelled", "completed"],
        default: "active"
    },

    expiresAt: {
        type: Date,
        required: true
    },

    arrivedAt: {
        type: Date,
        default: null
    },

    completedAt: {
        type: Date,
        default: null
    }

}, {
    timestamps: true
});

// Prevent two active bookings for the same slot
bookingSchema.index(
    { slotNumber: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: "active"
        }
    }
);

// Prevent one user from booking multiple active slots
bookingSchema.index(
    { user: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: "active"
        }
    }
);

module.exports = mongoose.model("Booking", bookingSchema);