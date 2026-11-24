
const Booking = require("../models/Booking");
const expireBookings = require("../utils/bookingUtils");

const TOTAL_SLOTS = 10;

// VIEW PARKING SLOTS
exports.getSlots = async (req, res) => {

    try {

        await expireBookings();

        const bookings = await Booking.find({
            status: "active"
        }).select("slotNumber");

        const bookedSlots = bookings.map(
            booking => booking.slotNumber
        );

        const slots = Array.from(
            { length: TOTAL_SLOTS },
            (_, index) => {

                const number = index + 1;

                return {
                    slotNumber: number,
                    status: bookedSlots.includes(number)
                        ? "booked"
                        : "available"
                };

            }
        );

        res.json({
            totalSlots: TOTAL_SLOTS,
            availableCount: TOTAL_SLOTS - bookedSlots.length,
            slots
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

// BOOK PARKING
exports.bookSlot = async (req, res) => {

    try {

        if (req.user.role !== "user") {
            return res.status(403).json({
                message: "Only users can book parking"
            });
        }

        const { slotNumber } = req.body;

        if (
            !Number.isInteger(slotNumber) ||
            slotNumber < 1 ||
            slotNumber > TOTAL_SLOTS
        ) {
            return res.status(400).json({
                message: "Invalid parking slot"
            });
        }

        await expireBookings();

        const existingBooking = await Booking.findOne({
            user: req.user._id,
            status: "active"
        });

        if (existingBooking) {
            return res.status(409).json({
                message: "You already have an active booking"
            });
        }

        const booking = await Booking.create({

            user: req.user._id,

            vehicleNumber: req.user.vehicleNumber,

            slotNumber,

            status: "active",

            expiresAt: new Date(Date.now() + 10 * 60 * 1000)

        });

        res.status(201).json({

            message: "Parking booked successfully",

            booking

        });

    } catch (error) {

        if (error.code === 11000) {
            return res.status(409).json({
                message: "Slot is already booked or you have another active booking"
            });
        }

        res.status(500).json({
            message: error.message
        });

    }

};

// VIEW MY BOOKINGS
exports.getMyBookings = async (req, res) => {

    try {

        await expireBookings();

        const bookings = await Booking.find({
            user: req.user._id
        }).sort({ createdAt: -1 });

        res.json(bookings);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

// CANCEL BOOKING
exports.cancelBooking = async (req, res) => {

    try {

        await expireBookings();

        const booking = await Booking.findOneAndUpdate(
            {
                _id: req.params.id,
                user: req.user._id,
                status: "active",
                arrivedAt: null
            },
            {
                $set: {
                    status: "cancelled"
                }
            },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({
                message: "Active booking not found"
            });
        }

        res.json({
            message: "Booking cancelled successfully",
            booking
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};