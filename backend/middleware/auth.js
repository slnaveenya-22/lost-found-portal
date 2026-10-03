const jwt = require('jsonwebtoken');

/**
 * Hard gate — rejects the request if no valid JWT is present.
 * On success, sets req.user = { id, role } from the token payload.
 */
function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Soft gate — decodes the JWT if present, but never blocks.
 * Useful for endpoints that behave slightly differently for logged-in users
 * (e.g. owner sees private_verification_detail, guests don't).
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.id, role: payload.role };
    } catch {
      // Invalid token — treat as guest. Don't fail the request.
    }
  }
  next();
}

/**
 * Hard gate — must be used AFTER verifyToken.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { verifyToken, optionalAuth, requireAdmin };