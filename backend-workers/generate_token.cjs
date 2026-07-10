const jwt = require('jsonwebtoken');

const secret = 'x+F1xoDErNw+f1upIZkMIYxYzIC6NisYvlsz6ALdOojWoPp2FZM8efgBrqpBXYXLt+zbYrXm8WmlDBiLydj09A==';
const payload = {
  userId: 'user-123',
  businessId: 'biz-123',
  roleId: 'role-admin'
};

const token = jwt.sign(payload, secret);
console.log("TOKEN=" + token);
