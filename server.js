const express = require("express");
const fs = require("fs");
const EventEmitter = require("events");
const path = require("path");

const app = express();
const PORT = 3000;

const usersFile = path.join(__dirname, "users.json");
const auditFile = path.join(__dirname, "audit.log");

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Read users from users.json
function readUsers() {
    const data = fs.readFileSync(usersFile, "utf8");
    return JSON.parse(data);
}

// Save users to users.json
function saveUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// Create custom EventEmitter
const userEvents = new EventEmitter();

// Signup event listener
userEvents.on("signup", (user) => {
    const message = `[${new Date().toLocaleString()}] SIGNUP: ${user.email}\n`;
    fs.appendFileSync(auditFile, message);
});

// Login event listener
userEvents.on("login", (user) => {
    const message = `[${new Date().toLocaleString()}] LOGIN: ${user.email}\n`;
    fs.appendFileSync(auditFile, message);
});

// Signup route
app.post("/signup", (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "Please fill in all fields."
        });
    }

    const users = readUsers();

    const existingUser = users.find(
        user => user.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
        return res.status(400).json({
            message: "Email already registered."
        });
    }

    const newUser = {
        name,
        email,
        password
    };

    users.push(newUser);
    saveUsers(users);

    userEvents.emit("signup", newUser);

    res.json({
        message: "Account created successfully!"
    });
});

// Login route
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Please enter email and password."
        });
    }

    const users = readUsers();

    const user = users.find(
        user =>
            user.email.toLowerCase() === email.toLowerCase() &&
            user.password === password
    );

    if (!user) {
        return res.status(401).json({
            message: "Invalid email or password."
        });
    }

    userEvents.emit("login", user);

    res.json({
        message: "Login successful!",
        name: user.name
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});