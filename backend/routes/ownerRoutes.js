
const express = require("express");
const router = express.Router();

const {
    getDashboard,
    markArrived,
    completeBooking
} = require("../controllers/ownerController");

const { protect, ownerOnly } = require("../middleware/auth");

router.get("/dashboard", protect, ownerOnly, getDashboard);

router.patch(
    "/bookings/:id/arrive",
    protect,
    ownerOnly,
    markArrived
);

router.patch(
    "/bookings/:id/complete",
    protect,
    ownerOnly,
    completeBooking
);

module.exports = router;