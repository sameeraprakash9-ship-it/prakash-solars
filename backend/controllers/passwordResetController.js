const bcrypt = require('bcryptjs');
const { createHash, randomBytes } = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const hashToken = token => createHash('sha256').update(token).digest('hex');
const genericMessage = 'If an account exists for that email, password reset instructions will be sent.';

function getMailConfiguration() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  const port = Number(SMTP_PORT);
  if (!SMTP_HOST || !Number.isInteger(port) || port < 1 || port > 65535 || !SMTP_USER || !SMTP_PASS) {
    return { error: 'Password reset email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.' };
  }

  return {
    transporter: nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    }),
    from: process.env.SMTP_FROM || SMTP_USER
  };
}

function getFrontendUrl() {
  const configuredUrl = (process.env.CLIENT_URL || '').split(',')[0].trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:5173';
  throw new Error('CLIENT_URL must be configured before sending password reset emails.');
}

exports.forgotPassword = async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) return res.status(400).json({ message: 'Enter your email address.' });

    const mail = getMailConfiguration();
    if (mail.error) return res.status(503).json({ message: mail.error });
    const frontendUrl = getFrontendUrl();

    const user = await User.findOne({ email });
    if (!user) return res.json({ message: genericMessage });

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    await User.updateOne(
      { _id: user._id },
      { $set: { resetPasswordToken: tokenHash, resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000) } }
    );

    const resetUrl = `${frontendUrl}/reset-password/${token}`;
    try {
      await mail.transporter.sendMail({
        from: mail.from,
        to: user.email,
        subject: 'Reset your Sunwise password',
        text: `Use this link to reset your Sunwise password within one hour:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
        html: `<p>Use the link below to reset your Sunwise password. It expires in one hour.</p><p><a href="${resetUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`
      });
    } catch (error) {
      await User.updateOne(
        { _id: user._id, resetPasswordToken: tokenHash },
        { $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } }
      );
      return next(error);
    }

    return res.json({ message: genericMessage });
  } catch (error) {
    return next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!/^[\da-f]{64}$/i.test(token || '')) {
      return res.status(400).json({ message: 'This password reset link is invalid or has expired.' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: 'Your new password must be at least 6 characters.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.findOneAndUpdate(
      { resetPasswordToken: hashToken(token), resetPasswordExpires: { $gt: new Date() } },
      {
        $set: { password: passwordHash },
        $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 }
      },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(400).json({ message: 'This password reset link is invalid or has expired.' });

    return res.json({ message: 'Your password has been reset. You can now sign in with your new password.' });
  } catch (error) {
    return next(error);
  }
};
