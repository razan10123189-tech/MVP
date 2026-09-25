const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user didapat dari verifyToken sebelumnya
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Akses ditolak! Anda tidak memiliki hak akses untuk fitur ini.' 
      });
    }
    next();
  };
};

module.exports = authorizeRoles;
