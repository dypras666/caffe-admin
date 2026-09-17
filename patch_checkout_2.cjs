const fs = require('fs');
let code = fs.readFileSync('src/pages/POSPage.jsx', 'utf8');

// Change max-w-sm to max-w-3xl for 2 columns
code = code.replace(
  '<DialogContent className="max-w-sm">',
  '<DialogContent className="max-w-3xl">'
);

// We need to wrap the contents in a grid.
// Currently it is:
// <DialogHeader><DialogTitle>Konfirmasi Pembayaran</DialogTitle></DialogHeader>
// <div className="space-y-4">
//   {/* Order summary */}
// ...
// We'll replace the `<div className="space-y-4">` with a grid.

const originalDiv = '<div className="space-y-4">';
const gridDiv = '<div className="grid grid-cols-1 md:grid-cols-2 gap-6">';
code = code.replace(originalDiv, gridDiv);

// Now we need to split the items into left and right columns.
// Left column: Order summary, Discount, Cash/QRIS UI.
// Right column: Payment methods, Notes, Actions.

// Wait, the elements inside the grid will just flow. But we want specific groups.
// So we need to wrap the left items in one div, and right items in another div.
