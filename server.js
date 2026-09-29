const express = require("express");
const fs = require("fs");
const EventEmitter = require("events");
const path = require("path");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = 3000;
const client = new MongoClient("mongodb://localhost:27017");

let usersCollection;

async function connectDB() {
    await client.connect();

    const db = client.db("nodelab");
    usersCollection = db.collection("users");

    console.log("MongoDB connected");
}


const auditFile = path.join(__dirname, "audit.log");

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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

app.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const existingUser = await usersCollection.findOne({ email });

        if (existingUser) {
            return res.json({
                success: false,
                message: "Email already registered"
            });
        }

        const newUser = {
            name,
            email,
            password
        };

        await usersCollection.insertOne(newUser);

        userEvents.emit("signup", newUser);

        res.json({
            success: true,
            message: "Signup successful"
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await usersCollection.findOne({
            email: email,
            password: password
        });

        if (!user) {
            return res.json({
                success: false,
                message: "Invalid email or password"
            });
        }
        userEvents.emit("login", user);

        res.json({
            success: true,
            message: "Login successful",
            name: user.name
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("MongoDB connection failed:", err);
});