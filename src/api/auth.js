import { API_BASE_URL } from "./config";

export const checkUsernameAvailability = async (username) => {
  const response = await fetch(
    `${API_BASE_URL}/auth/check-username?username=${encodeURIComponent(username)}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "아이디 중복 확인에 실패했습니다.");
  }

  return data;
};

export const registerUser = async ({
  name,
  username,
  gender,
  birthDate,
  email,
  password,
  zipcode,
  address1,
  address2,
}) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      username,
      gender,
      birthDate,
      email,
      password,
      zipcode,
      address1,
      address2,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "회원가입에 실패했습니다.");
  }

  return data;
};

export const loginUser = async ({ email, password }) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "로그인에 실패했습니다.");
  }

  return data;
};

export const getMyProfile = async (token) => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "내 정보 조회에 실패했습니다.");
  }

  return data;
};