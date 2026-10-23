const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');
const { setSessionCookie, clearSessionCookie } = require('../utils/session');
const { successResponse, errorResponse } = require('../utils/response');

const authController = {
  async register(req, res) {
    try {
      const { email, password, name, phone } = req.body;
      const user = await authService.register({
        email,
        password,
        name,
        phone,
        ipAddress: req.ip
      });
      setSessionCookie(res, user);
      return successResponse(
        res,
        {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            created_at: user.created_at
          }
        },
        'User registered successfully',
        201
      );
    } catch (error) {
      const status = error.message.includes('already exists') ? 400 : 500;
      return errorResponse(res, error.message || 'Registration failed', status);
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await authService.login({ email, password, ipAddress: req.ip });
      setSessionCookie(res, user);
      return successResponse(
        res,
        {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        },
        'Login successful'
      );
    } catch (error) {
      const status = error.message.includes('Invalid credentials') || error.message.includes('deactivated') ? 401 : 500;
      return errorResponse(res, error.message || 'Login failed', status);
    }
  },

  async getProfile(req, res) {
    try {
      const user = await userRepository.findProfileById(req.user.id);
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }
      return successResponse(res, { user });
    } catch (error) {
      return errorResponse(res, 'Failed to fetch profile', 500);
    }
  },

  async updateProfile(req, res) {
    try {
      const { name, phone } = req.body;
      const user = await userRepository.updateProfile(req.user.id, {
        name: name?.trim(),
        phone: phone?.trim() || null
      });
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }
      return successResponse(res, { user }, 'Profile updated successfully');
    } catch (error) {
      return errorResponse(res, 'Failed to update profile', 500);
    }
  },

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const updatedUser = await authService.changePassword({
        userId: req.user.id,
        currentPassword,
        newPassword,
        ipAddress: req.ip
      });
      setSessionCookie(res, updatedUser);
      return successResponse(res, null, 'Password changed successfully');
    } catch (error) {
      const status = error.message.includes('incorrect') ? 400 : 500;
      return errorResponse(res, error.message || 'Failed to change password', status);
    }
  },

  async logout(req, res) {
    try {
      clearSessionCookie(res);
      return successResponse(res, null, 'Logged out successfully');
    } catch (error) {
      return errorResponse(res, 'Logout failed', 500);
    }
  }
};

module.exports = authController;
