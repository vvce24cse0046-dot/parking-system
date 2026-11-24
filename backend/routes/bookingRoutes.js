
const express = require("express");
const router = express.Router();

const {
    getSlots,
    bookSlot,
    getMyBookings,
    cancelBooking
} = require("../controllers/bookingController");

const { protect } = require("../middleware/auth");

router.get("/slots", protect, getSlots);
router.post("/book", protect, bookSlot);
router.get("/my-bookings", protect, getMyBookings);
router.patch("/cancel/:id", protect, cancelBooking);

module.exports = router;