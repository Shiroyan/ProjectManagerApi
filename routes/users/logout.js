function logout(req, res) {
  res.clearCookie('token');
  res.status(200).json({
    msg: '注销成功'
  });
}

module.exports = logout;