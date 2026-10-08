const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) return res.status(401).json({ message: 'Not authorised' });
    const { id } = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET);
    const user = await User.findById(id).select('-password');
    if (!user || user.status !== 'active') return res.status(401).json({ message: 'Account not active' });
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

exports.protectEventSource = async (req, res, next) => {
  const token = req.query.token;
  if (!token) return res.status(401).json({ message: 'Token query parameter required' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    const user = await User.findById(payload.id).select('-password');
    if (!user || user.status !== 'active')
      return res.status(401).json({ message: 'Account not active' });

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

exports.authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Forbidden for your role' });
