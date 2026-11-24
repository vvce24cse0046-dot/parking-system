
const API = "/api";

let token = localStorage.getItem("token");

let refreshTimer = null;
let countdownTimer = null;

const authSection = document.getElementById("authSection");
const userDashboard = document.getElementById("userDashboard");
const ownerDashboard = document.getElementById("ownerDashboard");

// COMMON API REQUEST FUNCTION
async function apiRequest(endpoint, method = "GET", data = null) {

    const options = {
        method,
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (token) {
        options.headers.Authorization = `Bearer ${token}`;
    }

    if (data !== null) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(API + endpoint, options);

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || "Request failed");
    }

    return result;
}

// MESSAGE
function showMessage(message, success = false) {

    const element = document.getElementById("message");

    element.textContent = message;

    element.style.color = success ? "green" : "red";

}

// ACCOUNT TYPE
document.getElementById("role").addEventListener("change", function () {

    const ownerCode = document.getElementById("ownerCode");

    const vehicle = document.getElementById("vehicleNumber");

    if (this.value === "owner") {

        ownerCode.hidden = false;
        ownerCode.required = true;

        vehicle.value = "";
        vehicle.disabled = true;
        vehicle.required = false;

    } else {

        ownerCode.hidden = true;
        ownerCode.required = false;
        ownerCode.value = "";

        vehicle.disabled = false;
        vehicle.required = true;

    }

});

// REGISTER
document.getElementById("registerForm").addEventListener("submit", async function (e) {

    e.preventDefault();

    try {

        const role = document.getElementById("role").value;

        const data = {

            name: document.getElementById("name").value.trim(),

            email: document.getElementById("email").value.trim(),

            password: document.getElementById("password").value,

            phone: document.getElementById("phone").value.trim(),

            role,

            vehicleNumber: role === "user"
                ? document.getElementById("vehicleNumber").value.trim()
                : undefined,

            ownerCode: role === "owner"
                ? document.getElementById("ownerCode").value
                : undefined

        };

        const result = await apiRequest(
            "/auth/register",
            "POST",
            data
        );

        showMessage(result.message, true);

        this.reset();

        document.getElementById("role").value = "user";

        document.getElementById("ownerCode").hidden = true;

        document.getElementById("ownerCode").required = false;

        document.getElementById("vehicleNumber").disabled = false;

        document.getElementById("vehicleNumber").required = true;

    } catch (error) {

        showMessage(error.message);

    }

});

// LOGIN
document.getElementById("loginForm").addEventListener("submit", async function (e) {

    e.preventDefault();

    try {

        const result = await apiRequest(
            "/auth/login",
            "POST",
            {
                email: document.getElementById("loginEmail").value.trim(),

                password: document.getElementById("loginPassword").value
            }
        );

        token = result.token;

        localStorage.setItem("token", token);

        showDashboard(result.user);

    } catch (error) {

        showMessage(error.message);

    }

});

// SHOW DASHBOARD
function showDashboard(user) {

    authSection.hidden = true;

    userDashboard.hidden = true;

    ownerDashboard.hidden = true;

    clearInterval(refreshTimer);

    clearInterval(countdownTimer);

    if (user.role === "owner") {

        ownerDashboard.hidden = false;

        loadOwnerDashboard();

        refreshTimer = setInterval(loadOwnerDashboard, 15000);

    } else {

        userDashboard.hidden = false;

        document.getElementById("userWelcome").textContent =
            `Welcome ${user.name} | Vehicle: ${user.vehicleNumber}`;

        loadSlots();

        loadMyBookings();

        refreshTimer = setInterval(() => {

            loadSlots();

            loadMyBookings();

        }, 15000);

    }

}

// LOAD PARKING SLOTS
async function loadSlots() {

    try {

        const result = await apiRequest("/parking/slots");

        const container = document.getElementById("slots");

        container.innerHTML = "";

        result.slots.forEach(slot => {

            const div = document.createElement("div");

            div.className = slot.status === "booked"
                ? "slot booked"
                : "slot";

            const title = document.createElement("h3");

            title.textContent = `Slot ${slot.slotNumber}`;

            const status = document.createElement("p");

            status.textContent = slot.status.toUpperCase();

            div.append(title, status);

            if (slot.status === "available") {

                const button = document.createElement("button");

                button.textContent = "Book Now";

                button.addEventListener("click", () => {
                    bookSlot(slot.slotNumber);
                });

                div.appendChild(button);

            }

            container.appendChild(div);

        });

    } catch (error) {

        alert(error.message);

    }

}

// BOOK SLOT
async function bookSlot(slotNumber) {

    try {

        const result = await apiRequest(
            "/parking/book",
            "POST",
            { slotNumber }
        );

        alert(result.message);

        await loadSlots();

        await loadMyBookings();

    } catch (error) {

        alert(error.message);

    }

}

