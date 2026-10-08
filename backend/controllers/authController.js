const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });

exports.register = async (req, res, next) => {
  try {
    const { name, password, role, zone } = req.body;
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!name?.trim() || !email || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: 'Enter your name, a valid email, and a password with at least 6 characters.' });
    }
    if (!['prosumer', 'consumer'].includes(role)) return res.status(400).json({ message: 'Role must be prosumer or consumer' });
    if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already registered' });
    const user = await User.create({ name: name.trim(), email, password, role, zone });
    res.status(201).json({ token: sign(user._id), user: { id: user._id, name: user.name, email: user.email, role: user.role, zone: user.zone } });
  } catch (e) { next(e); }
};

exports.login = async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password) return res.status(400).json({ message: 'Enter both your email address and password.' });
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) return res.status(401).json({ message: 'Invalid email or password. Check your details or create an account.' });
    if (user.status !== 'active') return res.status(403).json({ message: 'Account suspended' });
    res.json({ token: sign(user._id), user: { id: user._id, name: user.name, email: user.email, role: user.role, zone: user.zone } });
  } catch (e) { next(e); }
};

exports.me = (req, res) => res.json(req.user);
