const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');
code = code.replace(
  "function RequireAdmin({ children }) {\n  const { user, loading } = useAuth();\n  if (loading) return null; // wait for auth check\n  if (!user) return <Navigate to=\"/login\" replace />;\n  if (user.role !== 'admin') return <Navigate to=\"/\" replace />;\n  return children;\n}",
  "function RequireAdmin({ children }) {\n  const { user, loading } = useAuth();\n  if (loading) return null;\n  if (!user) return <Navigate to=\"/login\" replace />;\n  if (user.role !== 'admin') return <Navigate to=\"/\" replace />;\n  return children;\n}\n\nfunction RequireRole({ children, roles }) {\n  const { user, loading } = useAuth();\n  if (loading) return null;\n  if (!user) return <Navigate to=\"/login\" replace />;\n  if (user.role === 'admin') return children;\n  if (!roles.includes(user.role)) return <Navigate to=\"/\" replace />;\n  return children;\n}"
);

code = code.replace("<Route path=\"products\" element={<RequireAdmin><ProductsPage /></RequireAdmin>} />", "<Route path=\"products\" element={<RequireRole roles={['station']}><ProductsPage /></RequireRole>} />");
code = code.replace("<Route path=\"categories\" element={<RequireAdmin><CategoriesPage /></RequireAdmin>} />", "<Route path=\"categories\" element={<RequireRole roles={['station']}><CategoriesPage /></RequireRole>} />");
code = code.replace("<Route path=\"variants\" element={<RequireAdmin><VariantsPage /></RequireAdmin>} />", "<Route path=\"variants\" element={<RequireRole roles={['station']}><VariantsPage /></RequireRole>} />");
code = code.replace("<Route path=\"stock\" element={<RequireAdmin><StockPage /></RequireAdmin>} />", "<Route path=\"stock\" element={<RequireRole roles={['station']}><StockPage /></RequireRole>} />");
code = code.replace("<Route path=\"units\" element={<RequireAdmin><UnitsPage /></RequireAdmin>} />", "<Route path=\"units\" element={<RequireRole roles={['station']}><UnitsPage /></RequireRole>} />");
code = code.replace("<Route path=\"ingredients\" element={<RequireAdmin><IngredientsPage /></RequireAdmin>} />", "<Route path=\"ingredients\" element={<RequireRole roles={['station']}><IngredientsPage /></RequireRole>} />");
code = code.replace("<Route path=\"recipes\" element={<RequireAdmin><RecipesPage /></RequireAdmin>} />", "<Route path=\"recipes\" element={<RequireRole roles={['station']}><RecipesPage /></RequireRole>} />");

fs.writeFileSync('src/App.jsx', code);