// MY BOOKINGS
async function loadMyBookings() {

    try {

        const bookings = await apiRequest("/parking/my-bookings");

        const container = document.getElementById("myBookings");

        container.innerHTML = "";

        bookings.forEach(booking => {

            const div = document.createElement("div");

            div.className = "booking-item";

            const details = document.createElement("p");

            details.textContent =
                `Slot ${booking.slotNumber} | Vehicle: ${booking.vehicleNumber} | Status: ${booking.status}`;

            div.appendChild(details);

            if (booking.status === "active" && !booking.arrivedAt) {

                const timer = document.createElement("p");

                timer.className = "timer";

                timer.dataset.expiry = booking.expiresAt;

                div.appendChild(timer);

                const button = document.createElement("button");

                button.textContent = "Cancel Booking";

                button.addEventListener("click", () => {
                    cancelBooking(booking._id);
                });

                div.appendChild(button);

            }

            if (booking.arrivedAt && booking.status === "active") {

                const arrival = document.createElement("p");

                arrival.textContent = "Vehicle arrived. Parking is active.";

                div.appendChild(arrival);

            }

            container.appendChild(div);

        });

        updateCountdowns();

        clearInterval(countdownTimer);

        countdownTimer = setInterval(updateCountdowns, 1000);

    } catch (error) {

        alert(error.message);

    }

}

// COUNTDOWN
function updateCountdowns() {

    document.querySelectorAll(".timer").forEach(timer => {

        const expiry = new Date(timer.dataset.expiry).getTime();

        const remaining = Math.max(0, expiry - Date.now());

        const minutes = Math.floor(remaining / 60000);

        const seconds = Math.floor((remaining % 60000) / 1000);

        timer.textContent =
            `Time remaining: ${minutes}:${String(seconds).padStart(2, "0")}`;

        if (remaining === 0) {

            timer.textContent = "Booking expired";

            loadSlots();

            loadMyBookings();

        }

    });

}

// CANCEL BOOKING
async function cancelBooking(id) {

    try {

        const result = await apiRequest(
            `/parking/cancel/${id}`,
            "PATCH"
        );

        alert(result.message);

        await loadSlots();

        await loadMyBookings();

    } catch (error) {

        alert(error.message);

    }

}

// OWNER DASHBOARD
async function loadOwnerDashboard() {

    try {

        const result = await apiRequest("/owner/dashboard");

        const stats = result.statistics;

        const statistics = document.getElementById("statistics");

        statistics.innerHTML = "";

        const values = [
            ["Total Users", stats.totalUsers],
            ["Total Bookings", stats.totalBookings],
            ["Active Reservations", stats.activeBookings],
            ["Expired Bookings", stats.expiredBookings],
            ["Vehicles Arrived", stats.arrivedBookings]
        ];

        values.forEach(([label, number]) => {

            const div = document.createElement("div");

            div.className = "stat";

            const h = document.createElement("h2");

            h.textContent = number;

            const p = document.createElement("p");

            p.textContent = label;

            div.append(h, p);

            statistics.appendChild(div);

        });

        // REGISTERED USERS TABLE
        const usersTable = document.getElementById("usersTable");

        usersTable.innerHTML = "";

        result.users.forEach(user => {

            const row = usersTable.insertRow();

            [
                user.name,
                user.email,
                user.phone,
                user.vehicleNumber
            ].forEach(value => {

                const cell = row.insertCell();

                cell.textContent = value;

            });

        });

        // BOOKINGS TABLE
        const bookingsTable = document.getElementById("bookingsTable");

        bookingsTable.innerHTML = "";

        result.bookings.forEach(booking => {

            const row = bookingsTable.insertRow();

            const values = [
                booking.user?.name || "Deleted User",
                booking.vehicleNumber,
                booking.slotNumber,
                booking.status,
                new Date(booking.expiresAt).toLocaleString()
            ];

            values.forEach(value => {

                const cell = row.insertCell();

                cell.textContent = value;

            });

            const actionCell = row.insertCell();

            if (booking.status === "active" && !booking.arrivedAt) {

                const button = document.createElement("button");

                button.textContent = "Mark Arrived";

                button.addEventListener("click", () => {
                    markArrived(booking._id);
                });

                actionCell.appendChild(button);

            } else if (booking.status === "active" && booking.arrivedAt) {

                const button = document.createElement("button");

                button.textContent = "Complete";

                button.addEventListener("click", () => {
                    completeBooking(booking._id);
                });

                actionCell.appendChild(button);

            } else {

                actionCell.textContent = "-";

            }

        });

    } catch (error) {

        alert(error.message);

    }

}

// MARK VEHICLE ARRIVED
async function markArrived(id) {

    try {

        const result = await apiRequest(
            `/owner/bookings/${id}/arrive`,
            "PATCH"
        );

        alert(result.message);

        await loadOwnerDashboard();

    } catch (error) {

        alert(error.message);

    }

}

// COMPLETE PARKING
async function completeBooking(id) {

    try {

        const result = await apiRequest(
            `/owner/bookings/${id}/complete`,
            "PATCH"
        );

        alert(result.message);

        await loadOwnerDashboard();

        await loadSlots();

    } catch (error) {

        alert(error.message);

    }

}

// LOGOUT
function logout() {

    localStorage.removeItem("token");

    token = null;

    clearInterval(refreshTimer);

    clearInterval(countdownTimer);

    userDashboard.hidden = true;

    ownerDashboard.hidden = true;

    authSection.hidden = false;

}

// LOGOUT BUTTONS
document.getElementById("userLogout")
    .addEventListener("click", logout);

document.getElementById("ownerLogout")
    .addEventListener("click", logout);

// REFRESH BUTTONS
document.getElementById("refreshSlots")
    .addEventListener("click", () => {

        loadSlots();

        loadMyBookings();

    });

document.getElementById("refreshOwner")
    .addEventListener("click", loadOwnerDashboard);

// RESTORE LOGIN SESSION
async function restoreSession() {

    if (!token) return;

    try {

        const result = await apiRequest("/auth/me");

        showDashboard(result.user);

    } catch (error) {

        logout();

    }

}

restoreSession();