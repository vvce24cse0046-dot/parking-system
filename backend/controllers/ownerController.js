
const User = require("../models/User");
const Booking = require("../models/Booking");
const expireBookings = require("../utils/bookingUtils");

// OWNER DASHBOARD
exports.getDashboard = async (req, res) => {

    try {

        await expireBookings();

        const totalUsers = await User.countDocuments({
            role: "user"
        });

        const totalBookings = await Booking.countDocuments();

        const activeBookings = await Booking.countDocuments({
            status: "active",
            arrivedAt: null
        });

        const expiredBookings = await Booking.countDocuments({
            status: "expired"
        });

        const arrivedBookings = await Booking.countDocuments({
            status: "active",
            arrivedAt: { $ne: null }
        });

        const users = await User.find({
            role: "user"
        })
        .select("-password")
        .sort({ createdAt: -1 });

        const bookings = await Booking.find()
            .populate("user", "name email phone")
            .sort({ createdAt: -1 });

        res.json({

            statistics: {
                totalUsers,
                totalBookings,
                activeBookings,
                expiredBookings,
                arrivedBookings
            },

            users,

            bookings

        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

// MARK VEHICLE ARRIVED
exports.markArrived = async (req, res) => {

    try {

        await expireBookings();

        const booking = await Booking.findOneAndUpdate(
            {
                _id: req.params.id,
                status: "active",
                arrivedAt: null,
                expiresAt: { $gt: new Date() }
            },
            {
                $set: {
                    arrivedAt: new Date()
                }
            },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found or expired"
            });
        }

        res.json({
            message: "Vehicle arrival confirmed",
            booking
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

// COMPLETE PARKING
exports.completeBooking = async (req, res) => {

    try {

        const booking = await Booking.findOneAndUpdate(
            {
                _id: req.params.id,
                status: "active",
                arrivedAt: { $ne: null }
            },
            {
                $set: {
                    status: "completed",
                    completedAt: new Date()
                }
            },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({
                message: "Arrived booking not found"
            });
        }

        res.json({
            message: "Parking completed successfully",
            booking
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};