const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'lf_session';

const cookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = process.env.COOKIE_SAME_SITE || 'lax';

  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true' || (isProduction && sameSite === 'none'),
    sameSite,
    path: '/api',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  };
};

const getCookieValue = (cookieHeader, name) => {
  if (!cookieHeader) return null;

  const encodedValue = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

  if (!encodedValue) return null;

  try {
    return decodeURIComponent(encodedValue);
  } catch {
    return null;
  }
};

const getAccessToken = (req) => {
  const authorization = req.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  return getCookieValue(req.headers.cookie, COOKIE_NAME);
};

const createAccessToken = (user) => jwt.sign(
  {
    userId: user.id,
    role: user.role,
    authVersion: user.auth_version,
  },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRE || '7d' }
);

const setSessionCookie = (res, user) => {
  res.cookie(COOKIE_NAME, createAccessToken(user), cookieOptions());
};

const clearSessionCookie = (res) => {
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE_NAME, options);
};

module.exports = {
  clearSessionCookie,
  createAccessToken,
  getAccessToken,
  setSessionCookie,
};
