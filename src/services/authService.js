import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

let users = [];

export const signupService = async ({email, password}) => {
    if (!email || !password) {
        throw new Error("이메일과 비밀번호는 필수입니다.");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error("이미 존재하는 이메일입니다.");
    } 

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
        email,
        password: hashedPassword,
    });

    return {
        message: "회원가입이 성공적으로 완료되었습니다.",
        user: {
            id: newUser.id,
            email: newUser.email,
        },
    };
};

export const loginService = async ({email, password}) => {
    if (!email || !password) {
        throw new Error("이메일과 비밀번호를 입력해주세요.");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new Error("존재하지 않는 이메일입니다.");
    
    }

    // 비밀번호 비교
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        throw new Error("비밀번호가 잘못되었습니다.");
    }

    // JWT 토큰 생성
    const token = jwt.sign({ 
        id: user._id.toString(),
        email: user.email 
    }, 
    process.env.JWT_SECRET, {
        expiresIn: "1h",
    });

    return {
        message: "로그인 성공.",
        token: token,
        user: {
            id: user.id,
            email: user.email
        }
    };
};

export const getMeService = async (decodedUser) => {
    const user = await User.findById(decodedUser.id).select("-password");
    if (!user) {
        throw new Error("사용자를 찾을 수 없습니다.");
    }

    return {
        message: "사용자 정보를 성공적으로 조회했습니다.",
        user,
    };
};