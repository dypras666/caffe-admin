const fs = require('fs');
let code = fs.readFileSync('routes/dashboard.js', 'utf8');

const target = `db.query(
          \`SELECT COUNT(*) AS total_bookings_pending
           FROM bookings
           WHERE status = 'pending'\${branchWhere}\`,
          [...branchParam]
        ),`;

const replacement = `db.query(
          \`SELECT COUNT(*) AS total_bookings_pending
           FROM orders
           WHERE order_type IN ('booking', 'preorder')
             AND order_status = 'pending'\${branchWhere}\`,
          [...branchParam]
        ),`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('routes/dashboard.js', code);
  console.log("Updated routes/dashboard.js successfully");
} else {
  console.log("Could not find the target string in routes/dashboard.js");
}
