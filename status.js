const express = require('express');
const router = express.Router();

// @route   GET /api/status
// @desc    Returns microservice system health status
router.get('/', (req, res) => {
    res.status(200).json({
        status: "healthy",
        timestamp: new Date(),
        uptime: process.uptime()
    });
});

module.exports = router;