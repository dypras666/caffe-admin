# Sidebar Feature Toggle Documentation

## Overview
Sidebar menu sekarang dinamis dan hanya menampilkan fitur yang dienable melalui system settings. Ini memberikan kontrol penuh kepada admin untuk mengaktifkan/menonaktifkan modul sesuai kebutuhan bisnis.

## Feature Toggles

### 1. **HR & KPI Module** (`hr_enabled`)
- **Endpoint**: `/api/hr/settings`
- **Setting Key**: `hr_enabled` (boolean)
- **Menu Items**:
  - Karyawan & Absensi (`/hr`)
  - KPI Dashboard (`/hr/kpi`)
- **Visibility**: Only visible when `hr_enabled = 'true'`

### 2. **Reservasi & Meja Module** (`enable_booking`)
- **Endpoint**: `/api/settings`
- **Setting Key**: `enable_booking` (boolean)
- **Menu Items**:
  - Booking (`/bookings`)
  - Room (`/rooms`)
  - Meja (`/tables`)
- **Visibility**: Only visible when `enable_booking ≠ 'false'`
- **Default**: Enabled (true)

### 3. **Inventori & Stok Module** (`inventory_enabled`)
- **Endpoint**: `/api/settings`
- **Setting Key**: `inventory_enabled` (boolean)
- **Menu Items**:
  - Stok (`/stock`)
  - Satuan (`/units`)
  - Bahan Baku (`/ingredients`)
  - Resep & HPP (`/recipes`)
- **Visibility**: Only visible when `inventory_enabled ≠ 'false'`
- **Default**: Enabled (true)

### 4. **WiFi Settings Module** (`wifi_enabled`)
- **Endpoint**: `/api/settings`
- **Setting Key**: `wifi_enabled` (boolean)
- **Menu Items** (under Advanced):
  - Pengaturan WiFi (`/wifi-settings`)
  - RouterOS Monitor (`/routeros`)
- **Visibility**: Only visible when `wifi_enabled ≠ 'false'`
- **Default**: Enabled (true)

## Menu Reorganization

### Before:
```
Kasir & Order
  ├── POS Kasir
  ├── Waiter Order
  ├── Table Order
  ├── Pesanan
  └── Shift  ❌ (was here)

Admin & Sistem
  ├── Members
  ├── Users
  ├── Audit Trail
  ├── Settings
  ├── Pengaturan WiFi  ❌ (was here)
  └── RouterOS Monitor ❌ (was here)
```

### After:
```
Kasir & Order
  ├── POS Kasir
  ├── Waiter Order
  ├── Table Order
  └── Pesanan

Advanced ✨ (NEW)
  ├── Shift & Jadwal ✅ (moved here)
  ├── Pengaturan WiFi ✅ (moved here, conditional)
  └── RouterOS Monitor ✅ (moved here, conditional)

SDM & KPI ✨ (conditional - only if hr_enabled)
  ├── Karyawan & Absensi
  └── KPI

Admin & Sistem
  ├── Manajemen Member
  ├── Pengguna
  ├── Audit Trail
  └── Pengaturan
```

## How to Enable/Disable Features

### 1. Enable/Disable HR Module
```bash
# Enable HR
curl -X PUT http://localhost:3002/api/hr/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hr_enabled":"true"}'

# Disable HR
curl -X PUT http://localhost:3002/api/hr/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hr_enabled":"false"}'
```

### 2. Enable/Disable Booking Module
```bash
# Via Settings API (need to implement in backend)
curl -X PUT http://localhost:3002/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enable_booking":"false"}'
```

### 3. Enable/Disable Inventory Module
```bash
curl -X PUT http://localhost:3002/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inventory_enabled":"false"}'
```

### 4. Enable/Disable WiFi Module
```bash
curl -X PUT http://localhost:3002/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wifi_enabled":"false"}'
```

## Implementation Details

### Frontend (Sidebar.jsx)

1. **Settings State Management**:
```javascript
const [settings, setSettings] = useState({
  hrEnabled: false,
  bookingEnabled: true,
  inventoryEnabled: true,
  wifiEnabled: true,
});
```

2. **Load Settings on Mount**:
```javascript
useEffect(() => {
  const loadSettings = async () => {
    // Get HR settings
    const hrRes = await api.get('/hr/settings');
    // Get general settings
    const settingsRes = await api.get('/settings');
    // Merge and update state
    setSettings({ ... });
  };
  loadSettings();
}, []);
```

3. **Conditional Menu Rendering**:
```javascript
...(hrEnabled ? [{
  key: 'sdm',
  label: 'SDM & KPI',
  items: [...]
}] : []),
```

### Backend Requirements

The backend needs to support these settings:
- ✅ `hr_enabled` - Already implemented in `/api/hr/settings`
- ⚠️ `enable_booking` - Already in DB, needs PUT endpoint
- ⚠️ `inventory_enabled` - Need to add to DB and API
- ⚠️ `wifi_enabled` - Need to add to DB and API

## Testing

### Unit Tests
```bash
# Test HR module toggle
npm test -- hr.test.js

# Test KPI module
npm test -- kpi.test.js
```

### Manual Testing
1. Open admin panel: http://localhost:5174
2. Login as admin
3. Go to Settings → Features
4. Toggle HR module on/off
5. Refresh page
6. Verify "SDM & KPI" menu appears/disappears

## Benefits

1. **Cleaner UI**: Users only see features they need
2. **Better UX**: Reduced cognitive load
3. **Scalable**: Easy to add new feature toggles
4. **Professional**: Industry-standard approach
5. **Flexible**: Each client can customize their setup

## Future Improvements

1. Add UI toggle switches in Settings page
2. Add feature descriptions and preview
3. Add role-based feature access
4. Add feature usage analytics
5. Add feature onboarding tours
