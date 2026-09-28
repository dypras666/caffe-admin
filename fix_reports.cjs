const fs = require('fs');
let content = fs.readFileSync('src/pages/ReportsPage.jsx', 'utf8');

// 1. Update BranchCashierFilter signature and internals
content = content.replace(
  /function BranchCashierFilter\(\{ branchId, cashierId, onBranch, onCashier, showCashier = true \}\) \{/g,
  `function BranchCashierFilter({ cashierId, onCashier, showCashier = true }) {
  const { branchId } = useGlobalBranch();`
);

// 2. Remove branch fetch from BranchCashierFilter
content = content.replace(
  /const \{ data: branchData \} = useFetch\(isAdmin \? '\/branches' : null\);\n\s*const branches = branchData\?.branches || \[\];\n/g,
  ''
);

// 3. Remove branch Select from BranchCashierFilter UI
content = content.replace(
  /<Select value=\{branchId\} onValueChange=\{\(v\) => \{ onBranch\(v\); if \(showCashier\) onCashier\('all'\); \}\}>\n\s*<SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Semua Cabang" \/><\/SelectTrigger>\n\s*<SelectContent>\n\s*<SelectItem value="all">Semua Cabang<\/SelectItem>\n\s*\{branches.map\(\(b\) => <SelectItem key=\{b.id\} value=\{String\(b.id\)\}>\{b.name\}<\/SelectItem>\)\}\n\s*<\/SelectContent>\n\s*<\/Select>/g,
  ''
);
content = content.replace(
  /<Select value=\{branchId\} onValueChange=\{onBranch\}>\n\s*<SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Semua Cabang" \/><\/SelectTrigger>\n\s*<SelectContent>\n\s*<SelectItem value="all">Semua Cabang<\/SelectItem>\n\s*\{branches.map\(\(b\) => <SelectItem key=\{b.id\} value=\{String\(b.id\)\}>\{b.name\}<\/SelectItem>\)\}\n\s*<\/SelectContent>\n\s*<\/Select>/g,
  ''
);

// 4. In all components, replace const [branchId, setBranchId] = useState('all'); with const { branchId } = useGlobalBranch();
content = content.replace(
  /const \[branchId, setBranchId\] = useState\('all'\);/g,
  `const { branchId } = useGlobalBranch();`
);

// 5. Update BranchCashierFilter usages to remove branchId, onBranch
content = content.replace(
  /<BranchCashierFilter branchId=\{branchId\} cashierId=\{cashierId\} onBranch=\{setBranchId\} onCashier=\{setCashierId\} \/>/g,
  `<BranchCashierFilter cashierId={cashierId} onCashier={setCashierId} />`
);
content = content.replace(
  /<BranchCashierFilter branchId=\{branchId\} cashierId=\{cashierId\} onBranch=\{\(v\) => \{ setBranchId\(v\); setCashierId\('all'\); \}\} onCashier=\{setCashierId\} \/>/g,
  `<BranchCashierFilter cashierId={cashierId} onCashier={setCashierId} />`
);
content = content.replace(
  /<BranchCashierFilter branchId=\{branchId\} cashierId=\{cashierId\} onBranch=\{\(v\) => \{ setBranchId\(v\); setCashierId\('all'\); \}\} onCashier=\{setCashierId\} showCashier=\{true\} \/>/g,
  `<BranchCashierFilter cashierId={cashierId} onCashier={setCashierId} showCashier={true} />`
);
content = content.replace(
  /<BranchCashierFilter branchId=\{branchId\} cashierId="all" onBranch=\{setBranchId\} onCashier=\{\(\) => \{ \}\} showCashier=\{false\} \/>/g,
  `<BranchCashierFilter cashierId="all" onCashier={() => { }} showCashier={false} />`
);
content = content.replace(
  /branchId=\{branchId\}\n\s*cashierId=\{cashierId\}/g,
  `cashierId={cashierId}`
);
content = content.replace(
  /function PaymentTransactionsDialog\(\{ method, from, to, branchId, cashierId, onClose \}\) \{/g,
  `function PaymentTransactionsDialog({ method, from, to, cashierId, onClose }) {\n  const { branchId } = useGlobalBranch();`
);

fs.writeFileSync('src/pages/ReportsPage.jsx', content);
