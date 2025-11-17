const User = require("../models/User");
const logger = require("../utils/logger");
const { NotFoundError } = require("../utils/errors");

/**
 * Sync user from Clerk to our database
 * Called after Clerk signup/login
 */
const syncUser = async (req, res, next) => {
  try {
    const { clerkId, email, name, profile } = req.body;

    // Find or create user
    let user = await User.findOne({ clerkId });

    if (!user) {
      user = await User.create({
        clerkId,
        email,
        name: name || "",
        profile: profile || {},
      });
      logger.info({ userId: user._id, clerkId }, "New user created");
    } else {
      // Update existing user
      user.email = email;
      user.name = name || user.name;
      if (profile) {
        user.profile = { ...user.profile, ...profile };
      }
      await user.save();
      logger.info({ userId: user._id, clerkId }, "User synced");
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          clerkId: user.clerkId,
          email: user.email,
          name: user.name,
          profile: user.profile,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId);

    if (!user) {
      throw new NotFoundError("User");
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          clerkId: user.clerkId,
          email: user.email,
          name: user.name,
          profile: user.profile,
          preferences: user.preferences,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, profile, preferences } = req.body;

    const user = await User.findById(req.auth.userId);

    if (!user) {
      throw new NotFoundError("User");
    }

    // Update fields
    if (name) user.name = name;
    if (profile) user.profile = { ...user.profile, ...profile };
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    logger.info({ userId: user._id }, "User profile updated");

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          profile: user.profile,
          preferences: user.preferences,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  syncUser,
  getProfile,
  updateProfile,
};
