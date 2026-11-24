
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");

const User = require("./models/User");
const Booking = require("./models/Booking");
const expireBookings = require("./utils/bookingUtils");

const app = express();

app.use(cors());
app.use(express.json());

// API ROUTES
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/parking", require("./routes/bookingRoutes"));
app.use("/api/owner", require("./routes/ownerRoutes"));

// FRONTEND
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// UNKNOWN API
app.use("/api", (req, res) => {
    res.status(404).json({
        message: "API endpoint not found"
    });
});

// START SERVER
const PORT = process.env.PORT || 5000;

const startServer = async () => {

    try {

        if (!process.env.JWT_SECRET || !process.env.OWNER_CODE) {
            throw new Error("Missing JWT_SECRET or OWNER_CODE in .env");
        }

        await connectDB();

        // Create database indexes before accepting requests
        await User.init();
        await Booking.init();

        // Expire overdue, unarrived bookings every 15 seconds
        setInterval(() => {
            expireBookings().catch(error => {
                console.error("Expiry error:", error.message);
            });
        }, 15000);

        app.listen(PORT, () => {

            console.log("--------------------------------");
            console.log("SMART PARKING SERVER STARTED");
            console.log(`Website: http://localhost:${PORT}`);
            console.log("--------------------------------");

        });

    } catch (error) {

        console.error("Server startup failed:", error.message);
        process.exit(1);

    }

};

startServer();