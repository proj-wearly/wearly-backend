import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

export const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || !username.trim()) {
      return res.status(400).json({
        message: "Please enter a username.",
      });
    }

    const existingUser = await User.findOne({
      username: username.trim(),
    });

    if (existingUser) {
      return res.status(200).json({
        available: false,
        message: "This username is already taken.",
      });
    }

    return res.status(200).json({
      available: true,
      message: "This username is available.",
    });
  } catch (error) {
    console.error("checkUsername error:", error.message);
    return res.status(500).json({
      message: "A server error occurred.",
    });
  }
};

export const registerUser = async (req, res) => {
  try {
    const {
      name,
      username,
      gender,
      birthDate,
      email,
      password,
      zipcode,
      address1,
      address2,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Please enter your name.",
      });
    }

    if (!username || !username.trim()) {
      return res.status(400).json({
        message: "Please enter a username.",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        message: "Please enter your email.",
      });
    }

    if (!password) {
      return res.status(400).json({
        message: "Please enter a password.",
      });
    }

    const passwordValid = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{7,}$/.test(password);

    if (!passwordValid) {
      return res.status(400).json({
        message:
          "Password must include one uppercase letter, one special character, and be at least 7 characters long.",
      });
    }

    const existingEmail = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingEmail) {
      return res.status(409).json({
        message: "This email is already registered.",
      });
    }

    const existingUsername = await User.findOne({
      username: username.trim(),
    });

    if (existingUsername) {
      return res.status(409).json({
        message: "This username is already taken.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      username: username.trim(),
      gender: gender || "unknown",
      birthDate: birthDate || null,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      zipcode: zipcode?.trim() || null,
      address1: address1?.trim() || null,
      address2: address2?.trim() || null,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      message: "Sign up completed successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        gender: user.gender,
        birthDate: user.birthDate,
        email: user.email,
        zipcode: user.zipcode,
        address1: user.address1,
        address2: user.address2,
      },
    });
  } catch (error) {
    console.error("registerUser error:", error.message);
    return res.status(500).json({
      message: "A server error occurred.",
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter email and password.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        gender: user.gender,
        birthDate: user.birthDate,
        email: user.email,
        zipcode: user.zipcode,
        address1: user.address1,
        address2: user.address2,
      },
    });
  } catch (error) {
    console.error("loginUser error:", error.message);
    return res.status(500).json({
      message: "A server error occurred.",
    });
  }
};

export const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      message: "Profile loaded successfully.",
      user: req.user,
    });
  } catch (error) {
    console.error("getMe error:", error.message);
    return res.status(500).json({
      message: "A server error occurred.",
    });
  }
};
