const User = require('../models/User');
const WalletEntry = require('../models/WalletEntry');

exports.getWallet = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('walletBalance');
    if (!user)
      return res.status(404).json({ message: 'User not found' });

    const entries = await WalletEntry.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      balance: user.walletBalance,
      entries
    });
  } catch (error) {
    next(error);
  }
};

exports.topUpWallet = async (req, res, next) => {
  try {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 100000)
      return res.status(400).json({
        message: 'amount must be between 1 and 100000'
      });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { walletBalance: amount } },
      { new: true, runValidators: true, select: 'walletBalance' }
    );
    if (!user)
      return res.status(404).json({ message: 'User not found' });

    try {
      await WalletEntry.create({
        user: user._id,
        type: 'topup',
        amount,
        balanceAfter: user.walletBalance
      });
    } catch (error) {
      try {
        await User.updateOne(
          { _id: user._id },
          { $inc: { walletBalance: -amount } }
        );
      } catch (rollbackError) {
        console.error('Failed to roll back wallet top-up:', rollbackError);
      }
      throw error;
    }

    res.json({ message: 'Simulated top-up successful', balance: user.walletBalance });
  } catch (error) {
    next(error);
  }
};
