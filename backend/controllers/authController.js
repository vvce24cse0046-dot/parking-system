
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// REGISTER USER OR OWNER
exports.register = async (req, res) => {

    try {

        const {
            name,
            email,
            password,
            phone,
            vehicleNumber,
            role,
            ownerCode
        } = req.body;

        if (!name || !email || !password || !phone) {
            return res.status(400).json({
                message: "Please fill all required fields"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        const accountRole = role === "owner" ? "owner" : "user";

        if (accountRole === "owner" &&
            ownerCode !== process.env.OWNER_CODE) {
            return res.status(403).json({
                message: "Invalid owner code"
            });
        }

        if (accountRole === "user" && !vehicleNumber) {
            return res.status(400).json({
                message: "Vehicle number is required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({

            name: name.trim(),

            email: normalizedEmail,

            password: hashedPassword,

            phone: phone.trim(),

            vehicleNumber: accountRole === "owner"
                ? "N/A"
                : vehicleNumber.trim().toUpperCase(),

            role: accountRole

        });

        res.status(201).json({

            message: "Registration successful",

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                vehicleNumber: user.vehicleNumber,
                role: user.role
            }

        });

    } catch (error) {

        if (error.code === 11000) {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        res.status(500).json({
            message: "Registration failed"
        });

    }

};

// LOGIN
exports.login = async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password required"
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({

            message: "Login successful",

            token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                vehicleNumber: user.vehicleNumber,
                role: user.role
            }

        });

    } catch (error) {

        res.status(500).json({
            message: "Login failed"
        });

    }

};

// GET LOGGED-IN USER
exports.getMe = async (req, res) => {

    res.json({
        user: req.user
    });

};