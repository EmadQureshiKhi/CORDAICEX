const AnalyticsService = require('../services/analytics.service');

class AnalyticsController {
  static async analyze(req, res) {
    try {
      const { coin, interval } = req.body;
      const analysis = await AnalyticsService.analyze(coin, interval);
      res.json({ data: analysis });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = AnalyticsController;
