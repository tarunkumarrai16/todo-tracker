require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const User = require("./models/User");
const Activity = require("./models/Activity");

const app = express();

app.use(cors());
app.use(express.json());


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Atlas Connected");
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => console.log(err));

const JWT_SECRET = process.env.JWT_SECRET;

// helper function: delete data older than 7 days
const cleanupOldActivities = async (userId) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  await Activity.deleteMany({
    userId,
    activityDate: { $lt: sevenDaysAgo }
  });
};

// auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization");

    if (!token) {
      return res.status(401).json({ message: "No token, access denied" });
    }

    const actualToken = token.replace("Bearer ", "");
    const verified = jwt.verify(actualToken, JWT_SECRET);

    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

app.get("/", (req, res) => {
  res.send("Server is running");
});

// signup
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      userId: uuidv4()
    });

    await user.save();

    res.json({
      message: "Signup successful",
      user: {
        name: user.name,
        email: user.email,
        userId: user.userId
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        name: user.name,
        email: user.email,
        userId: user.userId
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// add activity
app.post("/add-activity", auth, async (req, res) => {
  try {
    const { title, activityDate } = req.body;
    const userId = req.user.userId;

    if (!title || !activityDate) {
      return res.status(400).json({ message: "Title and date are required" });
    }

    const activity = new Activity({
      userId,
      title,
      activityDate: new Date(activityDate)
    });

    await activity.save();
    await cleanupOldActivities(userId);

    res.json({
      message: "Activity added successfully",
      activity
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// get activities of one day
app.get("/activities/:date", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    await cleanupOldActivities(userId);

    const activities = await Activity.find({
      userId,
      activityDate: { $gte: start, $lte: end }
    }).sort({ createdAt: 1 });

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// toggle complete
app.put("/toggle-activity/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;

    const updated = await Activity.findByIdAndUpdate(
      id,
      { completed },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Activity not found" });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// delete activity
app.delete("/delete-activity/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Activity.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Activity not found" });
    }

    res.json({ message: "Activity deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// daily progress
app.get("/daily-progress/:date", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    await cleanupOldActivities(userId);

    const activities = await Activity.find({
      userId,
      activityDate: { $gte: start, $lte: end }
    });

    const total = activities.length;
    const completed = activities.filter((a) => a.completed).length;
    const percentage = total === 0 ? 0 : (completed / total) * 100;

    res.json({ total, completed, percentage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// overall progress for last 7 days
app.get("/overall-progress", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    await cleanupOldActivities(userId);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const activities = await Activity.find({
      userId,
      activityDate: { $gte: sevenDaysAgo }
    });

    const total = activities.length;
    const completed = activities.filter((a) => a.completed).length;
    const percentage = total === 0 ? 0 : (completed / total) * 100;

    res.json({ total, completed, percentage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// pending tasks in last 7 days
app.get("/pending", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    await cleanupOldActivities(userId);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const pending = await Activity.find({
      userId,
      completed: false,
      activityDate: { $gte: sevenDaysAgo }
    }).sort({ activityDate: 1 });

    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// last 7 days history
app.get("/last-7-days", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    await cleanupOldActivities(userId);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const history = await Activity.find({
      userId,
      activityDate: { $gte: sevenDaysAgo }
    }).sort({ activityDate: 1, createdAt: 1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});