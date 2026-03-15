import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// 아이디 중복 확인
export const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || !username.trim()) {
      return res.status(400).json({
        message: "username을 입력해주세요.",
      });
    }

    const existingUser = await User.findOne({
      username: username.trim(),
    });

    return res.status(200).json({
      available: !existingUser,
      message: existingUser
        ? "이미 사용 중인 아이디입니다."
        : "사용 가능한 아이디입니다.",
    });
  } catch (error) {
    console.error("checkUsername error:", error.message);
    return res.status(500).json({
      message: "서버 오류",
    });
  }
};

// 회원가입
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
        message: "이름을 입력해주세요.",
      });
    }

    if (!username || !username.trim()) {
      return res.status(400).json({
        message: "아이디를 입력해주세요.",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        message: "이메일을 입력해주세요.",
      });
    }

    if (!password) {
      return res.status(400).json({
        message: "비밀번호를 입력해주세요.",
      });
    }

    const passwordValid = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{7,}$/.test(password);

    if (!passwordValid) {
      return res.status(400).json({
        message:
          "비밀번호는 대문자 1개 이상, 특수기호 1개 이상 포함하고 7자리 이상이어야 합니다.",
      });
    }

    const existingEmail = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingEmail) {
      return res.status(409).json({
        message: "이미 가입된 이메일입니다.",
      });
    }

    const existingUsername = await User.findOne({
      username: username.trim(),
    });

    if (existingUsername) {
      return res.status(409).json({
        message: "이미 사용 중인 아이디입니다.",
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
      message: "회원가입 성공",
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
      message: "서버 오류",
    });
  }
};

// 로그인
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "email과 password를 입력해주세요.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      message: "로그인 성공",
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
      message: "서버 오류",
    });
  }
};

// 내 정보 조회
export const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      message: "내 정보 조회 성공",
      user: req.user,
    });
  } catch (error) {
    console.error("getMe error:", error.message);
    return res.status(500).json({
      message: "서버 오류",
    });
  }
};