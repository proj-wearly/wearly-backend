import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "이름은 필수입니다."],
      trim: true,
    },
    username: {
      type: String,
      required: [true, "아이디는 필수입니다."],
      unique: true,
      trim: true,
      minlength: 2,
    },
    gender: {
      type: String,
      enum: ["male", "female", "unknown"],
      default: "unknown",
    },
    birthDate: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      required: [true, "이메일은 필수입니다."],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "비밀번호는 필수입니다."],
      minlength: 7,
    },
    zipcode: {
      type: String,
      default: null,
      trim: true,
    },
    address1: {
      type: String,
      default: null,
      trim: true,
    },
    address2: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;