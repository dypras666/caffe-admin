const fs = require('fs');
let code = fs.readFileSync('src/pages/POSPage.jsx', 'utf8');

// Change max-w-sm to max-w-3xl
code = code.replace('<DialogContent className="max-w-sm">', '<DialogContent className="max-w-3xl">');

// Find the start of the content wrapper
const startStr = '<div className="space-y-4">\n          {/* Order summary */}';
const targetStart = code.indexOf(startStr);

if (targetStart > -1) {
  let pre = code.substring(0, targetStart);
  let rest = code.substring(targetStart + '<div className="space-y-4">'.length);
  
  // We need to find where "Payment methods" starts
  const pmStart = rest.indexOf('{/* Payment methods */}');
  
  // We need to find where Actions end
  const actionsStr = '{/* Actions */}';
  const actionsStart = rest.indexOf(actionsStr);
  const nextDivEnd = rest.indexOf('</div>', actionsStart);
  // Wait, Actions is a div. We need to find the closing tag of Actions div.
  // Actions is:
  // <div className="grid grid-cols-3 gap-2 pt-1"> ... </div>
  // Let's just find the closing tag of the main space-y-4 wrapper.
  // The main wrapper ends before </DialogContent>
  const dialogContentEnd = rest.indexOf('</DialogContent>');
  const mainWrapperEnd = rest.lastIndexOf('</div>', dialogContentEnd);
  
  let leftContent = rest.substring(0, pmStart);
  let rightContent = rest.substring(pmStart, mainWrapperEnd);
  
  let newStructure = `
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kolom Kiri */}
          <div className="space-y-4 flex flex-col">
            ${leftContent}
          </div>
          
          {/* Kolom Kanan */}
          <div className="space-y-4 flex flex-col justify-between">
            ${rightContent}
          </div>
        </div>
`;
  code = pre + newStructure + rest.substring(mainWrapperEnd + 6);
  fs.writeFileSync('src/pages/POSPage.jsx', code);
  console.log("Layout patched!");
}
