
const Booking = require("../models/Booking");

const expireBookings = async () => {
    await Booking.updateMany(
        {
            status: "active",
            arrivedAt: null,
            expiresAt: { $lte: new Date() }
        },
        {
            $set: {
                status: "expired"
            }
        }
    );
};

module.exports = expireBookings;
