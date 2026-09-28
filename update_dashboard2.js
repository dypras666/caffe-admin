const fs = require('fs');
let code = fs.readFileSync('routes/dashboard.js', 'utf8');

// Find the destructuring array
const destructureTarget = `        [ordersByStatus],
        [revenueLast7Days],
      ] = await Promise.all([`;
      
const destructureReplacement = `        [ordersByStatus],
        [revenueLast7Days],
        [topProductsData],
        [recentOrdersData],
      ] = await Promise.all([`;

// Find the end of Promise.all
const endPromiseTarget = `           ORDER BY date ASC\`,
          [...branchParam]
        ),
      ]);`;
      
const endPromiseReplacement = `           ORDER BY date ASC\`,
          [...branchParam]
        ),
        
        // Top products today
        db.query(
          \`SELECT 
              p.id, 
              p.name, 
              SUM(oi.quantity) as total_sold, 
              SUM(oi.subtotal) as revenue 
           FROM order_items oi
           JOIN orders o ON o.id = oi.order_id
           JOIN products p ON p.id = oi.product_id
           WHERE DATE(o.created_at) = ? AND o.order_status != 'cancelled'\${branchWhere}
           GROUP BY p.id, p.name
           ORDER BY total_sold DESC
           LIMIT 10\`,
          [today, ...branchParam]
        ),
        
        // Recent orders today
        db.query(
          \`SELECT 
              id, 
              order_number, 
              customer_name, 
              order_status, 
              COALESCE(paid_amount, total) as total_amount
           FROM orders
           WHERE DATE(created_at) = ? AND order_status != 'cancelled'\${branchWhere}
           ORDER BY id DESC
           LIMIT 10\`,
          [today, ...branchParam]
        ),
      ]);`;

// Find the res.json
const resJsonTarget = `        revenue_last_7_days: revenueLast7Days,
        branch_id,
      });`;
      
const resJsonReplacement = `        revenue_last_7_days: revenueLast7Days,
        top_products: topProductsData,
        recent_orders: recentOrdersData,
        branch_id,
      });`;

if (code.includes(destructureTarget) && code.includes(endPromiseTarget) && code.includes(resJsonTarget)) {
  code = code.replace(destructureTarget, destructureReplacement);
  code = code.replace(endPromiseTarget, endPromiseReplacement);
  code = code.replace(resJsonTarget, resJsonReplacement);
  fs.writeFileSync('routes/dashboard.js', code);
  console.log("Updated routes/dashboard.js successfully (added top_products and recent_orders)");
} else {
  console.log("Could not find the target strings in routes/dashboard.js");
}
