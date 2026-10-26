const express = require('express');
const router = express.Router();
const portfolioController = require('./portfolio.controller');
const jwt = require('jsonwebtoken');

const authOrGuest = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_cdgs');
      req.user = decoded;
    } catch (err) {}
  }
  next();
};

router.get('/', authOrGuest, portfolioController.getPortfolios);
router.post('/', authOrGuest, portfolioController.createPortfolio);

module.exports = router;
